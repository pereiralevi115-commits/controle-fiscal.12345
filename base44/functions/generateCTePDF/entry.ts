import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatCNPJ = (cnpj) => {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return cnpj;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
};

const MODAL_MAP = {
  "01": "Rodoviário", "02": "Aéreo", "03": "Aquaviário",
  "04": "Ferroviário", "05": "Dutoviário", "06": "Multimodal",
};

const v = (val) => (val != null && val !== "") ? String(val) : "—";

async function buildPDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const PAGE_W = 595;
  const PAGE_H = 842;
  const ML = 18;
  const W = PAGE_W - ML * 2;
  const BOTTOM_MARGIN = 30;

  const fR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const BLACK = rgb(0, 0, 0);
  const GRAY = rgb(0.5, 0.5, 0.5);
  const LGRAY = rgb(0.88, 0.88, 0.88);
  const AMBER = rgb(0.992, 0.722, 0.075);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let posY = PAGE_H - ML;

  const ensureSpace = (needed) => {
    if (posY - needed < BOTTOM_MARGIN) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      posY = PAGE_H - ML;
    }
  };

  const drawBox = (x, yTop, w, h, fillColor) => {
    if (fillColor) page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: fillColor });
    page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: rgb(0.65, 0.65, 0.65), borderWidth: 0.4 });
  };

  const drawText = (text, x, yTop, { size = 7.5, font = fR, color = BLACK, maxW, dy = 0 } = {}) => {
    let s = String(text ?? "—");
    if (maxW && font.widthOfTextAtSize(s, size) > maxW) {
      while (s.length > 1 && font.widthOfTextAtSize(s + "…", size) > maxW) s = s.slice(0, -1);
      s += "…";
    }
    page.drawText(s, { x, y: yTop - dy, size, font, color });
  };

  const drawCell = (x, yTop, w, h, label, value, opts = {}) => {
    drawBox(x, yTop, w, h, opts.fill);
    drawText(label, x + 2, yTop, { size: 5.5, color: GRAY, dy: 7 });
    drawText(value, x + 3, yTop, { size: opts.valSize || 8.5, font: opts.bold ? fB : fR, color: opts.color || BLACK, maxW: w - 6, dy: opts.bold ? 18 : 17 });
  };

  const drawCenter = (text, x, yTop, w, { size = 8, font = fR, color = BLACK, dy = 0 } = {}) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: x + (w - tw) / 2, y: yTop - dy, size, font, color });
  };

  const drawSectionHeader = (label, x, yTop, w, h = 15, fill = LGRAY) => {
    drawBox(x, yTop, w, h, fill);
    drawCenter(label, x, yTop, w, { size: 7.5, font: fB, dy: (h - 7.5) / 2 + 7.5 });
  };

  // ── HEADER ──
  const HDR_H = 70;
  const c1W = W * 0.62;
  const c2W = W - c1W;
  const c2X = ML + c1W;

  drawBox(ML, posY, c1W, HDR_H);
  drawBox(c2X, posY, c2W, HDR_H);

  const sAddr = [invoice.supplier_address, invoice.supplier_number].filter(Boolean).join(", ");
  const sCityState = [invoice.supplier_city, invoice.supplier_state].filter(Boolean).join(" - ");
  drawText(v(invoice.supplier_name), ML + 4, posY, { size: 9, font: fB, maxW: c1W - 8, dy: 14 });
  drawText(`CNPJ: ${formatCNPJ(invoice.supplier_cnpj)}`, ML + 4, posY, { size: 7, dy: 27 });
  drawText(sAddr || "—", ML + 4, posY, { size: 6.5, maxW: c1W - 8, dy: 39 });
  drawText(sCityState || "—", ML + 4, posY, { size: 6.5, maxW: c1W - 8, dy: 50 });
  if (invoice.supplier_phone) drawText(`Fone: ${invoice.supplier_phone}`, ML + 4, posY, { size: 6.5, dy: 61 });

  drawCenter("DACTE", c2X, posY, c2W, { size: 18, font: fB, dy: 18 });
  drawCenter("Conhecimento de Transporte Eletrônico", c2X, posY, c2W, { size: 6, dy: 30 });
  drawCenter(`Nº ${v(invoice.number)}  Série: ${v(invoice.series)}`, c2X, posY, c2W, { size: 8.5, font: fB, dy: 46 });
  drawCenter(`Emissão: ${formatDate(invoice.issue_date)}`, c2X, posY, c2W, { size: 7.5, dy: 60 });

  posY -= HDR_H;

  // ── IDENTIFICAÇÃO ──
  drawCell(ML, posY, W * 0.34, 26, "NATUREZA DA OPERAÇÃO", v(invoice.operation_nature), { bold: true });
  drawCell(ML + W * 0.34, posY, W * 0.33, 26, "MODAL", MODAL_MAP[invoice.cte_modal] || v(invoice.cte_modal), { bold: true });
  drawCell(ML + W * 0.67, posY, W * 0.33, 26, "CFOP DO TRANSPORTE", v(invoice.cte_cfop), { bold: true });
  posY -= 26;

  if (invoice.access_key) {
    drawBox(ML, posY, W, 24);
    drawText("CHAVE DE ACESSO", ML + 3, posY, { size: 5.5, color: GRAY, dy: 8 });
    const chave = (invoice.access_key || "").replace(/(\w{4})/g, "$1 ").trim();
    drawText(chave, ML + 3, posY, { size: 7.5, font: fB, maxW: W - 6, dy: 19 });
    posY -= 24;
  }

  // ── EMITENTE / TRANSPORTADORA ──
  drawSectionHeader("EMITENTE / TRANSPORTADORA", ML, posY, W);
  posY -= 15;
  drawCell(ML, posY, W * 0.55, 26, "NOME / RAZÃO SOCIAL", v(invoice.supplier_name), { bold: true });
  drawCell(ML + W * 0.55, posY, W * 0.25, 26, "CNPJ", formatCNPJ(invoice.supplier_cnpj), { bold: true });
  drawCell(ML + W * 0.80, posY, W * 0.20, 26, "INSC. ESTADUAL", v(invoice.supplier_ie), { bold: true });
  posY -= 26;
  drawCell(ML, posY, W * 0.40, 26, "ENDEREÇO", sAddr || "—", { bold: true });
  drawCell(ML + W * 0.40, posY, W * 0.22, 26, "BAIRRO", v(invoice.supplier_district), { bold: true });
  drawCell(ML + W * 0.62, posY, W * 0.26, 26, "MUNICÍPIO", v(invoice.supplier_city), { bold: true });
  drawCell(ML + W * 0.88, posY, W * 0.12, 26, "UF", v(invoice.supplier_state), { bold: true });
  posY -= 26;

  // ── DESTINATÁRIO / TOMADOR ──
  drawSectionHeader("DESTINATÁRIO / TOMADOR", ML, posY, W);
  posY -= 15;
  drawCell(ML, posY, W * 0.55, 26, "NOME / RAZÃO SOCIAL", v(invoice.recipient_name), { bold: true });
  drawCell(ML + W * 0.55, posY, W * 0.25, 26, "CNPJ / CPF", formatCNPJ(invoice.recipient_cnpj), { bold: true });
  drawCell(ML + W * 0.80, posY, W * 0.20, 26, "INSC. ESTADUAL", v(invoice.recipient_ie), { bold: true });
  posY -= 26;
  const rAddr = [invoice.recipient_address, invoice.recipient_number].filter(Boolean).join(", ");
  drawCell(ML, posY, W * 0.40, 26, "ENDEREÇO", rAddr || "—", { bold: true });
  drawCell(ML + W * 0.40, posY, W * 0.22, 26, "BAIRRO", v(invoice.recipient_district), { bold: true });
  drawCell(ML + W * 0.62, posY, W * 0.26, 26, "MUNICÍPIO", v(invoice.recipient_city), { bold: true });
  drawCell(ML + W * 0.88, posY, W * 0.12, 26, "UF", v(invoice.recipient_state), { bold: true });
  posY -= 26;

  // ── OBSERVAÇÕES ──
  if (invoice.service_description) {
    ensureSpace(60);
    drawSectionHeader("OBSERVAÇÕES DO TRANSPORTE", ML, posY, W);
    posY -= 15;
    const desc = (invoice.service_description || "—").replace(/\\n/g, " ");
    const words = desc.split(/\s+/);
    const maxLineW = W - 10;
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (fR.widthOfTextAtSize(test, 7.5) > maxLineW) {
        if (line) lines.push(line);
        line = word;
      } else { line = test; }
    }
    if (line) lines.push(line);
    const DESC_H = Math.max(30, lines.length * 11 + 10);
    drawBox(ML, posY, W, DESC_H);
    let lineY = posY - 12;
    for (const ln of lines) { drawText(ln, ML + 4, lineY, { size: 7.5 }); lineY -= 11; }
    posY -= DESC_H;
  }

  // ── VALORES ──
  ensureSpace(48);
  drawSectionHeader("CÁLCULO DO IMPOSTO / VALORES", ML, posY, W);
  posY -= 15;
  const TAX_COLS = [
    { lbl: "BASE CÁLC. ICMS", val: formatCurrency(invoice.tax_icms_base) },
    { lbl: "VALOR ICMS", val: formatCurrency(invoice.tax_icms) },
    { lbl: "VALOR TOTAL PRESTAÇÃO", val: formatCurrency(invoice.total_value), amber: true },
  ];
  const TAX_H = 26;
  const taxW = W / TAX_COLS.length;
  TAX_COLS.forEach((col, i) => {
    drawBox(ML + i * taxW, posY, taxW, TAX_H, col.amber ? AMBER : undefined);
    drawText(col.lbl, ML + i * taxW + 3, posY, { size: 5.5, color: GRAY, dy: 8 });
    drawText(col.val, ML + i * taxW + 3, posY, { size: 9, font: fB, maxW: taxW - 6, dy: 20 });
  });
  posY -= TAX_H;

  // ── CONTROLE INTERNO ──
  ensureSpace(56);
  drawSectionHeader("CONTROLE INTERNO DE LANÇAMENTOS", ML, posY, W, 16, AMBER);
  posY -= 16;
  const RED = rgb(0.78, 0.07, 0.07);
  const GREEN = rgb(0.05, 0.5, 0.2);
  const CTRL_COLS = [
    { lbl: "LANÇADO SIGV", done: invoice.sigv_recorded },
    { lbl: "LANÇADO TOPCON", done: invoice.topcon_recorded },
    { lbl: "BOLETO EM MÃOS", done: invoice.boleto_recorded },
  ];
  const CTRL_H = 34;
  const ctrlW = W / CTRL_COLS.length;
  CTRL_COLS.forEach((col, i) => {
    const cx = ML + i * ctrlW;
    drawBox(cx, posY, ctrlW, CTRL_H);
    drawText(col.lbl, cx + 4, posY, { size: 6, color: GRAY, dy: 9 });
    drawCenter(col.done ? "SIM" : "NÃO", cx, posY, ctrlW, { size: 16, font: fB, color: col.done ? GREEN : RED, dy: 28 });
  });
  posY -= CTRL_H;

  return await pdfDoc.save();
}

Deno.serve(async (req) => {
  try {
    const { invoice } = await req.json();
    if (!invoice) return Response.json({ error: "invoice é obrigatório" }, { status: 400 });

    const pdfBytes = await buildPDF(invoice);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...pdfBytes.slice(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    return Response.json({ pdf_base64: base64, filename: `CTe_${invoice.number}.pdf` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});