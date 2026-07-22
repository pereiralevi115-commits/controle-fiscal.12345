import { barcodeBars, formatCnpjCpf, formatCurrency, formatDate } from "@/lib/boletoUtils";

const safe = (value) => String(value || "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function barcodeSvg(code) {
  const encoded = barcodeBars(code);
  if (!encoded?.bars?.length) return "";
  const rects = encoded.bars.map((bar) => `<rect x="${bar.x}" y="0" width="${bar.width}" height="58" fill="#111827"/>`).join("");
  return `<svg viewBox="0 0 ${encoded.width} 58" preserveAspectRatio="none" style="width:100%;height:70px;display:block">${rects}</svg>`;
}

function auditBadge(label, value, name, date) {
  const detail = value && (name || date) ? `<small>${safe(name || "registro antigo")}${date ? ` · ${safe(formatDate(date))}` : ""}</small>` : "";
  return `<span class="badge ${value ? "badge-yes" : "badge-no"}"><b>${label}: ${value ? "Sim" : "Não"}</b>${detail}</span>`;
}

export function printDdaBoleto(boleto, invoice) {
  const title = `${boleto.document_number || "Boleto DDA"}`;
  const invoiceText = invoice
    ? `${invoice.document_type === "nfse" ? "NFS-e" : invoice.document_type === "cte" ? "CT-e" : "NF-e"} ${invoice.series ? `${invoice.series}/` : ""}${invoice.number || ""}`
    : "Pendente de vínculo";
  const bankCode = String(boleto.barcode || boleto.line_digitavel || "").replace(/\D/g, "").slice(0, 3) || "000";
  const documentValue = boleto.charged_value ?? boleto.document_value;
  const sigvBadge = invoice ? auditBadge("SIGV", invoice.sigv_recorded, invoice.sigv_recorded_by_name || invoice.sigv_updated_by_name, invoice.sigv_recorded_at || invoice.sigv_updated_at) : "";
  const topconBadge = invoice ? auditBadge("TOPCON", invoice.topcon_recorded, invoice.topcon_recorded_by_name || invoice.topcon_updated_by_name, invoice.topcon_recorded_at || invoice.topcon_updated_at) : "";
  const html = `<!doctype html><html><head><title>${safe(title)}</title><style>
    @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:18px;background:#f8fafc}.page{max-width:980px;margin:0 auto}.actions{display:flex;justify-content:flex-end;margin-bottom:10px}.print-btn{padding:9px 18px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer;font-weight:700;box-shadow:0 2px 8px rgba(15,23,42,.08)}.boleto-card{background:#fff;border:1.5px solid #111827;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.12);max-height:520px}.topbar{display:grid;grid-template-columns:200px 70px 1fr;align-items:center;border-bottom:1.5px solid #111827;background:linear-gradient(90deg,#fff7d6,#fff 38%)}.bank{padding:14px 16px;font-size:22px;font-weight:900;line-height:1.1}.bank small{display:block;font-size:11px;text-transform:uppercase;color:#64748b;margin-top:3px}.code{height:100%;display:flex;align-items:center;justify-content:center;border-left:1.5px solid #111827;border-right:1.5px solid #111827;font-size:22px;font-weight:900}.line{padding:14px 16px;text-align:right;font-family:'Courier New',monospace;font-size:17px;font-weight:900;letter-spacing:.35px}.hero{display:grid;grid-template-columns:1.4fr .9fr .9fr;gap:12px;padding:14px 16px;border-bottom:1px solid #cbd5e1}.label{font-size:9px;text-transform:uppercase;color:#64748b;font-weight:800;letter-spacing:.05em}.value{font-size:13px;font-weight:800;margin-top:4px;line-height:1.25}.muted{color:#64748b;font-weight:600}.amount{font-size:28px;font-weight:900;color:#111827;text-align:right}.pill{display:inline-flex;align-items:center;border-radius:999px;background:#111827;color:white;padding:5px 10px;font-size:11px;font-weight:800;margin-bottom:6px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border-bottom:1px solid #cbd5e1}.cell{padding:9px 12px;border-right:1px solid #cbd5e1;min-height:52px}.cell:last-child{border-right:0}.nf{padding:12px 16px;background:#f8fafc;border-bottom:1px solid #cbd5e1}.nf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:8px}.nf-title{font-size:15px;font-weight:900}.nf-grid{display:grid;grid-template-columns:1.5fr .8fr .8fr .8fr;gap:10px}.badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.badge{display:inline-flex;flex-direction:column;border-radius:10px;padding:5px 9px;font-size:11px;font-weight:700}.badge small{font-size:10px;font-weight:500;margin-top:1px}.badge-yes{background:#dcfce7;color:#15803d}.badge-no{background:#f1f5f9;color:#475569}.bottom{display:grid;grid-template-columns:1fr 210px;gap:16px;padding:12px 16px 14px;align-items:end}.payee{font-size:12px;line-height:1.35}.auth{text-align:right;font-size:9px;color:#64748b;font-weight:800;text-transform:uppercase}.caption{font-size:11px;color:#64748b;margin:8px 4px 0}@media print{body{margin:0;background:#fff}.actions{display:none}.page{max-width:none}.boleto-card{box-shadow:none;max-height:132mm}.caption{display:none}}
  </style></head><body><div class="page">
    <div class="actions"><button class="print-btn" onclick="window.print()">Imprimir</button></div>
    <section class="boleto-card">
      <div class="topbar">
        <div class="bank">${safe(boleto.bank_name || "Banco")}<small>Boleto DDA</small></div>
        <div class="code">${safe(bankCode)}</div>
        <div class="line">${safe(boleto.line_digitavel)}</div>
      </div>
      <div class="hero">
        <div><div class="label">Beneficiário</div><div class="value">${safe(boleto.beneficiary_name)}</div><div class="muted">${safe(formatCnpjCpf(boleto.beneficiary_cnpj))}</div></div>
        <div><div class="label">Vencimento</div><div class="value">${safe(formatDate(boleto.due_date))}</div></div>
        <div><span class="pill">Valor cobrado</span><div class="amount">${safe(formatCurrency(documentValue))}</div></div>
      </div>
      <div class="grid">
        <div class="cell"><div class="label">Pagador</div><div class="value">${safe(boleto.payer_name)}</div><div class="muted">${safe(formatCnpjCpf(boleto.payer_cnpj))}</div></div>
        <div class="cell"><div class="label">Nosso número</div><div class="value">${safe(boleto.nosso_numero || boleto.document_number)}</div></div>
        <div class="cell"><div class="label">Nº documento</div><div class="value">${safe(boleto.document_number)}</div></div>
        <div class="cell"><div class="label">Banco / espécie</div><div class="value">${safe(bankCode)} · DDA</div></div>
      </div>
      <div class="nf">
        <div class="nf-head"><div><div class="label">Nota fiscal vinculada</div><div class="nf-title">${safe(invoiceText)}</div></div><div class="value">Valor NF: ${safe(formatCurrency(invoice?.total_value))}</div></div>
        ${invoice ? `<div class="nf-grid"><div><div class="label">Fornecedor da NF</div><div class="value">${safe(invoice.supplier_name)}</div><div class="muted">${safe(formatCnpjCpf(invoice.supplier_cnpj))}</div></div><div><div class="label">Emissão</div><div class="value">${safe(formatDate(invoice.issue_date))}</div></div><div><div class="label">Vencimento NF</div><div class="value">${safe(formatDate(invoice.due_date))}</div></div><div><div class="label">Filial / destinatário</div><div class="value">${safe(invoice.recipient_name || invoice.branch_cnpj || "—")}</div></div></div><div class="badges">${sigvBadge}${topconBadge}</div>` : `<div class="muted">Este boleto ainda não possui nota fiscal vinculada.</div>`}
      </div>
      <div class="bottom">
        <div>${barcodeSvg(boleto.barcode)}</div>
        <div><div class="payee"><b>Pagador:</b><br>${safe(boleto.payer_name)}<br>${safe(formatCnpjCpf(boleto.payer_cnpj))}</div><div class="auth">Ficha de compensação<br>Autenticação mecânica</div></div>
      </div>
    </section>
    <div class="caption">Representação compacta para conferência e impressão interna.</div>
  </div></body></html>`;
  const win = window.open("", "_blank", "width=980,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}