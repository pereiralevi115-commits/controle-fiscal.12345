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
   let page = pdfDoc.addPage([595, 842]); // A4 size
   const { width, height } = page.getSize();

   let yPosition = height - 40;
   const margin = 30;

   const drawText = (text, x, y, options = {}) => {
     page.drawText(String(text), {
       x,
       y,
       size: options.size || 10,
       color: options.color || rgb(0, 0, 0),
     });
   };

   const drawBox = (x, y, w, h, title = null, fields = []) => {
     page.drawRectangle({ x, y, width: w, height: 1, color: rgb(0.3, 0.3, 0.3) });

     if (title) {
       page.drawRectangle({ x, y: y - 18, width: w, height: 18, color: rgb(0.8, 0.8, 0.8) });
       drawText(title, x + 5, y - 12, { size: 8 });
     }

     let fieldY = y - (title ? 30 : 5);
     fields.forEach((field) => {
       drawText(field.label, x + 5, fieldY, { size: 7, color: rgb(0.4, 0.4, 0.4) });
       drawText(String(field.value), x + 5, fieldY - 10, { size: 9 });
       fieldY -= 25;
     });
   };

   // Header - Company Info (left)
   drawText(invoice.supplier_name, margin, yPosition, { size: 11 });
   yPosition -= 12;
   drawText(invoice.supplier_phone || "Telefone não informado", margin, yPosition, { size: 9 });
   yPosition -= 25;

   // Title and Header Info (center/right)
   drawText("DANFE", 240, height - 40, { size: 20 });
   drawText("Documento Auxiliar da", 240, height - 62, { size: 9 });
   drawText("Nota Fiscal Eletrônica", 240, height - 72, { size: 9 });

   drawText(`Nº ${invoice.number} Série: ${invoice.series || "—"}`, margin, height - 95, { size: 12 });
   drawText(`Emissão: ${formatDate(invoice.issue_date)}`, margin, height - 110, { size: 10 });

   // Right side header - CNPJ, IE, etc
   drawText("CHAVE DE ACESSO", 420, height - 40, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.access_key || "—", 420, height - 62, { size: 8 });
   drawText(`CNPJ: ${formatCNPJ(invoice.supplier_cnpj)}`, 420, height - 75, { size: 8 });
   drawText(`IE: ${invoice.supplier_ie || "—"}`, 420, height - 85, { size: 8 });

   yPosition = height - 125;

   // Natureza e Protocolo
   page.drawRectangle({ x: margin, y: yPosition - 40, width: (width - 2 * margin) / 2, height: 40, color: rgb(0.9, 0.9, 0.9) });
   page.drawRectangle({ x: margin + (width - 2 * margin) / 2, y: yPosition - 40, width: (width - 2 * margin) / 2, height: 40, color: rgb(0.9, 0.9, 0.9) });

   drawText("NATUREZA DA OPERAÇÃO", margin + 5, yPosition - 10, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText("Venda de mercadorias", margin + 5, yPosition - 22, { size: 10 });

   drawText("PROTOCOLO DE AUTORIZAÇÃO", margin + (width - 2 * margin) / 2 + 5, yPosition - 10, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText("NF-e Autorizada", margin + (width - 2 * margin) / 2 + 5, yPosition - 22, { size: 10 });

   yPosition -= 60;

   // EMITENTE section
   page.drawRectangle({ x: margin, y: yPosition - 20, width: width - 2 * margin, height: 20, color: rgb(0.8, 0.8, 0.8) });
   drawText("EMITENTE", margin + 5, yPosition - 15, { size: 8 });
   yPosition -= 30;

   const emitCol1 = margin;
   const emitCol2 = margin + 160;
   const emitCol3 = margin + 320;

   drawText("NOME / RAZÃO SOCIAL", emitCol1, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.supplier_name, emitCol1, yPosition - 12, { size: 9 });

   drawText("CNPJ", emitCol2, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCNPJ(invoice.supplier_cnpj), emitCol2, yPosition - 12, { size: 9 });

   drawText("INSCRIÇÃO ESTADUAL", emitCol3, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.supplier_ie || "—", emitCol3, yPosition - 12, { size: 9 });

   yPosition -= 30;

   const emitAddress = `${invoice.supplier_address || "—"}, ${invoice.supplier_number || "—"} - ${invoice.supplier_city || "—"} - ${invoice.supplier_state || "—"}`;
   drawText("ENDEREÇO", emitCol1, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(emitAddress, emitCol1, yPosition - 12, { size: 8 });

   drawText("TELEFONE", emitCol2, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.supplier_phone || "—", emitCol2, yPosition - 12, { size: 8 });

   drawText("EMAIL", emitCol3, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.supplier_email || "—", emitCol3, yPosition - 12, { size: 8 });

   yPosition -= 30;

   // DESTINATÁRIO section
   page.drawRectangle({ x: margin, y: yPosition, width: width - 2 * margin, height: 20, color: rgb(0.8, 0.8, 0.8) });
   drawText("DESTINATÁRIO / REMETENTE", margin + 5, yPosition + 5, { size: 8 });
   yPosition -= 30;

   drawText("NOME / RAZÃO SOCIAL", emitCol1, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.recipient_name || "—", emitCol1, yPosition - 12, { size: 9 });

   drawText("CNPJ / CPF", emitCol2, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCNPJ(invoice.recipient_cnpj), emitCol2, yPosition - 12, { size: 9 });

   drawText("INSCRIÇÃO ESTADUAL", emitCol3, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.recipient_ie || "—", emitCol3, yPosition - 12, { size: 9 });

   yPosition -= 30;

   const destAddress = `${invoice.recipient_address || "—"}, ${invoice.recipient_number || "—"} - ${invoice.recipient_city || "—"} - ${invoice.recipient_state || "—"}`;
   drawText("ENDEREÇO", emitCol1, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(destAddress, emitCol1, yPosition - 12, { size: 8 });
   yPosition -= 30;

   // PRODUTOS section
   if (invoice.items && invoice.items.length > 0) {
     page.drawRectangle({ x: margin, y: yPosition, width: width - 2 * margin, height: 20, color: rgb(0.8, 0.8, 0.8) });
     drawText("DADOS DOS PRODUTOS / SERVIÇOS", margin + 5, yPosition + 5, { size: 8 });
     yPosition -= 25;

     // Headers
     const col1 = margin, col2 = margin + 40, col3 = margin + 140, col4 = margin + 220, col5 = margin + 280, col6 = margin + 330, col7 = margin + 420;

     drawText("Nº", col1, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
     drawText("DESCRIÇÃO DO PRODUTO / SERVIÇO", col2, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
     drawText("CÓDIGO", col3, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
     drawText("NCM", col4, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
     drawText("CFOP", col5, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
     drawText("UN", col6, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
     drawText("QTDE", col7, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });

     yPosition -= 12;
     invoice.items.forEach((item, idx) => {
       drawText(String(idx + 1), col1, yPosition, { size: 9 });
       drawText(item.description, col2, yPosition, { size: 9 });
       drawText(item.ncm || "—", col3, yPosition, { size: 9 });
       drawText("—", col4, yPosition, { size: 9 });
       drawText(item.cfop || "—", col5, yPosition, { size: 9 });
       drawText("UN", col6, yPosition, { size: 9 });
       drawText(String(item.quantity), col7, yPosition, { size: 9 });
       yPosition -= 15;
     });
   }

   yPosition -= 20;

   // CÁLCULO DO IMPOSTO / TOTAIS
   page.drawRectangle({ x: margin, y: yPosition - 20, width: width - 2 * margin, height: 20, color: rgb(0.8, 0.8, 0.8) });
   drawText("CÁLCULO DO IMPOSTO / TOTAIS", margin + 5, yPosition - 15, { size: 8 });
   yPosition -= 35;

   const taxCol1 = margin;
   const taxCol2 = margin + 140;
   const taxCol3 = margin + 280;
   const taxCol4 = margin + 420;

   drawText("BASE CÁLC. ICMS", taxCol1, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.total_products || invoice.total_value), taxCol1, yPosition - 12, { size: 11 });

   drawText("VALOR ICMS", taxCol2, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.tax_icms || 0), taxCol2, yPosition - 12, { size: 11 });

   drawText("VALOR IPI", taxCol3, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.tax_ipi || 0), taxCol3, yPosition - 12, { size: 11 });

   yPosition -= 30;

   drawText("VALOR PIS", taxCol1, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.tax_pis || 0), taxCol1, yPosition - 12, { size: 11 });

   drawText("VALOR COFINS", taxCol2, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.tax_cofins || 0), taxCol2, yPosition - 12, { size: 11 });

   drawText("DESCONTO", taxCol3, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.total_discount || 0), taxCol3, yPosition - 12, { size: 11 });

   drawText("FRETE", taxCol4, yPosition, { size: 7, color: rgb(0.4, 0.4, 0.4) });
   drawText(formatCurrency(invoice.total_freight || 0), taxCol4, yPosition - 12, { size: 11 });

   yPosition -= 35;

   // Total box (amber/yellow)
   page.drawRectangle({
     x: margin,
     y: yPosition - 30,
     width: width - 2 * margin,
     height: 30,
     color: rgb(1, 0.85, 0.4),
   });
   drawText("TOTAL NF", margin + 10, yPosition - 10, { size: 11, color: rgb(0, 0, 0) });
   drawText(formatCurrency(invoice.total_value), width - margin - 80, yPosition - 10, { size: 13, color: rgb(0, 0, 0) });

   yPosition -= 55;

   // PAGAMENTO section
   page.drawRectangle({ x: margin, y: yPosition - 20, width: width - 2 * margin, height: 20, color: rgb(0.8, 0.8, 0.8) });
   drawText("DADOS DO PAGAMENTO", margin + 5, yPosition - 15, { size: 8 });
   yPosition -= 30;

   // Headers
   const payCol1 = margin;
   const payCol2 = margin + 80;
   const payCol3 = margin + 180;
   const payCol4 = margin + 300;

   drawText("PARCELA", payCol1, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
   drawText("VALOR", payCol2, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
   drawText("VENCIMENTO", payCol3, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });
   drawText("FORMA DE PAGAMENTO", payCol4, yPosition, { size: 7, color: rgb(0.5, 0.5, 0.5) });

   yPosition -= 12;

   // Installments
   if (invoice.installments && invoice.installments.length > 0) {
     invoice.installments.forEach((inst, idx) => {
       const paymentType = invoice.payments && invoice.payments[0] ? invoice.payments[0].payment_type : "01";
       const paymentTypeMap = {
         "01": "Dinheiro",
         "02": "Cheque",
         "03": "Cartão",
         "04": "Débito",
         "05": "Crediário",
         "10": "Vale Alimentação"
       };
       const paymentTypeStr = paymentTypeMap[paymentType] || "Boleto";

       drawText(String(inst.number || idx + 1), payCol1, yPosition, { size: 9 });
       drawText(formatCurrency(inst.value), payCol2, yPosition, { size: 9 });
       drawText(inst.due_date ? formatDate(inst.due_date) : "—", payCol3, yPosition, { size: 9 });
       drawText(paymentTypeStr, payCol4, yPosition, { size: 9 });
       yPosition -= 12;
     });
   }

   yPosition -= 20;

   // Additional info
   if (invoice.additional_info) {
     page.drawRectangle({ x: margin, y: yPosition - 20, width: width - 2 * margin, height: 20, color: rgb(0.8, 0.8, 0.8) });
     drawText("INFORMAÇÕES COMPLEMENTARES", margin + 5, yPosition - 15, { size: 8 });
     yPosition -= 30;

     const maxWidth = width - 2 * margin - 10;
     const words = invoice.additional_info.split(" ");
     let line = "";
     let lineY = yPosition;

     words.forEach((word) => {
       if (line.length + word.length > 120) {
         drawText(line, margin + 5, lineY, { size: 8 });
         line = word + " ";
         lineY -= 12;
       } else {
         line += word + " ";
       }
     });
     if (line) drawText(line, margin + 5, lineY, { size: 8 });

     yPosition -= 50;
   }

   // Control section (amber/yellow)
   page.drawRectangle({
     x: margin,
     y: yPosition - 30,
     width: width - 2 * margin,
     height: 30,
     color: rgb(1, 0.85, 0.4),
   });
   drawText("CONTROLE INTERNO DE LANÇAMENTOS", margin + 10, yPosition - 10, { size: 9 });

   yPosition -= 50;

   const controlCol1 = margin;
   const controlCol2 = margin + 200;
   const controlCol3 = margin + 400;

   drawText("LANÇADO SIGV", controlCol1, yPosition, { size: 8, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.sigv_recorded ? "SIM" : "NÃO", controlCol1, yPosition - 12, { size: 10, color: rgb(1, 0, 0) });

   drawText("LANÇADO TOPCON", controlCol2, yPosition, { size: 8, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.topcon_recorded ? "SIM" : "NÃO", controlCol2, yPosition - 12, { size: 10, color: rgb(1, 0, 0) });

   drawText("BOLETO EM MÃOS", controlCol3, yPosition, { size: 8, color: rgb(0.4, 0.4, 0.4) });
   drawText(invoice.boleto_recorded ? "SIM" : "NÃO", controlCol3, yPosition - 12, { size: 10, color: rgb(1, 0, 0) });

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

    return new Response(pdfBytes.buffer || pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="NF_${invoice.number}.pdf"`,
        "Content-Length": pdfBytes.length.toString()
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});