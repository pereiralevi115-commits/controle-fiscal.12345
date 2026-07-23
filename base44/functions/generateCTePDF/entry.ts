import { PDFDocument, rgb, StandardFonts } from 'npm:pdf-lib@1.17.1';
import QRCode from 'npm:qrcode@1.5.4';

const v = (value) => (value !== undefined && value !== null && value !== "" ? String(value) : "-");
const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const raw = String(dateStr);
  const date = raw.includes("T") ? new Date(raw) : new Date(raw + "T12:00:00");
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("pt-BR");
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  const raw = String(dateStr);
  const date = raw.includes("T") ? new Date(raw) : new Date(raw + "T00:00:00");
  if (Number.isNaN(date.getTime())) return formatDate(dateStr);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatCNPJ = (value) => {
  const digits = onlyDigits(value);
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return v(value);
};

const formatCep = (value) => {
  const digits = onlyDigits(value);
  if (digits.length === 8) return digits.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2-$3");
  return v(value);
};

const spacedAccessKey = (key) => onlyDigits(key).replace(/(\d{4})(?=\d)/g, "$1 ").trim();

function truncate(font, text, size, maxWidth) {
  let output = v(text);
  if (!maxWidth) return output;
  while (output.length > 1 && font.widthOfTextAtSize(output, size) > maxWidth) output = output.slice(0, -1);
  return output;
}

function wrap(font, text, size, maxWidth, maxLines = 3) {
  const words = v(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function barcodeBars(value) {
  const digits = onlyDigits(value) || "00000000000000000000000000000000000000000000";
  const bars = [];
  for (let i = 0; i < digits.length; i++) {
    const n = Number(digits[i]);
    bars.push({ black: true, width: 1 + (n % 3) });
    bars.push({ black: false, width: 1 });
    bars.push({ black: true, width: 1 + ((n + i) % 2) });
    bars.push({ black: false, width: 1 });
  }
  return bars;
}

async function buildPDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fR = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fB = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fBI = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const BLACK = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);

  const pageW = 595.28;
  const pageH = 841.89;
  const m = 22;
  const w = pageW - m * 2;
  let y = pageH - 17;

  const line = (x1, y1, x2, y2, width = 0.6) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: width, color: BLACK });
  const box = (x, top, bw, bh, width = 0.6) => page.drawRectangle({ x, y: top - bh, width: bw, height: bh, borderColor: BLACK, borderWidth: width });
  const txt = (text, x, baseY, size = 7, font = fR, maxWidth) => page.drawText(truncate(font, text, size, maxWidth), { x, y: baseY, size, font, color: BLACK });
  const center = (text, x, bw, baseY, size = 7, font = fR) => {
    const s = truncate(font, text, size, bw - 4);
    page.drawText(s, { x: x + (bw - font.widthOfTextAtSize(s, size)) / 2, y: baseY, size, font, color: BLACK });
  };
  const right = (text, x, bw, baseY, size = 7, font = fR) => {
    const s = truncate(font, text, size, bw - 4);
    page.drawText(s, { x: x + bw - font.widthOfTextAtSize(s, size) - 3, y: baseY, size, font, color: BLACK });
  };
  const label = (text, x, baseY, size = 5.2) => txt(text, x, baseY, size, fR);
  const cellLabel = (text, x, top, size = 5.2) => label(text, x + 3, top - 8, size);

  const personBlock = (x, top, bw, bh, title, data = {}) => {
    box(x, top, bw, bh);
    cellLabel(title, x, top);
    txt(v(data.name), x + 38, top - 11, 8.5, fR, bw - 45);
    label("ENDEREÇO", x + 3, top - 23);
    txt(v(data.address), x + 38, top - 26, 7.5, fR, bw - 45);
    label("MUNICÍPIO", x + 3, top - 42);
    txt(v(data.city), x + 38, top - 45, 7.5, fR, 150);
    label("CEP", x + bw - 80, top - 42);
    txt(formatCep(data.cep), x + bw - 50, top - 45, 7.5, fR, 48);
    label("CNPJ/CPF", x + 3, top - 55);
    txt(formatCNPJ(data.cnpj), x + 38, top - 58, 7.5, fR, 120);
    label("INSCRIÇÃO ESTADUAL", x + bw - 130, top - 55);
    txt(v(data.ie), x + bw - 62, top - 58, 7.5, fR, 58);
    label("PAÍS", x + 3, top - 68);
    txt(v(data.country || "-"), x + 38, top - 71, 7.5, fR, 80);
    label("FONE", x + bw - 95, top - 68);
    txt(v(data.phone), x + bw - 70, top - 71, 7.5, fR, 67);
  };

  const supplierAddr = [invoice.supplier_address, invoice.supplier_number].filter(Boolean).join(", ");
  const recipientAddr = [invoice.recipient_address, invoice.recipient_number].filter(Boolean).join(", ");
  const supplierCity = [invoice.supplier_city, invoice.supplier_state].filter(Boolean).join(" - ");
  const recipientCity = [invoice.recipient_city, invoice.recipient_state].filter(Boolean).join(" - ");
  const tomadorName = invoice.cte_tomador_name || invoice.tomador_name || invoice.recipient_name;
  const tomadorCnpj = invoice.cte_tomador_cnpj || invoice.tomador_cnpj || invoice.recipient_cnpj;
  const tomadorAddress = invoice.cte_tomador_address || recipientAddr;
  const tomadorCity = invoice.cte_tomador_city || recipientCity;
  const tomadorCep = invoice.cte_tomador_zip || invoice.recipient_zip;
  const tomadorIe = invoice.cte_tomador_ie || invoice.recipient_ie;
  const accessKey = onlyDigits(invoice.access_key);
  const issue = formatDateTime(invoice.issue_date);
  const protocol = invoice.protocol_number || "";
  const authDate = formatDateTime(invoice.protocol_date || invoice.issue_date);
  const modal = (invoice.cte_modal === "01" || !invoice.cte_modal) ? "RODOVIÁRIO" : v(invoice.cte_modal).toUpperCase();

  // Recibo superior
  box(m, y, w, 50);
  center("DECLARO QUE RECEBI OS VOLUMES DESTE CONHECIMENTO EM PERFEITO ESTADO PELO QUE DOU POR CUMPRIDO O PRESENTE CONTRATO DE TRANSPORTE", m, w, y - 8, 6.2, fR);
  line(m, y - 11, m + w, y - 11);
  line(m + 150, y - 11, m + 150, y - 50);
  line(m + 355, y - 11, m + 355, y - 50);
  line(m + 455, y - 11, m + 455, y - 50);
  label("Nome", m + 3, y - 20, 6.5);
  line(m, y - 31, m + 150, y - 31);
  label("RG", m + 3, y - 39, 6.5);
  center("ASSINATURA / CARIMBO", m + 150, 205, y - 44, 7, fR);
  center("CHEGADA DATA/HORA", m + 355, 100, y - 17, 5.5, fR);
  center("__/__/____    __:__", m + 355, 100, y - 31, 8, fR);
  center("SAÍDA DATA/HORA", m + 355, 100, y - 40, 5.5, fR);
  center("__/__/____    __:__", m + 355, 100, y - 48, 8, fR);
  center("MODELO      57      CT-e", m + 455, 96, y - 19, 8.5, fB);
  center("Nº", m + 455, 96, y - 31, 5.5, fR);
  center(v(invoice.number).padStart(9, "0"), m + 455, 96, y - 33, 9, fB);
  center(`SÉRIE:     ${v(invoice.series || "001")}`, m + 455, 96, y - 45, 8, fB);
  y -= 54;

  // Cabeçalho principal
  const leftW = 214;
  const midW = 236;
  const rightW = w - leftW - midW;
  box(m, y, w, 128);
  line(m + leftW, y, m + leftW, y - 128);
  line(m + leftW + midW, y, m + leftW + midW, y - 128);

  center(v(invoice.supplier_name), m + 6, leftW - 12, y - 15, 10, fB);
  const supplierLines = [supplierAddr, supplierCity, `CEP: ${formatCep(invoice.supplier_zip)}`, `CNPJ: ${formatCNPJ(invoice.supplier_cnpj)}`, `INSCRIÇÃO ESTADUAL: ${v(invoice.supplier_ie)}`, invoice.supplier_phone ? `TELEFONE: ${invoice.supplier_phone}` : ""].filter(Boolean);
  supplierLines.forEach((lineText, i) => center(lineText, m + 8, leftW - 16, y - 45 - i * 9, 7.2, fR));

  center("DACTE", m + leftW, midW, y - 12, 10, fB);
  center("Documento Auxiliar do Conhecimento de Transporte Eletrônico", m + leftW, midW, y - 24, 6.2, fB);
  const topRowY = y - 32;
  line(m + leftW, topRowY, m + leftW + midW, topRowY);
  const cols = [30, 35, 70, 32, 69];
  let cx = m + leftW;
  ["MODELO", "SÉRIE", "NÚMERO", "FOLHA", "DATA E HORA DE EMISSÃO"].forEach((h, i) => { center(h, cx, cols[i], y - 40, 5.2, fR); if (i > 0) line(cx, topRowY, cx, y - 50); cx += cols[i]; });
  cx = m + leftW;
  ["57", v(invoice.series || "001"), v(invoice.number).padStart(9, "0"), "1/1", issue].forEach((val, i) => { center(val, cx, cols[i], y - 49, 7.8, fB); cx += cols[i]; });
  line(m + leftW, y - 50, m + leftW + midW, y - 50);

  const barX = m + leftW + 10;
  const barY = y - 55;
  const barW = midW - 20;
  const bars = barcodeBars(accessKey);
  const totalUnits = bars.reduce((acc, b) => acc + b.width, 0);
  let bx = barX;
  bars.forEach((b) => {
    const bw = (b.width / totalUnits) * barW;
    if (b.black) page.drawRectangle({ x: bx, y: barY - 24, width: Math.max(0.4, bw), height: 24, color: BLACK });
    bx += bw;
  });
  line(m + leftW, y - 82, m + leftW + midW, y - 82);
  cellLabel("CHAVE DE ACESSO", m + leftW, y - 82);
  center(spacedAccessKey(accessKey), m + leftW, midW, y - 103, 9, fB);
  line(m + leftW, y - 108, m + leftW + midW, y - 108);
  center("Consulta de autenticidade no portal nacional do CT-e, no site da Sefaz", m + leftW, midW, y - 118, 6.5, fB);
  center("Autorizadora, ou em http://www.cte.fazenda.gov.br/portal", m + leftW, midW, y - 126, 6.5, fB);

  center("MODAL", m + leftW + midW, rightW, y - 16, 9, fB);
  center(modal, m + leftW + midW, rightW, y - 29, 9, fB);
  line(m + leftW + midW, y - 38, m + w, y - 38);
  center("INSC. SUF. DEST", m + leftW + midW, rightW, y - 48, 5.2, fR);
  line(m + leftW + midW, y - 54, m + w, y - 54);
  if (accessKey) {
    const qrDataUrl = await QRCode.toDataURL(accessKey, { margin: 0, width: 105 });
    const qrImage = await pdfDoc.embedPng(qrDataUrl.split(",")[1]);
    page.drawImage(qrImage, { x: m + leftW + midW + 12, y: y - 123, width: 82, height: 82 });
  }
  y -= 128;

  // Tipo / pagamento / protocolo
  box(m, y, w, 42);
  line(m + 118, y, m + 118, y - 42);
  line(m + 214, y, m + 214, y - 42);
  line(m + 450, y, m + 450, y - 42);
  line(m, y - 22, m + 214, y - 22);
  cellLabel("TIPO DO CT-E", m, y);
  center("NORMAL", m, 118, y - 18, 11, fR);
  cellLabel("TIPO DO SERVIÇO", m + 118, y);
  center("NORMAL", m + 118, 96, y - 18, 11, fR);
  cellLabel("TOMADOR DO SERVIÇO", m, y - 22);
  center(String(tomadorName || "").toUpperCase().includes("CONCRETAR") ? "DESTINATÁRIO" : "OUTROS", m, 118, y - 40, 11, fR);
  cellLabel("FORMA DE PAGAMENTO", m + 118, y - 22);
  center("OUTROS", m + 118, 96, y - 40, 11, fR);
  cellLabel("PROTOCOLO DE AUTORIZAÇÃO DE USO", m + 214, y - 22);
  center(`${v(protocol)}${protocol && authDate ? "  -  " : ""}${authDate}`, m + 214, 236, y - 40, 8, fB);
  y -= 42;

  box(m, y, w, 19);
  cellLabel("CFOP - NATUREZA DA OPERAÇÃO", m, y);
  txt(`${v(invoice.cte_cfop)} - ${v(invoice.operation_nature)}`, m + 4, y - 16, 9.2, fR, w - 8);
  y -= 19;

  box(m, y, w / 2, 20);
  box(m + w / 2, y, w / 2, 20);
  cellLabel("ORIGEM DA PRESTAÇÃO", m, y);
  txt(supplierCity, m + 4, y - 16, 9, fR, w / 2 - 8);
  cellLabel("DESTINO DA PRESTAÇÃO", m + w / 2, y);
  txt(recipientCity, m + w / 2 + 4, y - 16, 9, fR, w / 2 - 8);
  y -= 20;

  personBlock(m, y, w / 2, 56, "REMETENTE", { name: invoice.sender_name || invoice.supplier_name, address: invoice.sender_address || supplierAddr, city: invoice.sender_city || supplierCity, cep: invoice.sender_zip || invoice.supplier_zip, cnpj: invoice.sender_cnpj || invoice.supplier_cnpj, ie: invoice.sender_ie || invoice.supplier_ie, phone: invoice.sender_phone || invoice.supplier_phone });
  personBlock(m + w / 2, y, w / 2, 56, "DESTINATÁRIO", { name: invoice.recipient_name, address: recipientAddr, city: recipientCity, cep: invoice.recipient_zip, cnpj: invoice.recipient_cnpj, ie: invoice.recipient_ie, phone: invoice.recipient_phone });
  y -= 56;
  personBlock(m, y, w / 2, 56, "EXPEDIDOR", { name: invoice.expedidor_name, address: invoice.expedidor_address, city: invoice.expedidor_city, cep: invoice.expedidor_zip, cnpj: invoice.expedidor_cnpj, ie: invoice.expedidor_ie, phone: invoice.expedidor_phone });
  personBlock(m + w / 2, y, w / 2, 56, "RECEBEDOR", { name: invoice.recebedor_name, address: invoice.recebedor_address, city: invoice.recebedor_city, cep: invoice.recebedor_zip, cnpj: invoice.recebedor_cnpj, ie: invoice.recebedor_ie, phone: invoice.recebedor_phone });
  y -= 56;

  box(m, y, w, 34);
  cellLabel("TOMADOR DO SERVIÇO", m, y);
  txt(v(tomadorName), m + 68, y - 12, 8.2, fR, 210);
  label("MUNICÍPIO", m + 320, y - 12);
  txt(v(tomadorCity), m + 356, y - 12, 7.5, fR, 110);
  label("CEP", m + 478, y - 12);
  txt(formatCep(tomadorCep), m + 495, y - 12, 7.5, fR, 55);
  label("ENDEREÇO", m + 3, y - 24);
  txt(v(tomadorAddress), m + 40, y - 24, 7.5, fR, 200);
  label("PAÍS", m + 420, y - 24);
  txt("-", m + 445, y - 24, 7.5, fR);
  label("CNPJ/CPF", m + 3, y - 32);
  txt(formatCNPJ(tomadorCnpj), m + 42, y - 32, 7.5, fR, 105);
  label("INSCRIÇÃO ESTADUAL", m + 196, y - 32);
  txt(v(tomadorIe), m + 275, y - 32, 7.5, fR, 85);
  label("FONE", m + 422, y - 32);
  txt(v(invoice.cte_tomador_phone || invoice.recipient_phone), m + 448, y - 32, 7.5, fR, 82);
  y -= 38;

  // Carga / seguro / quantidades
  box(m, y, w, 65);
  line(m + 184, y, m + 184, y - 65);
  line(m + 312, y, m + 312, y - 65);
  line(m, y - 18, m + w, y - 18);
  cellLabel("PRODUTO PREDOMINANTE", m, y);
  txt(v(invoice.product_description || invoice.service_description || "-"), m + 5, y - 15, 7.8, fR, 170);
  cellLabel("OUTRAS CARACTERÍSTICAS DA CARGA", m + 184, y);
  cellLabel("VALOR TOTAL DA MERCADORIA", m + 312, y);
  right(formatCurrency(invoice.total_products || invoice.total_value), m + 312, w - 312, y - 15, 8.5, fR);
  center("QUANTIDADES", m, 312, y - 27, 7.5, fR);
  line(m, y - 30, m + 312, y - 30);
  const qCols = [52, 52, 52, 52, 52, 52];
  const qLabels = ["CUBAGEM(M3)", "PESO (KG)", "PESO (TON)", "VOLUMES (Unid)", "LITROS", "MMBTU"];
  cx = m;
  qLabels.forEach((h, i) => { line(cx, y - 30, cx, y - 65); center(h, cx, qCols[i], y - 38, 5.8, fR); cx += qCols[i]; });
  line(m + 312, y - 30, m + 312, y - 65);
  txt(v(invoice.cargo_quantity || ""), m + 12, y - 49, 6.8, fR, 40);
  line(m + 312, y - 18, m + w, y - 18);
  cellLabel("NOME DA SEGURADORA", m + 312, y - 18);
  line(m + 312, y - 42, m + w, y - 42);
  cellLabel("RESPONSÁVEL", m + 312, y - 42);
  line(m + 392, y - 42, m + 392, y - 65);
  cellLabel("NÚMERO DA APÓLICE", m + 392, y - 42);
  line(m + 474, y - 42, m + 474, y - 65);
  cellLabel("NÚMERO DA AVERBAÇÃO", m + 474, y - 42);
  y -= 70;

  // Valores da prestação
  box(m, y, w, 74);
  center("COMPONENTES DO VALOR DA PRESTAÇÃO DE SERVIÇO", m, w, y - 10, 7.5, fR);
  line(m, y - 14, m + w, y - 14);
  line(m + 172, y - 14, m + 172, y - 74);
  line(m + 344, y - 14, m + 344, y - 74);
  line(m + 344, y - 30, m + w, y - 30);
  line(m + 344, y - 52, m + w, y - 52);
  label("NOME", m + 4, y - 24, 6.5);
  label("VALOR", m + 146, y - 24, 6.5);
  label("NOME", m + 176, y - 24, 6.5);
  label("VALOR", m + 318, y - 24, 6.5);
  label("VALOR TOTAL DO SERVIÇO", m + 348, y - 24, 6.5);
  right(formatCurrency(invoice.total_value), m + 344, w - 344, y - 27, 9, fR);
  label("VALOR A RECEBER", m + 348, y - 43, 6.5);
  right(formatCurrency(invoice.total_value), m + 344, w - 344, y - 49, 9, fR);
  txt(`Frete .... ${formatCurrency(invoice.total_value)}`, m + 5, y - 37, 7.5, fR, 160);
  line(m + 5, y - 28, m + 344, y - 74, 0.5);
  y -= 74;

  // Imposto
  box(m, y, w, 37);
  center("INFORMAÇÕES RELATIVAS AO IMPOSTO", m, w, y - 10, 7.5, fR);
  line(m, y - 14, m + w, y - 14);
  const taxX = [m, m + 292, m + 354, m + 432, m + 475, m + w];
  taxX.slice(1, -1).forEach((tx) => line(tx, y - 14, tx, y - 37));
  label("SITUAÇÃO TRIBUTÁRIA", m + 4, y - 24, 6.2);
  txt("00 - TRIBUTAÇÃO NORMAL DO ICMS", m + 4, y - 34, 8.5, fR, 280);
  label("% RED BC CALC", m + 296, y - 24, 6.2);
  right("0,00%", m + 292, 62, y - 34, 8.5, fR);
  label("BASE DE CÁLCULO", m + 358, y - 24, 6.2);
  right(formatCurrency(invoice.tax_icms_base || invoice.total_value), m + 354, 78, y - 34, 8.5, fR);
  label("ALÍQ. ICMS", m + 436, y - 24, 6.2);
  right(invoice.tax_icms_base && invoice.tax_icms ? `${((invoice.tax_icms / invoice.tax_icms_base) * 100).toFixed(2).replace(".", ",")}%` : "0,00%", m + 432, 43, y - 34, 8.5, fR);
  label("VALOR DO ICMS", m + 479, y - 24, 6.2);
  right(formatCurrency(invoice.tax_icms), m + 475, w - 475, y - 34, 8.5, fR);
  y -= 43;

  // Documentos originários
  box(m, y, w, 28);
  center("DOCUMENTOS ORIGINÁRIO", m, w, y - 9, 7.5, fR);
  line(m, y - 13, m + w, y - 13);
  line(m + w / 2, y - 13, m + w / 2, y - 28);
  label("TP DOC", m + 4, y - 23, 7);
  label("CPF/CNPJ EMITENTE", m + 68, y - 23, 7);
  label("SÉRIE/NRO. DOCUMENTO", m + 150, y - 23, 7);
  const originDoc = Array.isArray(invoice.items) && invoice.items[0] ? `${invoice.items[0].code || ""} ${invoice.items[0].description || ""}` : "";
  txt(originDoc, m + 4, y - 32, 5.2, fB, w / 2 - 8);
  label("TP DOC", m + w / 2 + 4, y - 23, 7);
  label("CPF/CNPJ EMITENTE", m + w / 2 + 68, y - 23, 7);
  label("SÉRIE/NRO. DOCUMENTO", m + w / 2 + 150, y - 23, 7);
  y -= 38;

  // Observações
  box(m, y, w, 62);
  center("OBSERVAÇÕES", m, w, y - 9, 7.5, fR);
  const obs = invoice.additional_info || invoice.service_description || "";
  wrap(fR, obs, 8, w - 12, 4).forEach((ln, i) => txt(ln, m + 5, y - 22 - i * 10, 8, fR, w - 10));
  if (obs) line(m + 5, y - 22, m + w - 4, y - 62, 0.5);
  y -= 72;

  // Dados específicos rodoviário
  box(m, y, w, 25);
  center("DADOS ESPECÍFICOS DO MODAL RODOVIÁRIO - CARGA FRACIONADA", m, w, y - 9, 7.5, fR);
  line(m, y - 12, m + w, y - 12);
  const modalCols = [64, 64, 28, 86, w - 242];
  cx = m;
  ["RNTRC DA EMPRESA", "CIOT", "LOTAÇÃO", "DATA PREVISTA DE ENTREGA", "ESTE CONHECIMENTO DE TRANSPORTE ATENDE À LEGISLAÇÃO DE TRANSPORTE RODOVIÁRIO EM VIGOR"].forEach((h, i) => {
    if (i > 0) line(cx, y - 12, cx, y - 25);
    center(h, cx, modalCols[i], y - 19, i === 4 ? 5.3 : 5.6, fR);
    cx += modalCols[i];
  });
  txt(v(invoice.rntrc), m + 5, y - 23, 7, fR, 58);
  center("NÃO", m + 128, 28, y - 23, 8, fB);

  // Rodapé
  box(m, 62, w * 0.60, 42);
  box(m + w * 0.60, 62, w * 0.40, 42);
  center("USO EXCLUSIVO DO EMISSOR DO CTE", m, w * 0.60, 50, 7, fR);
  center("RESERVADO AO FISCO", m + w * 0.60, w * 0.40, 50, 7, fR);
  txt("Desenvolvido por: https://fiscal.io", pageW - 118, 18, 6.5, fR);

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