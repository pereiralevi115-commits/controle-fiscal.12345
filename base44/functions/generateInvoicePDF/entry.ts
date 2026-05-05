import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PDFDocument, PDFPage, rgb } from 'npm:pdf-lib@1.17.1';
import { readableStreamFromReader } from 'https://deno.land/std@0.208.0/streams/readable_stream_from_reader.ts';

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
};

const formatCNPJ = (cnpj) => {
  if (!cnpj) return "—";
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
};

async function generateInvoicePDF(invoice) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  let yPosition = height - 40;
  const margin = 30;
  const lineHeight = 12;

  const drawText = (text, x, y, options = {}) => {
    page.drawText(String(text), {
      x,
      y,
      size: options.size || 10,
      color: options.color || rgb(0, 0, 0),
    });
  };

  const drawLine = (y) => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8)
    });
  };

  const drawSection = (title, y) => {
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: width - 2 * margin,
      height: 20,
      color: rgb(0.13, 0.16, 0.21), // Dark blue
    });
    drawText(title, margin + 10, y - 15, { size: 11, color: rgb(1, 1, 1) });
    return y - 30;
  };

  // Header
  drawText(`NF-e #${invoice.number} (Série ${invoice.series || "—"})`, margin, yPosition, { size: 16 });
  yPosition -= 20;
  drawText(invoice.supplier_name, margin, yPosition, { size: 11 });
  yPosition -= 25;
  drawLine(yPosition);
  yPosition -= 15;

  // IDENTIFICAÇÃO
  yPosition = drawSection("IDENTIFICAÇÃO", yPosition);
  const idFields = [
    { label: "Nº DOCUMENTO", value: invoice.number },
    { label: "SÉRIE", value: invoice.series },
    { label: "DATA DE EMISSÃO", value: formatDate(invoice.issue_date) },
    { label: "NATUREZA DA OPERAÇÃO", value: "Venda de mercadorias" },
    { label: "VALOR TOTAL NF", value: formatCurrency(invoice.total_value) },
    { label: "DATA DE VENCIMENTO", value: formatDate(invoice.due_date) }
  ];

  let col = 0;
  for (let i = 0; i < idFields.length; i++) {
    const field = idFields[i];
    drawText(field.label, margin + (col * 140), yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    drawText(field.value, margin + (col * 140), yPosition - 12, { size: 10 });
    col++;
    if (col >= 2) {
      col = 0;
      yPosition -= 30;
    }
  }
  yPosition -= 20;
  drawLine(yPosition);
  yPosition -= 15;

  // EMITENTE
  yPosition = drawSection("EMITENTE", yPosition);
  drawText("RAZÃO SOCIAL", margin, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  drawText(invoice.supplier_name, margin, yPosition - 12, { size: 10 });
  drawText("CNPJ", margin + 200, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  drawText(formatCNPJ(invoice.supplier_cnpj), margin + 200, yPosition - 12, { size: 10 });
  yPosition -= 30;
  drawLine(yPosition);
  yPosition -= 15;

  // DESTINATÁRIO
  yPosition = drawSection("DESTINATÁRIO", yPosition);
  drawText("RAZÃO SOCIAL", margin, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  drawText(invoice.recipient_name || "—", margin, yPosition - 12, { size: 10 });
  drawText("CNPJ", margin + 200, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  drawText(formatCNPJ(invoice.recipient_cnpj), margin + 200, yPosition - 12, { size: 10 });
  yPosition -= 30;
  drawLine(yPosition);
  yPosition -= 15;

  // PRODUTOS
  if (invoice.items && invoice.items.length > 0) {
    yPosition = drawSection(`PRODUTOS / SERVIÇOS (${invoice.items.length})`, yPosition);
    drawText("DESCRIÇÃO", margin, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    drawText("QTD", margin + 300, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    drawText("VLR UNIT.", margin + 360, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    drawText("TOTAL", margin + 440, yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    yPosition -= 15;

    invoice.items.forEach((item) => {
      if (yPosition < margin + 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 40;
      }
      drawText(item.description, margin, yPosition, { size: 9 });
      drawText(String(item.quantity), margin + 300, yPosition, { size: 9 });
      drawText(formatCurrency(item.unit_value), margin + 360, yPosition, { size: 9 });
      drawText(formatCurrency(item.total), margin + 440, yPosition, { size: 9 });
      yPosition -= 15;
    });
    drawLine(yPosition);
    yPosition -= 15;
  }

  // CÁLCULO DO IMPOSTO / TOTAIS
  yPosition = drawSection("CÁLCULO DO IMPOSTO / TOTAIS", yPosition);
  const taxFields = [
    { label: "BASE CÁLC. ICMS", value: formatCurrency(invoice.total_products || invoice.total_value) },
    { label: "VALOR ICMS", value: formatCurrency(invoice.tax_icms || 0) },
    { label: "VALOR IPI", value: formatCurrency(invoice.tax_ipi || 0) },
    { label: "VALOR PIS", value: formatCurrency(invoice.tax_pis || 0) },
    { label: "VALOR COFINS", value: formatCurrency(invoice.tax_cofins || 0) },
    { label: "DESCONTO", value: formatCurrency(invoice.total_discount || 0) },
    { label: "FRETE", value: formatCurrency(invoice.total_freight || 0) }
  ];

  col = 0;
  for (let i = 0; i < taxFields.length; i++) {
    const field = taxFields[i];
    drawText(field.label, margin + (col * 180), yPosition, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    drawText(field.value, margin + (col * 180), yPosition - 12, { size: 10 });
    col++;
    if (col >= 3) {
      col = 0;
      yPosition -= 30;
    }
  }

  // Total highlight
  yPosition -= 30;
  page.drawRectangle({
    x: margin,
    y: yPosition - 30,
    width: width - 2 * margin,
    height: 30,
    color: rgb(1, 0.85, 0.4), // Amber
  });
  drawText("TOTAL NF", margin + 10, yPosition - 10, { size: 10, color: rgb(0, 0, 0) });
  drawText(formatCurrency(invoice.total_value), width - margin - 100, yPosition - 10, { size: 14, color: rgb(0, 0, 0) });
  yPosition -= 50;

  // Footer - Control
  if (invoice.access_key) {
    page.drawRectangle({
      x: margin,
      y: yPosition - 40,
      width: width - 2 * margin,
      height: 40,
      color: rgb(1, 0.85, 0.4),
    });
    drawText("CHAVE DE ACESSO", margin + 10, yPosition - 15, { size: 8, color: rgb(0, 0, 0) });
    drawText(invoice.access_key, margin + 10, yPosition - 28, { size: 9, color: rgb(0, 0, 0) });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoice } = await req.json();

    if (!invoice) {
      return Response.json({ error: "invoice é obrigatório" }, { status: 400 });
    }

    const pdfBytes = await generateInvoicePDF(invoice);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="NF_${invoice.number}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});