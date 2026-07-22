import { barcodeBars, formatCnpjCpf, formatCurrency, formatDate } from "@/lib/boletoUtils";

const safe = (value) => String(value || "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function barcodeSvg(code) {
  const encoded = barcodeBars(code);
  if (!encoded?.bars?.length) return "";
  const rects = encoded.bars.map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="72" fill="#111827"/>`).join("");
  return `<svg viewBox="0 0 ${encoded.width} 72" preserveAspectRatio="none" style="width:100%;height:92px;display:block">${rects}</svg>`;
}

export function printDdaBoleto(boleto, invoice) {
  const title = `${boleto.document_number || "Boleto DDA"}`;
  const invoiceText = invoice
    ? `${invoice.document_type === "nfse" ? "NFS-e" : invoice.document_type === "cte" ? "CT-e" : "NF-e"} ${invoice.series ? `${invoice.series}/` : ""}${invoice.number || ""}`
    : "Pendente de vínculo";
  const bankCode = String(boleto.barcode || boleto.line_digitavel || "").replace(/\D/g, "").slice(0, 3) || "000";
  const documentValue = boleto.charged_value ?? boleto.document_value;
  const html = `<!doctype html><html><head><title>${safe(title)}</title><style>
    *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;background:#fff}.page{max-width:980px;margin:0 auto}.actions{display:flex;justify-content:flex-end;margin-bottom:14px}.print-btn{padding:9px 18px;border:1px solid #94a3b8;border-radius:8px;background:white;cursor:pointer;font-weight:600}.note{font-size:12px;color:#475569;margin:8px 0 18px}.slip{border:2px solid #111827;margin-bottom:22px}.bank-row{display:grid;grid-template-columns:180px 70px 1fr;align-items:center;border-bottom:2px solid #111827;min-height:48px}.bank-name{font-size:22px;font-weight:800;padding:10px 12px}.bank-code{height:100%;display:flex;align-items:center;justify-content:center;border-left:2px solid #111827;border-right:2px solid #111827;font-size:20px;font-weight:800}.digitable{padding:10px 12px;text-align:right;font-family:'Courier New',monospace;font-size:17px;font-weight:800;letter-spacing:.2px}.field-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr}.field-grid.comp{grid-template-columns:2fr 1fr}.field{min-height:54px;border-right:1px solid #111827;border-bottom:1px solid #111827;padding:5px 7px}.field:last-child{border-right:0}.field.tall{min-height:118px}.label{font-size:9px;text-transform:uppercase;color:#334155;font-weight:700;line-height:1.15}.value{font-size:13px;font-weight:700;margin-top:5px;line-height:1.25}.small{font-size:12px;font-weight:500}.money{font-size:18px;font-weight:800;text-align:right}.instructions{display:grid;grid-template-columns:1fr 260px}.right-col{border-left:1px solid #111827}.right-col .field{border-right:0}.payer{padding:8px;border-bottom:1px solid #111827;min-height:78px}.barcode-wrap{display:grid;grid-template-columns:1fr 230px;align-items:end;gap:20px;padding:16px 14px 14px}.cut{border-top:1px dashed #64748b;margin:20px 0 10px;position:relative}.cut span{position:absolute;right:0;top:-18px;font-size:11px;color:#64748b}.badge{display:inline-block;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;background:#dcfce7;color:#15803d;margin-right:6px}.muted{color:#475569;font-weight:500}.receipt-title{font-size:12px;font-weight:800;text-align:right;padding:6px 8px;border-bottom:1px solid #111827;background:#f8fafc}@media print{body{margin:10px}.actions{display:none}.page{max-width:none}.slip{break-inside:avoid}.note{display:none}}
  </style></head><body><div class="page">
    <div class="actions"><button class="print-btn" onclick="window.print()">Imprimir</button></div>
    <h1>Boleto DDA</h1>
    <p class="note">Representação para conferência e impressão interna, com estrutura visual de boleto bancário.</p>

    <section class="slip">
      <div class="receipt-title">Recibo do Pagador</div>
      <div class="bank-row"><div class="bank-name">${safe(boleto.bank_name || "Banco")}</div><div class="bank-code">${safe(bankCode)}</div><div class="digitable">${safe(boleto.line_digitavel)}</div></div>
      <div class="field-grid comp"><div class="field"><div class="label">Beneficiário</div><div class="value">${safe(boleto.beneficiary_name)} <span class="muted">· ${safe(formatCnpjCpf(boleto.beneficiary_cnpj))}</span></div></div><div class="field"><div class="label">Vencimento</div><div class="value">${safe(formatDate(boleto.due_date))}</div></div></div>
      <div class="field-grid"><div class="field"><div class="label">Pagador</div><div class="value">${safe(boleto.payer_name)} <span class="muted">· ${safe(formatCnpjCpf(boleto.payer_cnpj))}</span></div></div><div class="field"><div class="label">Nosso número</div><div class="value">${safe(boleto.nosso_numero || boleto.document_number)}</div></div><div class="field"><div class="label">Nº do documento</div><div class="value">${safe(boleto.document_number)}</div></div><div class="field"><div class="label">Valor do documento</div><div class="value money">${safe(formatCurrency(documentValue))}</div></div></div>
      <div class="field"><div class="label">Nota vinculada</div><div class="value">${safe(invoiceText)}</div>${invoice ? `<div class="small">Fornecedor: ${safe(invoice.supplier_name)} · Emissão: ${safe(formatDate(invoice.issue_date))} · Vencimento NF: ${safe(formatDate(invoice.due_date))} · Valor NF: ${safe(formatCurrency(invoice.total_value))}</div><div style="margin-top:8px"><span class="badge">SIGV: ${invoice.sigv_recorded ? "Sim" : "Não"}</span><span class="badge">TOPCON: ${invoice.topcon_recorded ? "Sim" : "Não"}</span></div>` : ""}</div>
    </section>

    <div class="cut"><span>Corte na linha pontilhada</span></div>

    <section class="slip">
      <div class="bank-row"><div class="bank-name">${safe(boleto.bank_name || "Banco")}</div><div class="bank-code">${safe(bankCode)}</div><div class="digitable">${safe(boleto.line_digitavel)}</div></div>
      <div class="field-grid comp"><div class="field"><div class="label">Local de pagamento</div><div class="value small">Pagável preferencialmente no banco emissor ou canais autorizados.</div></div><div class="field"><div class="label">Vencimento</div><div class="value">${safe(formatDate(boleto.due_date))}</div></div></div>
      <div class="field-grid comp"><div class="field"><div class="label">Beneficiário</div><div class="value">${safe(boleto.beneficiary_name)} <span class="muted">· ${safe(formatCnpjCpf(boleto.beneficiary_cnpj))}</span></div></div><div class="field"><div class="label">Agência / Código do beneficiário</div><div class="value">—</div></div></div>
      <div class="field-grid"><div class="field"><div class="label">Data do documento</div><div class="value">${safe(formatDate(boleto.imported_at || boleto.due_date))}</div></div><div class="field"><div class="label">Nº do documento</div><div class="value">${safe(boleto.document_number)}</div></div><div class="field"><div class="label">Espécie doc.</div><div class="value">DDA</div></div><div class="field"><div class="label">Aceite</div><div class="value">N</div></div></div>
      <div class="instructions"><div class="field tall"><div class="label">Instruções</div><div class="value small">Boleto DDA importado no sistema Controle Fiscal. Conferir beneficiário, pagador, vencimento e valor antes do pagamento.${invoice ? `<br>Nota vinculada: ${safe(invoiceText)}.` : ""}</div></div><div class="right-col"><div class="field"><div class="label">Nosso número</div><div class="value">${safe(boleto.nosso_numero || boleto.document_number)}</div></div><div class="field"><div class="label">Valor do documento</div><div class="value money">${safe(formatCurrency(documentValue))}</div></div><div class="field"><div class="label">Descontos / abatimentos</div><div class="value money">${safe(formatCurrency(boleto.discount_value || 0))}</div></div><div class="field"><div class="label">Mora / multa / acréscimos</div><div class="value money">${safe(formatCurrency(boleto.addition_value || 0))}</div></div><div class="field"><div class="label">Valor cobrado</div><div class="value money">${safe(formatCurrency(boleto.charged_value))}</div></div></div></div>
      <div class="payer"><div class="label">Pagador</div><div class="value">${safe(boleto.payer_name)} <span class="muted">· ${safe(formatCnpjCpf(boleto.payer_cnpj))}</span></div></div>
      <div class="barcode-wrap"><div>${barcodeSvg(boleto.barcode)}</div><div class="label">Autenticação mecânica / Ficha de compensação</div></div>
    </section>
  </div></body></html>`;
  const win = window.open("", "_blank", "width=980,height=780");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}