import { barcodeBars, formatCnpjCpf, formatCurrency, formatDate } from "@/lib/boletoUtils";

const safe = (value) => String(value || "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function barcodeSvg(code) {
  const encoded = barcodeBars(code);
  if (!encoded?.bars?.length) return "";
  const rects = encoded.bars.map((bar) => `<rect x="${bar.x}" y="8" width="${bar.width}" height="54" fill="#111827"/>`).join("");
  return `<svg viewBox="0 0 ${encoded.width} 70" preserveAspectRatio="none" style="width:100%;height:82px;border:1px solid #e5e7eb">${rects}</svg>`;
}

export function printDdaBoleto(boleto, invoice) {
  const title = `${boleto.document_number || "Boleto DDA"}`;
  const invoiceText = invoice
    ? `${invoice.document_type === "nfse" ? "NFS-e" : invoice.document_type === "cte" ? "CT-e" : "NF-e"} ${invoice.series ? `${invoice.series}/` : ""}${invoice.number || ""}`
    : "Pendente de vínculo";
  const html = `<!doctype html><html><head><title>${safe(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#1f2937;margin:32px}.box{border:1px solid #d1d5db;border-radius:12px;padding:20px;margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.label{font-size:11px;text-transform:uppercase;color:#64748b;font-weight:700}.value{font-size:15px;font-weight:600;margin-top:3px}.big{font-size:22px}.line{font-family:monospace;font-size:13px;word-break:break-all}.badge{display:inline-block;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;background:#dcfce7;color:#15803d}@media print{button{display:none}body{margin:18px}}
  </style></head><body>
    <button onclick="window.print()" style="float:right;padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:white;cursor:pointer">Imprimir</button>
    <h1>Boleto DDA</h1>
    <div class="box"><div class="grid"><div><div class="label">Beneficiário</div><div class="value">${safe(boleto.beneficiary_name)}</div><div>${safe(formatCnpjCpf(boleto.beneficiary_cnpj))}</div></div><div><div class="label">Pagador</div><div class="value">${safe(boleto.payer_name)}</div><div>${safe(formatCnpjCpf(boleto.payer_cnpj))}</div></div><div><div class="label">Vencimento</div><div class="value">${safe(formatDate(boleto.due_date))}</div></div><div><div class="label">Valor cobrado</div><div class="value big">${safe(formatCurrency(boleto.charged_value))}</div></div></div></div>
    <div class="box"><div class="label">Linha digitável</div><div class="line">${safe(boleto.line_digitavel)}</div><div style="margin-top:14px">${barcodeSvg(boleto.barcode)}</div></div>
    <div class="box"><div class="label">Nota vinculada</div><div class="value">${safe(invoiceText)}</div>${invoice ? `<p>Fornecedor: ${safe(invoice.supplier_name)}</p><p>Emissão: ${safe(formatDate(invoice.issue_date))} · Vencimento NF: ${safe(formatDate(invoice.due_date))} · Valor NF: ${safe(formatCurrency(invoice.total_value))}</p><p><span class="badge">SIGV: ${invoice.sigv_recorded ? "Sim" : "Não"}</span> <span class="badge">TOPCON: ${invoice.topcon_recorded ? "Sim" : "Não"}</span></p>` : ""}</div>
  </body></html>`;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}