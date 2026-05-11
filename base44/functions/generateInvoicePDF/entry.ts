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
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
};

const v = (val) => (val != null && val !== "") ? String(val) : "—";

async function buildPDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const PAGE_W = 595;
  const PAGE_H = 842;
  const ML = 18;
  const W  = PAGE_W - ML * 2;
  const BOTTOM_MARGIN = 30;

  const fR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const BLACK = rgb(0, 0, 0);
  const GRAY  = rgb(0.5, 0.5, 0.5);
  const LGRAY = rgb(0.88, 0.88, 0.88);
  const AMBER = rgb(0.992, 0.722, 0.075);
  const RED   = rgb(0.82, 0.08, 0.08);
  const GREEN = rgb(0.05, 0.55, 0.05);

  // State: current page and current Y
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let posY = PAGE_H - ML;

  // Ensure there's enough space; if not, add a new page
  const ensureSpace = (needed) => {
    if (posY - needed < BOTTOM_MARGIN) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      posY = PAGE_H - ML;
    }
  };

  // ── primitives ──────────────────────────────────────────────────
  const drawBox = (x, yTop, w, h, fillColor) => {
    if (fillColor) {
      page.drawRectangle({ x, y: yTop - h, width: w, height: h, color: fillColor });
    }
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

  // ── LAYOUT ──────────────────────────────────────────────────────
  // 1. HEADER: Supplier | DANFE | Access Key
  const HDR_H = 88;
  const c1W = W * 0.30;
  const c2W = W * 0.38;
  const c3W = W - c1W - c2W;
  const c2X = ML + c1W;
  const c3X = c2X + c2W;

  drawBox(ML, posY, c1W, HDR_H);
  drawBox(c2X, posY, c2W, HDR_H);
  drawBox(c3X, posY, c3W, HDR_H);

  // Supplier block
  const sAddr = [invoice.supplier_address, invoice.supplier_number].filter(Boolean).join(", ");
  const sCityState = [invoice.supplier_city, invoice.supplier_state].filter(Boolean).join(" - ");
  drawText(v(invoice.supplier_name), ML + 4, posY, { size: 8, font: fB, maxW: c1W - 8, dy: 12 });
  drawText(sAddr || "—",    ML + 4, posY, { size: 6.5, maxW: c1W - 8, dy: 26 });
  drawText(sCityState || "—", ML + 4, posY, { size: 6.5, maxW: c1W - 8, dy: 37 });
  if (invoice.supplier_zip)   drawText(`CEP: ${invoice.supplier_zip}`,   ML + 4, posY, { size: 6.5, dy: 48 });
  if (invoice.supplier_phone) drawText(`Fone: ${invoice.supplier_phone}`, ML + 4, posY, { size: 6.5, dy: 59 });

  // DANFE block
  drawCenter("DANFE", c2X, posY, c2W, { size: 24, font: fB, dy: 22 });
  drawCenter("Documento Auxiliar da",  c2X, posY, c2W, { size: 7, dy: 38 });
  drawCenter("Nota Fiscal Eletrônica", c2X, posY, c2W, { size: 7, dy: 48 });
  drawCenter(`Nº ${v(invoice.number)}   Série: ${v(invoice.series)}`, c2X, posY, c2W, { size: 10, font: fB, dy: 62 });
  drawCenter(`Emissão: ${formatDate(invoice.issue_date)}`, c2X, posY, c2W, { size: 8, dy: 76 });

  // Access key block
  drawText("CHAVE DE ACESSO", c3X + 4, posY, { size: 5.5, color: GRAY, dy: 10 });
  const chave = (invoice.access_key || "").replace(/(\d{4})/g, "$1 ").trim();
  drawText(chave, c3X + 4, posY, { size: 6, font: fB, maxW: c3W - 8, dy: 22 });
  drawText(`CNPJ: ${formatCNPJ(invoice.supplier_cnpj)}`, c3X + 4, posY, { size: 7, dy: 50 });
  drawText(`IE: ${v(invoice.supplier_ie)}`,              c3X + 4, posY, { size: 7, dy: 63 });

  posY -= HDR_H;

  // 2. NATUREZA / PROTOCOLO
  const NAT_H = 28;
  drawBox(ML, posY, W * 0.55, NAT_H);
  drawText("NATUREZA DA OPERAÇÃO", ML + 3, posY, { size: 5.5, color: GRAY, dy: 8 });
  drawText(v(invoice.operation_nature), ML + 3, posY, { size: 8.5, font: fB, maxW: W * 0.55 - 6, dy: 21 });

  drawBox(ML + W * 0.55, posY, W * 0.45, NAT_H);
  drawText("PROTOCOLO DE AUTORIZAÇÃO", ML + W * 0.55 + 3, posY, { size: 5.5, color: GRAY, dy: 8 });
  drawText(v(invoice.protocol_number) !== "—" ? v(invoice.protocol_number) : "NF-e Autorizada",
    ML + W * 0.55 + 3, posY, { size: 8.5, font: fB, maxW: W * 0.45 - 6, dy: 21 });

  posY -= NAT_H;

  // 3. EMITENTE
  drawSectionHeader("EMITENTE", ML, posY, W);
  posY -= 15;

  const EM_R1 = 26;
  drawCell(ML,            posY, W * 0.50, EM_R1, "NOME / RAZÃO SOCIAL",  v(invoice.supplier_name),          { bold: true });
  drawCell(ML + W * 0.50, posY, W * 0.25, EM_R1, "CNPJ",                 formatCNPJ(invoice.supplier_cnpj), { bold: true });
  drawCell(ML + W * 0.75, posY, W * 0.25, EM_R1, "INSCRIÇÃO ESTADUAL",   v(invoice.supplier_ie),            { bold: true });
  posY -= EM_R1;

  const EM_R2 = 26;
  drawCell(ML,            posY, W * 0.30, EM_R2, "ENDEREÇO",  sAddr || "—",                 { bold: true });
  drawCell(ML + W * 0.30, posY, W * 0.22, EM_R2, "BAIRRO",    v(invoice.supplier_district), { bold: true });
  drawCell(ML + W * 0.52, posY, W * 0.22, EM_R2, "MUNICÍPIO", v(invoice.supplier_city),     { bold: true });
  drawCell(ML + W * 0.74, posY, W * 0.08, EM_R2, "UF",        v(invoice.supplier_state),    { bold: true });
  drawCell(ML + W * 0.82, posY, W * 0.18, EM_R2, "CEP",       v(invoice.supplier_zip),      { bold: true });
  posY -= EM_R2;

  // 4. DESTINATÁRIO
  drawSectionHeader("DESTINATÁRIO / REMETENTE", ML, posY, W);
  posY -= 15;

  const DE_R1 = 26;
  drawCell(ML,            posY, W * 0.50, DE_R1, "NOME / RAZÃO SOCIAL", v(invoice.recipient_name),          { bold: true });
  drawCell(ML + W * 0.50, posY, W * 0.25, DE_R1, "CNPJ / CPF",          formatCNPJ(invoice.recipient_cnpj), { bold: true });
  drawCell(ML + W * 0.75, posY, W * 0.25, DE_R1, "INSCRIÇÃO ESTADUAL",  v(invoice.recipient_ie),            { bold: true });
  posY -= DE_R1;

  const rAddr = [invoice.recipient_address, invoice.recipient_number].filter(Boolean).join(", ");
  const DE_R2 = 26;
  drawCell(ML,            posY, W * 0.30, DE_R2, "ENDEREÇO",  rAddr || "—",                  { bold: true });
  drawCell(ML + W * 0.30, posY, W * 0.22, DE_R2, "BAIRRO",    v(invoice.recipient_district), { bold: true });
  drawCell(ML + W * 0.52, posY, W * 0.22, DE_R2, "MUNICÍPIO", v(invoice.recipient_city),     { bold: true });
  drawCell(ML + W * 0.74, posY, W * 0.08, DE_R2, "UF",        v(invoice.recipient_state),    { bold: true });
  drawCell(ML + W * 0.82, posY, W * 0.18, DE_R2, "CEP",       v(invoice.recipient_zip),      { bold: true });
  posY -= DE_R2;

  // 5. PRODUTOS
  drawSectionHeader("DADOS DOS PRODUTOS / SERVIÇOS", ML, posY, W);
  posY -= 15;

  const COLS = [
    { lbl: "Nº",                             w: 0.04, align: "center" },
    { lbl: "DESCRIÇÃO DO PRODUTO / SERVIÇO", w: 0.30, align: "left"   },
    { lbl: "CÓDIGO",                         w: 0.08, align: "center" },
    { lbl: "NCM",                            w: 0.08, align: "center" },
    { lbl: "CFOP",                           w: 0.06, align: "center" },
    { lbl: "UN",                             w: 0.05, align: "center" },
    { lbl: "QTDE",                           w: 0.07, align: "right"  },
    { lbl: "VL. UNIT.",                      w: 0.10, align: "right"  },
    { lbl: "VL. TOTAL",                      w: 0.22, align: "right"  },
  ];

  const COL_HDR_H = 16;
  drawBox(ML, posY, W, COL_HDR_H, LGRAY);
  let px = ML;
  COLS.forEach(col => {
    drawCenter(col.lbl, px, posY, col.w * W, { size: 6, font: fB, dy: (COL_HDR_H + 6) / 2 });
    px += col.w * W;
  });
  posY -= COL_HDR_H;

  const items = invoice.items || [];
  items.forEach((item, idx) => {
    const ROW_H = 18;
    ensureSpace(ROW_H);
    drawBox(ML, posY, W, ROW_H);
    const rowVals = [
      String(idx + 1),
      v(item.description),
      v(item.code),
      v(item.ncm),
      v(item.cfop),
      v(item.unit) !== "—" ? v(item.unit) : "UN",
      item.quantity != null ? Number(item.quantity).toFixed(3) : "—",
      item.unit_value != null ? Number(item.unit_value).toFixed(4) : "—",
      item.total != null ? formatCurrency(item.total) : "—",
    ];
    let ipx = ML;
    COLS.forEach((col, ci) => {
      const colW = col.w * W;
      const val = rowVals[ci];
      const sz = 7.5;
      let tx;
      if (col.align === "center") {
        const tw = fR.widthOfTextAtSize(val, sz);
        tx = ipx + (colW - tw) / 2;
      } else if (col.align === "right") {
        const tw = fR.widthOfTextAtSize(val, sz);
        tx = ipx + colW - tw - 3;
      } else {
        tx = ipx + 3;
      }
      drawText(val, tx, posY, { size: sz, maxW: colW - 4, dy: (ROW_H + sz) / 2 });
      ipx += colW;
    });
    posY -= ROW_H;
  });

  // 6. CÁLCULO DO IMPOSTO / TOTAIS
  ensureSpace(56);
  drawSectionHeader("CÁLCULO DO IMPOSTO / TOTAIS", ML, posY, W);
  posY -= 15;

  const TAX_COLS = [
    { lbl: "BASE CÁLC. ICMS",  val: formatCurrency(invoice.tax_icms_base || invoice.total_products || invoice.total_value) },
    { lbl: "VALOR ICMS",       val: formatCurrency(invoice.tax_icms) },
    { lbl: "VALOR IPI",        val: formatCurrency(invoice.tax_ipi) },
    { lbl: "VALOR PIS",        val: formatCurrency(invoice.tax_pis) },
    { lbl: "VALOR COFINS",     val: formatCurrency(invoice.tax_cofins) },
    { lbl: "DESCONTO",         val: formatCurrency(invoice.total_discount) },
    { lbl: "FRETE",            val: formatCurrency(invoice.total_freight) },
    { lbl: "TOTAL NF",         val: formatCurrency(invoice.total_value), amber: true },
  ];
  const TAX_H = 26;
  const taxW = W / TAX_COLS.length;
  TAX_COLS.forEach((col, i) => {
    drawBox(ML + i * taxW, posY, taxW, TAX_H, col.amber ? AMBER : undefined);
    drawText(col.lbl, ML + i * taxW + 3, posY, { size: 5.5, color: GRAY, dy: 8 });
    drawText(col.val, ML + i * taxW + 3, posY, { size: 8, font: fB, maxW: taxW - 6, dy: 20 });
  });
  posY -= TAX_H;

  // 7. FATURA / DUPLICATA
  if (invoice.installments && invoice.installments.length > 0) {
    ensureSpace(60);
    drawSectionHeader("FATURA / DUPLICATA", ML, posY, W);
    posY -= 15;

    const FAT_HDR_H = 15;
    drawBox(ML,           posY, W / 3, FAT_HDR_H, LGRAY);
    drawBox(ML + W / 3,   posY, W / 3, FAT_HDR_H, LGRAY);
    drawBox(ML + W * 2/3, posY, W / 3, FAT_HDR_H, LGRAY);
    drawCenter("NÚMERO",     ML,           posY, W / 3, { size: 7, font: fB, dy: 10 });
    drawCenter("VENCIMENTO", ML + W / 3,   posY, W / 3, { size: 7, font: fB, dy: 10 });
    drawCenter("VALOR",      ML + W * 2/3, posY, W / 3, { size: 7, font: fB, dy: 10 });
    posY -= FAT_HDR_H;

    invoice.installments.forEach(inst => {
      const INST_H = 20;
      ensureSpace(INST_H);
      drawBox(ML,           posY, W / 3, INST_H);
      drawBox(ML + W / 3,   posY, W / 3, INST_H);
      drawBox(ML + W * 2/3, posY, W / 3, INST_H);
      const num = String(inst.number || "001").padStart(3, "0");
      drawCenter(num,                        ML,           posY, W / 3, { size: 9, font: fB, dy: 13 });
      drawCenter(formatDate(inst.due_date),  ML + W / 3,   posY, W / 3, { size: 9, font: fB, dy: 13 });
      drawCenter(formatCurrency(inst.value), ML + W * 2/3, posY, W / 3, { size: 9, font: fB, dy: 13 });
      posY -= INST_H;
    });

    const PAY_H = 22;
    const paymentTypeMap = { "01":"Dinheiro","02":"Cheque","03":"Cartão Crédito","04":"Cartão Débito","05":"Crediário","10":"Vale Alimentação","12":"Duplicata","13":"Boleto Bancário","99":"Outro" };
    const pt = invoice.payments?.[0]?.payment_type || "13";
    drawBox(ML,           posY, W / 2, PAY_H);
    drawBox(ML + W / 2,   posY, W / 2, PAY_H);
    drawText("FORMA DE PAGAMENTO",  ML + 3,         posY, { size: 5.5, color: GRAY, dy: 8 });
    drawText(paymentTypeMap[pt] || "Boleto Bancário", ML + 3, posY, { size: 9, font: fB, dy: 18 });
    drawText("VALOR DO PAGAMENTO",  ML + W / 2 + 3, posY, { size: 5.5, color: GRAY, dy: 8 });
    drawText(formatCurrency(invoice.total_value), ML + W / 2 + 3, posY, { size: 9, font: fB, dy: 18 });
    posY -= PAY_H;
  }

  // 8. INFORMAÇÕES COMPLEMENTARES
  if (invoice.additional_info) {
    ensureSpace(80);
    drawSectionHeader("INFORMAÇÕES COMPLEMENTARES", ML, posY, W);
    posY -= 15;

    const INFO_H = 55;
    drawBox(ML, posY, W, INFO_H);
    const words = (invoice.additional_info || "").split(" ");
    const maxLineW = W - 10;
    let line = "";
    let lineY = posY - 10;
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (fR.widthOfTextAtSize(test, 7.5) > maxLineW) {
        drawText(line, ML + 4, lineY, { size: 7.5, dy: 0 });
        line = word;
        lineY -= 11;
        if (lineY < posY - INFO_H + 6) break;
      } else {
        line = test;
      }
    }
    if (line && lineY >= posY - INFO_H + 6) {
      drawText(line, ML + 4, lineY, { size: 7.5, dy: 0 });
    }
    posY -= INFO_H;
  }

  // 9. CONTROLE INTERNO DE LANÇAMENTOS
  posY -= 12;
  ensureSpace(60);
  const CTRL_HDR_H = 18;
  drawBox(ML, posY, W, CTRL_HDR_H, AMBER);
  drawCenter("CONTROLE INTERNO DE LANÇAMENTOS", ML, posY, W, { size: 9, font: fB, dy: (CTRL_HDR_H + 9) / 2 });
  posY -= CTRL_HDR_H;

  const CTRL_H = 30;
  const ctrlW = W / 3;
  drawBox(ML,            posY, ctrlW, CTRL_H);
  drawBox(ML + ctrlW,    posY, ctrlW, CTRL_H);
  drawBox(ML + ctrlW*2,  posY, ctrlW, CTRL_H);

  drawText("LANÇADO SIGV",   ML + 3,           posY, { size: 5.5, color: GRAY, dy: 8 });
  drawText("LANÇADO TOPCON", ML + ctrlW + 3,   posY, { size: 5.5, color: GRAY, dy: 8 });
  drawText("BOLETO EM MÃOS", ML + ctrlW * 2+3, posY, { size: 5.5, color: GRAY, dy: 8 });

  const sigvTxt   = invoice.sigv_recorded   ? "SIM" : "NÃO";
  const topconTxt = invoice.topcon_recorded ? "SIM" : "NÃO";
  const boletoTxt = invoice.boleto_recorded ? "SIM" : "NÃO";
  const statusColor = (s) => s === "SIM" ? GREEN : RED;

  drawCenter(sigvTxt,   ML,            posY, ctrlW, { size: 14, font: fB, color: statusColor(sigvTxt),   dy: 23 });
  drawCenter(topconTxt, ML + ctrlW,    posY, ctrlW, { size: 14, font: fB, color: statusColor(topconTxt), dy: 23 });
  drawCenter(boletoTxt, ML + ctrlW*2,  posY, ctrlW, { size: 14, font: fB, color: statusColor(boletoTxt), dy: 23 });

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

    return Response.json({ pdf_base64: base64, filename: `NF_${invoice.number}.pdf` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});