import { onlyDigits } from "@/lib/boletoUtils";

export const typeLabel = { nfe: "NF-e", nfse: "NFS-e", cte: "CT-e" };

const toDate = (value) => value ? new Date(`${value}T12:00:00`) : null;
const dayDiff = (a, b) => {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return null;
  return Math.abs(Math.round((da - db) / 86400000));
};

const sameDocumentNumber = (boletoNumber, invoiceNumber) => {
  const boletoDigits = onlyDigits(boletoNumber);
  const invoiceDigits = onlyDigits(invoiceNumber);
  if (!boletoDigits || !invoiceDigits) return false;
  return boletoDigits === invoiceDigits || boletoDigits.endsWith(invoiceDigits);
};

export function getDdaMatch(boleto, invoice) {
  const reasons = [];
  let score = 0;

  const sameSupplier = onlyDigits(invoice.supplier_cnpj) === onlyDigits(boleto.beneficiary_cnpj);
  const sameBranch = onlyDigits(invoice.branch_cnpj || invoice.recipient_cnpj) === onlyDigits(boleto.payer_cnpj);
  const valueDiff = Math.abs((invoice.total_value || 0) - (boleto.charged_value || 0));
  const valueTolerance = Math.max(1, (boleto.charged_value || 0) * 0.02);
  const exactValue = valueDiff <= 0.01;
  const closeValue = !exactValue && valueDiff <= valueTolerance;
  const dueDiff = dayDiff(invoice.due_date, boleto.due_date);
  const sameDueDate = dueDiff === 0;
  const closeDueDate = dueDiff !== null && dueDiff <= 7;
  const documentMatch = sameDocumentNumber(boleto.document_number, invoice.number);

  if (sameSupplier) { score += 35; reasons.push("mesmo fornecedor"); }
  if (sameBranch) { score += 18; reasons.push("mesma usina/pagador"); }
  if (exactValue) { score += 25; reasons.push("valor igual"); }
  else if (closeValue) { score += 14; reasons.push("valor próximo"); }
  if (sameDueDate) { score += 12; reasons.push("mesmo vencimento"); }
  else if (closeDueDate) { score += 7; reasons.push("vencimento próximo"); }
  if (documentMatch) { score += 15; reasons.push("número compatível"); }

  const confidence = score >= 70 ? "alta" : score >= 45 ? "media" : "baixa";
  return { score: Math.min(score, 100), confidence, reasons, sameSupplier, sameBranch, exactValue, closeValue, closeDueDate, documentMatch, valueDiff, dueDiff };
}

export function matchSearchText(invoice) {
  return `${invoice.number || ""} ${invoice.series || ""} ${invoice.supplier_name || ""} ${invoice.supplier_cnpj || ""} ${invoice.recipient_name || ""}`.toLowerCase();
}

export function passesQuickFilter(row, filter) {
  if (filter === "todos") return true;
  if (filter === "alta") return row.match.confidence === "alta";
  if (filter === "fornecedor") return row.match.sameSupplier;
  if (filter === "valor") return row.match.exactValue || row.match.closeValue;
  if (filter === "vencimento") return row.match.closeDueDate;
  return row.invoice.document_type === filter;
}

export const confidenceStyle = {
  alta: "bg-emerald-100 text-emerald-700 border-emerald-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  baixa: "bg-slate-100 text-slate-600 border-slate-200",
};