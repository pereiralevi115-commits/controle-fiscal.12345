import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatCNPJ = (cnpj) => {
  if (!cnpj) return "—";
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR");
};

async function buildPDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const BLACK = rgb(0, 0, 0);
  const GRAY_LIGHT = rgb(0.88, 0.88, 0.88);
  const GRAY_MED = rgb(0.5, 0.5, 0.5);
  const AMBER = rgb(0.992, 0.722, 0.075);
  const WHITE = rgb(1, 1, 1);
  const RED = rgb(0.85, 0.1, 0.1);

  const M = 20; // margin
  const W = width - 2 * M;

  // ---- helpers ----
  const rect = (x, y, w, h, color, border = false) => {
    page.drawRectangle({ x, y, width: w, height: h, color });
    if (border) {
      page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.6,0.6,0.6), borderWidth: 0.5, borderColor: rgb(0.6,0.6,0.6) });
    }
  };

  const border = (x, y, w, h) => {
    page.drawRectangle({ x, y, width: w, height: h, borderWidth: 0.5, borderColor: rgb(0.6,0.6,0.6), color: rgb(1,1,1) });
  };

  const txt = (text, x, y, { size = 7, font = fontR, color = BLACK, maxWidth } = {}) => {
    let str = String(text ?? "—");
    if (maxWidth && font.widthOfTextAtSize(str, size) > maxWidth) {
      while (str.length > 1 && font.widthOfTextAtSize(str + "…", size) > maxWidth) str = str.slice(0, -1);
      str += "…";
    }
    page.drawText(str, { x, y, size, font, color });
  };

  const label = (text, x, y, w) => {
    txt(text, x + 2, y + 2, { size: 5.5, font: fontR, color: GRAY_MED });
  };

  const cell = (x, y, w, h, labelText, valueText, opts = {}) => {
    border(x, y, w, h);
    label(labelText, x, y + h - 10, w);
    txt(valueText, x + 2, y + 4, { size: opts.valueSize || 7.5, font: opts.bold ? fontB : fontR, color: opts.color || BLACK, maxWidth: w - 4 });
  };

  // ======= HEADER =======
  let y = height - M;
  const headerH = 80;

  // Recebimento bar
  border(M, y - 30, W, 30);
  txt("RECEBEMOS DE ", M + 4, y - 12, { size: 7, font: fontR });
  txt(invoice.supplier_name || "—", M + 55, y - 12, { size: 7, font: fontB, maxWidth: 280 });
  txt("OS PRODUTOS CONSTANTES NA NOTA FISCAL INDICADA AO LADO", M + 4, y - 22, { size: 6.5 });

  const nfBoxX = width - M - 160;
  txt("NF-e", nfBoxX + 80, y - 10, { size: 9, font: fontB });
  txt("Nº", nfBoxX + 2, y - 22, { size: 6 });
  txt(invoice.number || "—", nfBoxX + 15, y - 22, { size: 12, font: fontB });
  txt("SÉRIE", nfBoxX + 100, y - 22, { size: 6 });
  txt(invoice.series || "1", nfBoxX + 125, y - 22, { size: 12, font: fontB });

  // Data recebimento / assinatura / valor
  border(M, y - 50, W * 0.4, 20);
  txt("DATA DE RECEBIMENTO", M + 2, y - 40, { size: 5.5, color: GRAY_MED });
  border(M + W * 0.4, y - 50, W * 0.35, 20);
  txt("IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR", M + W * 0.4 + 2, y - 40, { size: 5.5, color: GRAY_MED });
  border(M + W * 0.75, y - 50, W * 0.25, 20);
  txt("VALOR DA NOTA:", M + W * 0.75 + 2, y - 40, { size: 6 });
  txt(formatCurrency(invoice.total_value), M + W * 0.75 + 2, y - 47, { size: 8, font: fontB });

  y -= 55;

  // ======= EMITENTE / DANFE BOX =======
  const emitH = 85;
  border(M, y - emitH, W * 0.38, emitH);
  // Emitente info
  txt(invoice.supplier_name || "—", M + 4, y - 14, { size: 8, font: fontB, maxWidth: W * 0.38 - 8 });
  const addr = [invoice.supplier_address, invoice.supplier_number].filter(Boolean).join(", ");
  const cityState = [invoice.supplier_city, invoice.supplier_state].filter(Boolean).join(" - ");
  txt(addr || "—", M + 4, y - 26, { size: 7, maxWidth: W * 0.38 - 8 });
  txt(cityState || "—", M + 4, y - 36, { size: 7, maxWidth: W * 0.38 - 8 });
  if (invoice.supplier_phone) txt(`FONE: ${invoice.supplier_phone}`, M + 4, y - 46, { size: 6.5 });

  // DANFE center box
  const danfeX = M + W * 0.38;
  const danfeW = W * 0.25;
  border(danfeX, y - emitH, danfeW, emitH);
  txt("DANFE", danfeX + danfeW / 2 - 18, y - 16, { size: 16, font: fontB });
  txt("Documento Auxiliar da", danfeX + 10, y - 32, { size: 7 });
  txt("Nota Fiscal Eletrônica", danfeX + 10, y - 41, { size: 7 });
  txt("0 - ENTRADA", danfeX + 10, y - 54, { size: 7 });
  txt("1 - SAÍDA", danfeX + 10, y - 63, { size: 7 });
  txt(`Nº ${invoice.number || "—"}`, danfeX + 10, y - 74, { size: 8, font: fontB });
  txt(`SÉRIE ${invoice.series || "1"}`, danfeX + 80, y - 74, { size: 8, font: fontB });

  // Chave de acesso box
  const chaveX = danfeX + danfeW;
  const chaveW = W - W * 0.38 - danfeW;
  border(chaveX, y - emitH, chaveW, emitH);
  txt("CHAVE DE ACESSO", chaveX + 4, y - 10, { size: 5.5, color: GRAY_MED });
  const chave = invoice.access_key || "";
  // Format chave in groups of 4
  const chaveFormatted = chave.replace(/(\d{4})/g, "$1 ").trim();
  txt(chaveFormatted, chaveX + 4, y - 22, { size: 6, font: fontB, maxWidth: chaveW - 8 });
  txt("CONSULTA DE AUTENTICIDADE NO PORTAL NACIONAL DA NF-E", chaveX + 4, y - 38, { size: 5.5 });
  txt("WWW.NFE.FAZENDA.GOV.BR/PORTAL", chaveX + 4, y - 46, { size: 5.5 });
  txt("OU NO SITE DA SEFAZ AUTORIZADORA", chaveX + 4, y - 54, { size: 5.5 });

  y -= emitH + 2;

  // ======= NATUREZA / CRT / IE / CNPJ row =======
  const row1H = 20;
  cell(M, y - row1H, W * 0.35, row1H, "NATUREZA DA OPERAÇÃO", invoice.operation_nature || "VENDA", { valueSize: 7.5, bold: false });
  cell(M + W * 0.35, y - row1H, W * 0.1, row1H, "CRT", "3 - Regime Normal", { valueSize: 6 });
  cell(M + W * 0.45, y - row1H, W * 0.2, row1H, "INSCRIÇÃO ESTADUAL", invoice.supplier_ie || "—");
  cell(M + W * 0.65, y - row1H, W * 0.15, row1H, "INSC. EST. SUBST. TRIB.", "—");
  cell(M + W * 0.8, y - row1H, W * 0.2, row1H, "CNPJ", formatCNPJ(invoice.supplier_cnpj), { bold: true });
  y -= row1H;

  // PROT. AUTORIZAÇÃO row
  const row2H = 16;
  cell(M, y - row2H, W * 0.35, row2H, "PROT. DE AUTORIZAÇÃO", invoice.protocol_number || "—");
  cell(M + W * 0.35, y - row2H, W * 0.65, row2H, "", "");
  y -= row2H;

  // ======= DESTINATÁRIO =======
  const destHeaderH = 14;
  rect(M, y - destHeaderH, W, destHeaderH, GRAY_LIGHT);
  border(M, y - destHeaderH, W, destHeaderH);
  txt("DESTINATÁRIO/REMETENTE", M + 4, y - destHeaderH + 4, { size: 7, font: fontB });
  y -= destHeaderH;

  const destRow1H = 20;
  cell(M, y - destRow1H, W * 0.5, destRow1H, "NOME / RAZÃO SOCIAL", invoice.recipient_name || "—", { maxWidth: W * 0.5 - 4 });
  cell(M + W * 0.5, y - destRow1H, W * 0.25, destRow1H, "CNPJ/CPF", formatCNPJ(invoice.recipient_cnpj), { bold: true });
  cell(M + W * 0.75, y - destRow1H, W * 0.25, destRow1H, "DATA DE EMISSÃO", formatDate(invoice.issue_date));
  y -= destRow1H;

  const destRow2H = 18;
  const recipientAddr = [invoice.recipient_address, invoice.recipient_number].filter(Boolean).join(", ");
  cell(M, y - destRow2H, W * 0.45, destRow2H, "ENDEREÇO", recipientAddr || "—");
  cell(M + W * 0.45, y - destRow2H, W * 0.2, destRow2H, "BAIRRO", invoice.recipient_city || "—");
  cell(M + W * 0.65, y - destRow2H, W * 0.1, destRow2H, "CEP", "—");
  cell(M + W * 0.75, y - destRow2H, W * 0.25, destRow2H, "DATA DE ENTRADA/SAÍDA", formatDate(invoice.issue_date));
  y -= destRow2H;

  const destRow3H = 18;
  cell(M, y - destRow3H, W * 0.35, destRow3H, "MUNICÍPIO", invoice.recipient_city || "—");
  cell(M + W * 0.35, y - destRow3H, W * 0.05, destRow3H, "UF", invoice.recipient_state || "—");
  cell(M + W * 0.4, y - destRow3H, W * 0.05, destRow3H, "PAÍS", "BRASIL");
  cell(M + W * 0.45, y - destRow3H, W * 0.2, destRow3H, "FONE/FAX", invoice.supplier_phone || "—");
  cell(M + W * 0.65, y - destRow3H, W * 0.15, destRow3H, "INSCRIÇÃO ESTADUAL", invoice.recipient_ie || "—");
  cell(M + W * 0.8, y - destRow3H, W * 0.2, destRow3H, "HORA DE ENTRADA/SAÍDA", "—");
  y -= destRow3H;

  // ======= FATURA/DUPLICATA =======
  if (invoice.installments && invoice.installments.length > 0) {
    const fatHeaderH = 12;
    rect(M, y - fatHeaderH, W, fatHeaderH, GRAY_LIGHT);
    border(M, y - fatHeaderH, W, fatHeaderH);
    txt("FATURA / DUPLICATA", M + 4, y - fatHeaderH + 3, { size: 6.5, font: fontB });
    y -= fatHeaderH;

    const fatRowH = 16;
    border(M, y - fatRowH, W, fatRowH);
    const colW = Math.min(W / invoice.installments.length, 120);
    invoice.installments.forEach((inst, idx) => {
      const cx = M + idx * colW;
      const num = String(inst.number || idx + 1).padStart(3, "0");
      txt("NÚMERO", cx + 2, y - 5, { size: 5, color: GRAY_MED });
      txt(num, cx + 2, y - 12, { size: 7 });
      txt("VENCIMENTO", cx + 25, y - 5, { size: 5, color: GRAY_MED });
      txt(formatDate(inst.due_date), cx + 25, y - 12, { size: 7 });
      txt("VALOR", cx + 70, y - 5, { size: 5, color: GRAY_MED });
      txt(formatCurrency(inst.value), cx + 70, y - 12, { size: 7, font: fontB });
    });
    y -= fatRowH;
  }

  // ======= CÁLCULO IMPOSTO =======
  const calcHeaderH = 12;
  rect(M, y - calcHeaderH, W, calcHeaderH, GRAY_LIGHT);
  border(M, y - calcHeaderH, W, calcHeaderH);
  txt("CÁLCULO IMPOSTO", M + 4, y - calcHeaderH + 3, { size: 6.5, font: fontB });
  y -= calcHeaderH;

  const calcRowH = 16;
  const calcCols = [
    { label: "BASE DE CÁLCULO DO ICMS", value: formatCurrency(invoice.tax_icms_base || invoice.total_products || invoice.total_value), w: W * 0.14 },
    { label: "VALOR DO ICMS", value: formatCurrency(invoice.tax_icms || 0), w: W * 0.11 },
    { label: "BASE DE CÁLCULO ICMS ST", value: formatCurrency(0), w: W * 0.14 },
    { label: "VALOR DO ICMS ST", value: formatCurrency(0), w: W * 0.11 },
    { label: "VALOR TOTAL DOS PRODUTOS", value: formatCurrency(invoice.total_products || invoice.total_value), w: W * 0.5 },
  ];
  let cx2 = M;
  calcCols.forEach(c => {
    cell(cx2, y - calcRowH, c.w, calcRowH, c.label, c.value, { bold: true });
    cx2 += c.w;
  });
  y -= calcRowH;

  const calcRow2H = 16;
  const calcCols2 = [
    { label: "VALOR DO FRETE", value: formatCurrency(invoice.total_freight || 0), w: W * 0.11 },
    { label: "VALOR DO SEGURO", value: formatCurrency(invoice.total_insurance || 0), w: W * 0.11 },
    { label: "DESCONTO", value: formatCurrency(invoice.total_discount || 0), w: W * 0.11 },
    { label: "OUTRAS DESPESAS", value: formatCurrency(invoice.total_other_charges || 0), w: W * 0.11 },
    { label: "VALOR TOTAL DO IPI", value: formatCurrency(invoice.tax_ipi || 0), w: W * 0.11 },
    { label: "VLR APROX DOS TRIBUTOS", value: formatCurrency(invoice.tax_pis || 0 + (invoice.tax_cofins || 0)), w: W * 0.14 },
    { label: "VALOR TOTAL DA NOTA", value: formatCurrency(invoice.total_value), w: W * 0.31 },
  ];
  let cx3 = M;
  calcCols2.forEach(c => {
    cell(cx3, y - calcRow2H, c.w, calcRow2H, c.label, c.value, { bold: c.label === "VALOR TOTAL DA NOTA" });
    cx3 += c.w;
  });
  y -= calcRow2H;

  // ======= TRANSPORTADOR =======
  const transHeaderH = 12;
  rect(M, y - transHeaderH, W, transHeaderH, GRAY_LIGHT);
  border(M, y - transHeaderH, W, transHeaderH);
  txt("TRANSPORTADOR/VOLUMES TRANSPORTADOS", M + 4, y - transHeaderH + 3, { size: 6.5, font: fontB });
  y -= transHeaderH;

  const transRowH = 16;
  cell(M, y - transRowH, W * 0.3, transRowH, "RAZÃO SOCIAL", invoice.recipient_name || "—");
  cell(M + W * 0.3, y - transRowH, W * 0.1, transRowH, "FRETE POR CONTA", "9 - SEM FRETE");
  cell(M + W * 0.4, y - transRowH, W * 0.1, transRowH, "CÓDIGO ANTT", "—");
  cell(M + W * 0.5, y - transRowH, W * 0.12, transRowH, "PLACA DO VEÍCULO", "—");
  cell(M + W * 0.62, y - transRowH, W * 0.08, transRowH, "UF", "—");
  cell(M + W * 0.7, y - transRowH, W * 0.3, transRowH, "CNPJ", formatCNPJ(invoice.recipient_cnpj));
  y -= transRowH;

  const transRow2H = 16;
  const recipAddr = [invoice.recipient_address, invoice.recipient_number].filter(Boolean).join(", ");
  cell(M, y - transRow2H, W * 0.4, transRow2H, "ENDEREÇO", recipAddr || "—");
  cell(M + W * 0.4, y - transRow2H, W * 0.2, transRow2H, "MUNICÍPIO", invoice.recipient_city || "—");
  cell(M + W * 0.6, y - transRow2H, W * 0.05, transRow2H, "UF", invoice.recipient_state || "—");
  cell(M + W * 0.65, y - transRow2H, W * 0.35, transRow2H, "INSCRIÇÃO ESTADUAL", "—");
  y -= transRow2H;

  // ======= PRODUTOS =======
  const prodHeaderH = 12;
  rect(M, y - prodHeaderH, W, prodHeaderH, GRAY_LIGHT);
  border(M, y - prodHeaderH, W, prodHeaderH);
  txt("DADOS DO PRODUTO/SERVIÇOS", M + 4, y - prodHeaderH + 3, { size: 6.5, font: fontB });
  y -= prodHeaderH;

  // Products header row
  const prodColsConfig = [
    { label: "CÓDIGO", w: W * 0.06 },
    { label: "DESCRIÇÃO DO PRODUTO", w: W * 0.24 },
    { label: "NCM/SH", w: W * 0.07 },
    { label: "CFOP", w: W * 0.05 },
    { label: "UNID", w: W * 0.05 },
    { label: "QTDE", w: W * 0.06 },
    { label: "VLR UNIT", w: W * 0.07 },
    { label: "VLR TOTAL", w: W * 0.08 },
    { label: "BC ICMS", w: W * 0.07 },
    { label: "VLR ICMS", w: W * 0.07 },
    { label: "ALIQ ICMS", w: W * 0.07 },
    { label: "VLR IPI", w: W * 0.11 },
  ];

  const prodHeaderRowH = 14;
  border(M, y - prodHeaderRowH, W, prodHeaderRowH);
  let px = M;
  prodColsConfig.forEach(c => {
    txt(c.label, px + 2, y - prodHeaderRowH + 4, { size: 5.5, color: GRAY_MED });
    px += c.w;
  });
  y -= prodHeaderRowH;

  // Products rows
  const items = invoice.items || [];
  const maxItems = Math.min(items.length, 6);
  for (let i = 0; i < maxItems; i++) {
    const item = items[i];
    const prodRowH = 14;
    border(M, y - prodRowH, W, prodRowH);
    let ipx = M;
    const prodVals = [
      item.cfop || "—",
      item.description || "—",
      item.ncm || "—",
      item.cfop || "—",
      "UN",
      String(item.quantity ?? "—"),
      formatCurrency(item.unit_value),
      formatCurrency(item.total),
      formatCurrency(item.total),
      "—",
      "—",
      "—",
    ];
    prodColsConfig.forEach((c, ci) => {
      txt(prodVals[ci], ipx + 2, y - prodRowH + 4, { size: 6.5, maxWidth: c.w - 4 });
      ipx += c.w;
    });
    y -= prodRowH;
  }

  // ======= DADOS ADICIONAIS =======
  const addHeaderH = 12;
  y -= 4;
  rect(M, y - addHeaderH, W, addHeaderH, GRAY_LIGHT);
  border(M, y - addHeaderH, W, addHeaderH);
  txt("DADOS ADICIONAIS", M + 4, y - addHeaderH + 3, { size: 6.5, font: fontB });
  y -= addHeaderH;

  const addRowH = 50;
  border(M, y - addRowH, W * 0.65, addRowH);
  txt("INFORMAÇÕES COMPLEMENTARES", M + 2, y - 8, { size: 5.5, color: GRAY_MED });
  const infoText = invoice.additional_info || "";
  // Word wrap
  const words = infoText.split(" ");
  let line = ""; let lineY = y - 16;
  words.forEach(word => {
    const test = line ? line + " " + word : word;
    if (fontR.widthOfTextAtSize(test, 6.5) > W * 0.65 - 8) {
      txt(line, M + 4, lineY, { size: 6.5 });
      line = word;
      lineY -= 9;
    } else { line = test; }
  });
  if (line) txt(line, M + 4, lineY, { size: 6.5 });

  border(M + W * 0.65, y - addRowH, W * 0.35, addRowH);
  txt("RESERVADO AO FISCO", M + W * 0.65 + 4, y - 8, { size: 5.5, color: GRAY_MED });

  y -= addRowH + 4;

  // ======= CONTROLE INTERNO =======
  const ctrlHeaderH = 16;
  rect(M, y - ctrlHeaderH, W, ctrlHeaderH, AMBER);
  border(M, y - ctrlHeaderH, W, ctrlHeaderH);
  txt("CONTROLE INTERNO DE LANÇAMENTOS", M + 4, y - ctrlHeaderH + 5, { size: 8, font: fontB });
  y -= ctrlHeaderH;

  const ctrlRowH = 22;
  border(M, y - ctrlRowH, W, ctrlRowH);
  const ctrlW = W / 3;
  txt("LANÇADO SIGV", M + 4, y - 8, { size: 6, color: GRAY_MED });
  txt(invoice.sigv_recorded ? "SIM" : "NÃO", M + 4, y - 18, { size: 11, font: fontB, color: RED });
  txt("LANÇADO TOPCON", M + ctrlW + 4, y - 8, { size: 6, color: GRAY_MED });
  txt(invoice.topcon_recorded ? "SIM" : "NÃO", M + ctrlW + 4, y - 18, { size: 11, font: fontB, color: RED });
  txt("BOLETO EM MÃOS", M + ctrlW * 2 + 4, y - 8, { size: 6, color: GRAY_MED });
  txt(invoice.boleto_recorded ? "SIM" : "NÃO", M + ctrlW * 2 + 4, y - 18, { size: 11, font: fontB, color: RED });

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