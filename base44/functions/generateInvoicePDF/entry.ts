import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatCNPJ = (cnpj) => {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cnpj;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR");
};

const v = (val) => val || "—";

async function buildPDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  // A4 portrait
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const BLACK  = rgb(0,0,0);
  const GRAY   = rgb(0.55,0.55,0.55);
  const LGRAY  = rgb(0.88,0.88,0.88);
  const AMBER  = rgb(0.992,0.722,0.075);
  const RED    = rgb(0.82,0.08,0.08);
  const WHITE  = rgb(1,1,1);

  const ML = 20, MR = 20;
  const W = width - ML - MR;

  // ── draw helpers ──────────────────────────────────────────────
  const box = (x, y, w, h, fill, strokeColor = rgb(0.7,0.7,0.7), strokeW = 0.5) => {
    if (fill) page.drawRectangle({ x, y: y - h, width: w, height: h, color: fill });
    page.drawRectangle({ x, y: y - h, width: w, height: h, borderColor: strokeColor, borderWidth: strokeW });
  };

  const t = (text, x, y, { size = 7, font = fR, color = BLACK, maxW } = {}) => {
    let s = String(text ?? "—");
    if (maxW && font.widthOfTextAtSize(s, size) > maxW) {
      while (s.length > 1 && font.widthOfTextAtSize(s + "…", size) > maxW) s = s.slice(0,-1);
      s += "…";
    }
    page.drawText(s, { x, y, size, font, color });
  };

  // small label above value
  const lbl = (text, x, y) => t(text, x+2, y-6, { size: 5.5, color: GRAY });
  const val = (text, x, y, opts = {}) => t(text, x+2, y - (opts.offset||18), { ...opts });

  // full labeled cell
  const cell = (x, y, w, h, label, value, opts = {}) => {
    box(x, y, w, h, opts.fill);
    lbl(label, x, y);
    val(value, x, y, { size: opts.valSize || 8, font: opts.bold ? fB : fR, color: opts.color || BLACK, maxW: w-4, offset: opts.offset || 18 });
  };

  // centered text in a box
  const center = (text, x, y, w, { size = 7, font = fR, color = BLACK } = {}) => {
    const tw = font.widthOfTextAtSize(text, size);
    t(text, x + (w - tw) / 2, y, { size, font, color });
  };

  // section header bar (gray bg, centered bold label)
  const sectionHeader = (label, x, y, w, h = 16, fill = LGRAY) => {
    box(x, y, w, h, fill);
    const tw = fB.widthOfTextAtSize(label, 7.5);
    t(label, x + (w - tw) / 2, y - 5, { size: 7.5, font: fB });
  };

  // horizontal divider line inside a box
  const hline = (x, y, w) => page.drawLine({ start:{x,y}, end:{x:x+w,y}, thickness:0.4, color:rgb(0.7,0.7,0.7) });

  // ── LAYOUT ───────────────────────────────────────────────────
  let cy = height - ML; // current top y (draws downward)

  // ── 1. TOP HEADER ──────────────────────────────────────────
  const hdrH = 90;
  box(ML, cy, W, hdrH, WHITE);

  // Left third: supplier info
  const c1w = W * 0.30;
  box(ML, cy, c1w, hdrH, WHITE);
  t(v(invoice.supplier_name), ML+4, cy-12, { size:8, font:fB, maxW: c1w-8 });
  const sAddr = [invoice.supplier_address, invoice.supplier_number].filter(Boolean).join(", ");
  const sCityState = [invoice.supplier_city, invoice.supplier_state].filter(Boolean).join(" - ");
  t(sAddr || "—", ML+4, cy-22, { size: 7, maxW: c1w-8 });
  t(sCityState || "—", ML+4, cy-31, { size: 7, maxW: c1w-8 });
  if (invoice.supplier_city) t(`CEP: ${v(invoice.supplier_zip)}`, ML+4, cy-40, { size:7 });
  if (invoice.supplier_phone) t(`Fone: ${invoice.supplier_phone}`, ML+4, cy-49, { size:7 });

  // Center third: DANFE
  const c2x = ML + c1w;
  const c2w = W * 0.38;
  box(c2x, cy, c2w, hdrH, WHITE);
  center("DANFE", c2x, cy-14, c2w, { size:22, font:fB });
  center("Documento Auxiliar da", c2x, cy-34, c2w, { size:7 });
  center("Nota Fiscal Eletrônica", c2x, cy-43, c2w, { size:7 });
  center(`Nº ${v(invoice.number)}   Série: ${v(invoice.series)}`, c2x, cy-57, c2w, { size:10, font:fB });
  center(`Emissão: ${formatDate(invoice.issue_date)}`, c2x, cy-70, c2w, { size:8 });

  // Right third: access key + CNPJ/IE
  const c3x = c2x + c2w;
  const c3w = W - c1w - c2w;
  box(c3x, cy, c3w, hdrH, WHITE);
  t("CHAVE DE ACESSO", c3x+4, cy-10, { size:6, color:GRAY });
  const chave = (invoice.access_key || "").replace(/(\d{4})/g,"$1 ").trim();
  t(chave, c3x+4, cy-20, { size:6.5, font:fB, maxW: c3w-8 });
  t(`CNPJ: ${formatCNPJ(invoice.supplier_cnpj)}`, c3x+4, cy-50, { size:7 });
  t(`IE: ${v(invoice.supplier_ie)}`, c3x+4, cy-62, { size:7 });

  cy -= hdrH;

  // ── 2. NATUREZA / PROTOCOLO ────────────────────────────────
  const natH = 32;
  box(ML, cy, W * 0.55, natH, WHITE);
  lbl("NATUREZA DA OPERAÇÃO", ML, cy);
  t(v(invoice.operation_nature), ML+4, cy-12, { size:8, font:fB, maxW: W*0.55-8 });

  box(ML + W*0.55, cy, W*0.45, natH, WHITE);
  lbl("PROTOCOLO DE AUTORIZAÇÃO", ML+W*0.55, cy);
  t(invoice.protocol_number ? invoice.protocol_number : "NF-e Autorizada", ML+W*0.55+4, cy-12, { size:8, font:fB, maxW: W*0.45-8 });
  cy -= natH;

  // ── 3. EMITENTE ────────────────────────────────────────────
  sectionHeader("EMITENTE", ML, cy, W, 16, LGRAY);
  cy -= 16;

  // Row: nome | cnpj | ie
  const emR1H = 26;
  cell(ML, cy, W*0.5, emR1H, "NOME / RAZÃO SOCIAL", v(invoice.supplier_name), { bold:true, valSize:9 });
  cell(ML+W*0.5, cy, W*0.25, emR1H, "CNPJ", formatCNPJ(invoice.supplier_cnpj), { bold:true, valSize:9 });
  cell(ML+W*0.75, cy, W*0.25, emR1H, "INSCRIÇÃO ESTADUAL", v(invoice.supplier_ie), { bold:true, valSize:9 });
  cy -= emR1H;

  // Row: endereço | bairro | municipio | uf | cep
  const emR2H = 26;
  cell(ML, cy, W*0.35, emR2H, "ENDEREÇO", sAddr || "—", { bold:true, valSize:9 });
  cell(ML+W*0.35, cy, W*0.2, emR2H, "BAIRRO", v(invoice.supplier_district), { bold:true, valSize:9 });
  cell(ML+W*0.55, cy, W*0.2, emR2H, "MUNICÍPIO", v(invoice.supplier_city), { bold:true, valSize:9 });
  cell(ML+W*0.75, cy, W*0.1, emR2H, "UF", v(invoice.supplier_state), { bold:true, valSize:9 });
  cell(ML+W*0.85, cy, W*0.15, emR2H, "CEP", v(invoice.supplier_zip), { bold:true, valSize:9 });
  cy -= emR2H;

  // ── 4. DESTINATÁRIO ────────────────────────────────────────
  sectionHeader("DESTINATÁRIO / REMETENTE", ML, cy, W, 16, LGRAY);
  cy -= 16;

  const dR1H = 26;
  cell(ML, cy, W*0.5, dR1H, "NOME / RAZÃO SOCIAL", v(invoice.recipient_name), { bold:true, valSize:9 });
  cell(ML+W*0.5, cy, W*0.25, dR1H, "CNPJ / CPF", formatCNPJ(invoice.recipient_cnpj), { bold:true, valSize:9 });
  cell(ML+W*0.75, cy, W*0.25, dR1H, "INSCRIÇÃO ESTADUAL", v(invoice.recipient_ie), { bold:true, valSize:9 });
  cy -= dR1H;

  const dR2H = 26;
  const rAddr = [invoice.recipient_address, invoice.recipient_number].filter(Boolean).join(", ");
  cell(ML, cy, W*0.35, dR2H, "ENDEREÇO", rAddr || "—", { bold:true, valSize:9 });
  cell(ML+W*0.35, cy, W*0.2, dR2H, "BAIRRO", v(invoice.recipient_district), { bold:true, valSize:9 });
  cell(ML+W*0.55, cy, W*0.2, dR2H, "MUNICÍPIO", v(invoice.recipient_city), { bold:true, valSize:9 });
  cell(ML+W*0.75, cy, W*0.1, dR2H, "UF", v(invoice.recipient_state), { bold:true, valSize:9 });
  cell(ML+W*0.85, cy, W*0.15, dR2H, "CEP", v(invoice.recipient_zip), { bold:true, valSize:9 });
  cy -= dR2H;

  // ── 5. PRODUTOS / SERVIÇOS ─────────────────────────────────
  sectionHeader("DADOS DOS PRODUTOS / SERVIÇOS", ML, cy, W, 16, LGRAY);
  cy -= 16;

  // Column config (widths as fraction of W)
  const cols = [
    { lbl:"Nº",      w:0.04 },
    { lbl:"DESCRIÇÃO DO PRODUTO / SERVIÇO", w:0.26 },
    { lbl:"CÓDIGO",  w:0.08 },
    { lbl:"NCM",     w:0.08 },
    { lbl:"CFOP",    w:0.06 },
    { lbl:"UN",      w:0.05 },
    { lbl:"QTDE",    w:0.07 },
    { lbl:"VL. UNIT.",  w:0.10 },
    { lbl:"VL. TOTAL",  w:0.26 },
  ];

  // header row
  const tHdrH = 18;
  box(ML, cy, W, tHdrH, LGRAY);
  let px = ML;
  cols.forEach(c => {
    center(c.lbl, px, cy-5, c.w*W, { size:6, font:fB });
    px += c.w * W;
  });
  cy -= tHdrH;

  // item rows
  const items = invoice.items || [];
  items.forEach((item, idx) => {
    const rowH = 20;
    box(ML, cy, W, rowH, WHITE);
    const vals = [
      String(idx+1),
      v(item.description),
      v(item.cfop),
      v(item.ncm),
      v(item.cfop),
      "UN",
      item.quantity != null ? Number(item.quantity).toFixed(3) : "—",
      item.unit_value != null ? Number(item.unit_value).toFixed(4) : "—",
      item.total != null ? formatCurrency(item.total) : "—",
    ];
    let ipx = ML;
    cols.forEach((c, ci) => {
      const isNum = ci >= 6;
      const isDesc = ci === 1;
      const tx = isNum ? ipx + c.w*W - 4 - fR.widthOfTextAtSize(vals[ci], 7.5) : ipx + 3;
      t(vals[ci], Math.max(ipx+2, tx), cy-13, { size:7.5, maxW: c.w*W - 4 });
      ipx += c.w * W;
    });
    cy -= rowH;
  });

  // ── 6. CÁLCULO DO IMPOSTO / TOTAIS ─────────────────────────
  sectionHeader("CÁLCULO DO IMPOSTO / TOTAIS", ML, cy, W, 16, LGRAY);
  cy -= 16;

  const taxCols = [
    { lbl:"BASE CÁLC. ICMS",  val: formatCurrency(invoice.tax_icms_base || invoice.total_products || invoice.total_value) },
    { lbl:"VALOR ICMS",       val: formatCurrency(invoice.tax_icms) },
    { lbl:"VALOR IPI",        val: formatCurrency(invoice.tax_ipi) },
    { lbl:"VALOR PIS",        val: formatCurrency(invoice.tax_pis) },
    { lbl:"VALOR COFINS",     val: formatCurrency(invoice.tax_cofins) },
    { lbl:"DESCONTO",         val: formatCurrency(invoice.total_discount) },
    { lbl:"FRETE",            val: formatCurrency(invoice.total_freight) },
    { lbl:"TOTAL NF",         val: formatCurrency(invoice.total_value), amber:true },
  ];
  const taxW = W / taxCols.length;
  const taxH = 28;
  taxCols.forEach((c, i) => {
    const fill = c.amber ? AMBER : WHITE;
    box(ML + i*taxW, cy, taxW, taxH, fill);
    lbl(c.lbl, ML+i*taxW, cy);
    t(c.val, ML+i*taxW+2, cy-17, { size:8, font:fB, maxW: taxW-4 });
  });
  cy -= taxH;

  // ── 7. FATURA / DUPLICATA ──────────────────────────────────
  if (invoice.installments && invoice.installments.length > 0) {
    sectionHeader("FATURA / DUPLICATA", ML, cy, W, 16, LGRAY);
    cy -= 16;

    // header
    const fatHdrH = 16;
    box(ML, cy, W/3, fatHdrH, LGRAY);
    center("NÚMERO", ML, cy-5, W/3, { size:7, font:fB });
    box(ML+W/3, cy, W/3, fatHdrH, LGRAY);
    center("VENCIMENTO", ML+W/3, cy-5, W/3, { size:7, font:fB });
    box(ML+W*2/3, cy, W/3, fatHdrH, LGRAY);
    center("VALOR", ML+W*2/3, cy-5, W/3, { size:7, font:fB });
    cy -= fatHdrH;

    invoice.installments.forEach(inst => {
      const instH = 20;
      const num = String(inst.number || "001").padStart(3,"0");
      box(ML, cy, W/3, instH, WHITE);
      center(num, ML, cy-7, W/3, { size:9, font:fB });
      box(ML+W/3, cy, W/3, instH, WHITE);
      center(formatDate(inst.due_date), ML+W/3, cy-7, W/3, { size:9, font:fB });
      box(ML+W*2/3, cy, W/3, instH, WHITE);
      center(formatCurrency(inst.value), ML+W*2/3, cy-7, W/3, { size:9, font:fB });
      cy -= instH;
    });

    // payment info
    const payH = 22;
    box(ML, cy, W/2, payH, WHITE);
    lbl("FORMA DE PAGAMENTO", ML, cy);
    const paymentTypeMap = {"01":"Dinheiro","02":"Cheque","03":"Cartão Crédito","04":"Cartão Débito","05":"Crediário","10":"Vale Alimentação","12":"Duplicata","13":"Boleto Bancário","99":"Outro"};
    const pt = invoice.payments?.[0]?.payment_type || "13";
    t(paymentTypeMap[pt] || "Boleto Bancário", ML+4, cy-14, { size:9, font:fB });
    box(ML+W/2, cy, W/2, payH, WHITE);
    lbl("VALOR DO PAGAMENTO", ML+W/2, cy);
    t(formatCurrency(invoice.total_value), ML+W/2+4, cy-14, { size:9, font:fB });
    cy -= payH;
  }

  // ── 8. INFORMAÇÕES COMPLEMENTARES ─────────────────────────
  if (invoice.additional_info) {
    sectionHeader("INFORMAÇÕES COMPLEMENTARES", ML, cy, W, 16, LGRAY);
    cy -= 16;

    const maxInfoH = 60;
    box(ML, cy, W, maxInfoH, WHITE);

    // word-wrap
    const words = (invoice.additional_info || "").split(" ");
    const maxLineW = W - 8;
    let line = "";
    let lineY = cy - 10;
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (fR.widthOfTextAtSize(test, 7.5) > maxLineW) {
        t(line, ML+4, lineY, { size:7.5 });
        line = word;
        lineY -= 11;
        if (lineY < cy - maxInfoH + 5) break;
      } else {
        line = test;
      }
    }
    if (line && lineY > cy - maxInfoH + 5) t(line, ML+4, lineY, { size:7.5 });
    cy -= maxInfoH;
  }

  // ── 9. CONTROLE INTERNO ────────────────────────────────────
  cy -= 10;
  const ctrlHdrH = 18;
  box(ML, cy, W, ctrlHdrH, AMBER);
  center("CONTROLE INTERNO DE LANÇAMENTOS", ML, cy-5, W, { size:9, font:fB });
  cy -= ctrlHdrH;

  const ctrlRowH = 30;
  const cw = W / 3;
  box(ML,      cy, cw, ctrlRowH, WHITE);
  box(ML+cw,   cy, cw, ctrlRowH, WHITE);
  box(ML+cw*2, cy, cw, ctrlRowH, WHITE);

  lbl("LANÇADO SIGV",    ML,      cy);
  lbl("LANÇADO TOPCON",  ML+cw,   cy);
  lbl("BOLETO EM MÃOS",  ML+cw*2, cy);

  const sigvTxt   = invoice.sigv_recorded   ? "SIM" : "NÃO";
  const topconTxt = invoice.topcon_recorded ? "SIM" : "NÃO";
  const boletoTxt = invoice.boleto_recorded ? "SIM" : "NÃO";
  const ctrlColor = (val) => (val === "SIM" ? rgb(0.05,0.55,0.05) : RED);

  center(sigvTxt,   ML,      cy-20, cw,  { size:14, font:fB, color: ctrlColor(sigvTxt) });
  center(topconTxt, ML+cw,   cy-20, cw,  { size:14, font:fB, color: ctrlColor(topconTxt) });
  center(boletoTxt, ML+cw*2, cy-20, cw,  { size:14, font:fB, color: ctrlColor(boletoTxt) });

  return await pdfDoc.save();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { invoice } = await req.json();
    if (!invoice) return Response.json({ error: "invoice é obrigatório" }, { status: 400 });

    const pdfBytes = await buildPDF(invoice);
    const base64 = btoa(String.fromCharCode(...pdfBytes));

    return Response.json({ pdf_base64: base64, filename: `NF_${invoice.number}.pdf` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});