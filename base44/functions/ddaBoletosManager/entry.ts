import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import * as XLSX from 'npm:xlsx@0.18.5';

const HIGH_CONFIDENCE = 85;

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cleanText(value) {
  return String(value || '').trim();
}

function parseMoney(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  let text = String(value).replace(/r\$/i, '').replace(/\s/g, '').trim();
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const br = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function barcodeFromLinhaDigitavel(line) {
  const digits = onlyDigits(line);
  if (digits.length !== 47) return digits;
  return digits.slice(0, 4) + digits.slice(32, 47) + digits.slice(4, 9) + digits.slice(10, 20) + digits.slice(21, 31);
}

function normalizedNumber(value) {
  return onlyDigits(value).replace(/^0+/, '') || onlyDigits(value);
}

function rowValue(rows, start, label) {
  const target = label.toLowerCase();
  for (let i = start; i < Math.min(rows.length, start + 20); i++) {
    const key = cleanText(rows[i]?.[0]).toLowerCase();
    if (key === target) return rows[i]?.[1];
  }
  return '';
}

function parseDdaRows(rows, sourceFileName) {
  const boletos = [];
  for (let i = 0; i < rows.length; i++) {
    const colA = cleanText(rows[i]?.[0]);
    const colB = cleanText(rows[i]?.[1]);
    if (colB.toLowerCase() !== 'dados do título') continue;

    const beneficiaryCnpjDisplay = cleanText(rowValue(rows, i + 1, 'CPF/CNPJ Beneficiário'));
    const payerCnpjDisplay = cleanText(rowValue(rows, i + 1, 'CPF/CNPJ Pagador'));
    const line = cleanText(rowValue(rows, i + 1, 'Linha digitável'));
    const dueDate = parseDate(rowValue(rows, i + 1, 'Data vencimento'));

    if (!line || !dueDate) continue;

    boletos.push({
      line_digitavel: line,
      barcode: barcodeFromLinhaDigitavel(line),
      document_number: cleanText(rowValue(rows, i + 1, 'Número documento')),
      nosso_numero: cleanText(rowValue(rows, i + 1, 'Nosso número')),
      bank_name: cleanText(rowValue(rows, i + 1, 'Instituição financeira')),
      due_date: dueDate,
      beneficiary_name: cleanText(rowValue(rows, i + 1, 'Nome/razão social do beneficiário')),
      beneficiary_cnpj: onlyDigits(beneficiaryCnpjDisplay),
      beneficiary_cnpj_display: beneficiaryCnpjDisplay,
      payer_name: cleanText(rowValue(rows, i + 1, 'Nome/razão social do pagador')),
      payer_cnpj: onlyDigits(payerCnpjDisplay),
      payer_cnpj_display: payerCnpjDisplay,
      document_value: parseMoney(rowValue(rows, i + 1, 'Valor do documento')),
      discount_value: parseMoney(rowValue(rows, i + 1, '(-) Desconto/abatimento')),
      addition_value: parseMoney(rowValue(rows, i + 1, '(+) Outros acréscimos')),
      charged_value: parseMoney(rowValue(rows, i + 1, '(=) Valor cobrado')),
      source_file_name: sourceFileName || '',
      imported_at: new Date().toISOString(),
    });
  }
  return boletos;
}

async function readSpreadsheet(fileUrl, sourceFileName) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error('Não foi possível ler o arquivo DDA enviado.');
  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  return parseDdaRows(rows, sourceFileName);
}

function invoiceLabel(invoice) {
  const type = invoice.document_type || 'nfe';
  const prefix = type === 'nfse' ? 'NFS-e' : type === 'cte' ? 'CT-e' : 'NF-e';
  return `${prefix} ${invoice.series ? invoice.series + '/' : ''}${invoice.number || ''}`;
}

function scoreInvoice(boleto, invoice) {
  let score = 0;
  const reasons = [];
  const invoiceSupplier = onlyDigits(invoice.supplier_cnpj);
  const invoiceBranch = onlyDigits(invoice.branch_cnpj || invoice.recipient_cnpj);
  const boletoDoc = normalizedNumber(boleto.document_number);
  const invoiceNumber = normalizedNumber(invoice.number);
  const valueDiff = Math.abs((invoice.total_value || 0) - (boleto.charged_value || 0));

  if (invoiceSupplier && invoiceSupplier === boleto.beneficiary_cnpj) { score += 35; reasons.push('fornecedor'); }
  if (invoiceBranch && invoiceBranch === boleto.payer_cnpj) { score += 25; reasons.push('filial pagadora'); }
  if (valueDiff <= 0.01) { score += 25; reasons.push('valor'); }
  if (invoice.due_date && invoice.due_date === boleto.due_date) { score += 20; reasons.push('vencimento'); }
  if (boletoDoc && invoiceNumber && boletoDoc === invoiceNumber) { score += 20; reasons.push('número do documento'); }

  const installments = Array.isArray(invoice.installments) ? invoice.installments : [];
  const installmentMatch = installments.some((item) => {
    const sameDate = item.due_date === boleto.due_date;
    const sameValue = Math.abs((item.value || 0) - (boleto.charged_value || 0)) <= 0.01;
    return sameDate && sameValue;
  });
  if (installmentMatch) { score += 25; reasons.push('parcela'); }

  if (invoice.cancelled || invoice.archived) score -= 30;
  return { invoice, score, reasons };
}

async function findBestMatch(base44, boleto) {
  let candidates = await base44.asServiceRole.entities.Invoice.filter({
    supplier_cnpj: boleto.beneficiary_cnpj,
    branch_cnpj: boleto.payer_cnpj,
  });
  if (candidates.length === 0) {
    candidates = await base44.asServiceRole.entities.Invoice.filter({ supplier_cnpj: boleto.beneficiary_cnpj });
  }

  const ranked = candidates
    .map((invoice) => scoreInvoice(boleto, invoice))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return { status: 'pendente', match_confidence: 0, match_reason: 'Nenhuma nota com fornecedor compatível foi encontrada.' };
  const best = ranked[0];
  const second = ranked[1];
  const uniqueEnough = !second || best.score - second.score >= 10;
  if (best.score >= HIGH_CONFIDENCE && uniqueEnough) {
    return {
      status: 'vinculado',
      invoice: best.invoice,
      match_confidence: best.score,
      match_reason: `Vínculo automático por ${best.reasons.join(', ')}.`,
    };
  }
  return {
    status: 'pendente',
    match_confidence: best.score,
    match_reason: `Possível vínculo com ${invoiceLabel(best.invoice)}, mas precisa conferência (${best.reasons.join(', ')}).`,
  };
}

async function markInvoiceBoleto(base44, invoiceId, user) {
  const actorName = user.full_name || user.email || 'Usuário';
  const ddaActorName = `${actorName} (via DDA)`;
  await base44.asServiceRole.entities.Invoice.update(invoiceId, {
    boleto_recorded: true,
    boleto_recorded_by_id: user.id,
    boleto_recorded_by_name: ddaActorName,
    boleto_recorded_at: new Date().toISOString(),
    boleto_updated_by_id: user.id,
    boleto_updated_by_name: ddaActorName,
    boleto_updated_at: new Date().toISOString(),
  });
}

async function saveBoleto(base44, boleto, match, user, dryRun) {
  const linkedInvoices = match.invoice ? [{
    invoice_id: match.invoice.id,
    invoice_type: match.invoice.document_type || 'nfe',
    invoice_number: match.invoice.number || '',
    supplier_name: match.invoice.supplier_name || '',
    total_value: match.invoice.total_value || 0,
  }] : [];
  const payload = {
    ...boleto,
    status: match.status,
    invoice_id: match.invoice?.id || null,
    invoice_type: match.invoice?.document_type || null,
    invoice_number: match.invoice?.number || null,
    linked_invoices: linkedInvoices,
    match_confidence: match.match_confidence || 0,
    match_reason: match.match_reason || '',
    linked_at: match.invoice ? new Date().toISOString() : null,
    linked_by_id: match.invoice ? user.id : null,
    linked_by_name: match.invoice ? (user.full_name || user.email || 'Usuário') : null,
  };
  if (dryRun) return { ...payload, dry_run: true };

  const existing = await base44.asServiceRole.entities.BoletoDDA.filter({ line_digitavel: boleto.line_digitavel });
  let saved;
  if (existing.length > 0) saved = await base44.asServiceRole.entities.BoletoDDA.update(existing[0].id, payload);
  else saved = await base44.asServiceRole.entities.BoletoDDA.create(payload);
  if (match.invoice) await markInvoiceBoleto(base44, match.invoice.id, user);
  return saved;
}

async function importFile(base44, payload, user) {
  const boletos = await readSpreadsheet(payload.file_url, payload.file_name);
  const saved = [];
  let linked = 0;
  let pending = 0;
  for (const boleto of boletos) {
    const match = await findBestMatch(base44, boleto);
    if (match.status === 'vinculado') linked++; else pending++;
    saved.push(await saveBoleto(base44, boleto, match, user, payload.dryRun === true));
  }
  return { total: boletos.length, linked, pending, boletos: saved };
}

async function linkManual(base44, payload, user) {
  const boleto = await base44.asServiceRole.entities.BoletoDDA.get(payload.boleto_id);
  const invoiceIds = [...new Set(Array.isArray(payload.invoice_ids) ? payload.invoice_ids : [payload.invoice_id].filter(Boolean))];
  if (invoiceIds.length === 0) throw new Error('Selecione ao menos uma nota fiscal para vincular.');

  const invoices = [];
  for (const invoiceId of invoiceIds) invoices.push(await base44.asServiceRole.entities.Invoice.get(invoiceId));
  for (const invoice of invoices) await markInvoiceBoleto(base44, invoice.id, user);

  const linkedInvoices = invoices.map((invoice) => ({
    invoice_id: invoice.id,
    invoice_type: invoice.document_type || 'nfe',
    invoice_number: invoice.number || '',
    supplier_name: invoice.supplier_name || '',
    total_value: invoice.total_value || 0,
  }));
  const totalInvoices = invoices.reduce((sum, invoice) => sum + (invoice.total_value || 0), 0);
  const difference = Math.abs(totalInvoices - (boleto.charged_value || 0));
  const updated = await base44.asServiceRole.entities.BoletoDDA.update(boleto.id, {
    status: 'vinculado',
    invoice_id: invoices[0].id,
    invoice_type: invoices[0].document_type || 'nfe',
    invoice_number: linkedInvoices.map((item) => item.invoice_number).join(', '),
    linked_invoices: linkedInvoices,
    match_confidence: invoiceIds.length === 1 ? 100 : 95,
    match_reason: invoiceIds.length === 1
      ? 'Vinculado manualmente pelo usuário.'
      : `Vinculado manualmente a ${invoiceIds.length} NFs. Diferença entre boleto e soma das NFs: R$ ${difference.toFixed(2).replace('.', ',')}.`,
    linked_at: new Date().toISOString(),
    linked_by_id: user.id,
    linked_by_name: user.full_name || user.email || 'Usuário',
  });
  return { boleto: updated };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    if (payload.action === 'import') return Response.json(await importFile(base44, payload, user));
    if (payload.action === 'linkManual') return Response.json(await linkManual(base44, payload, user));
    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});