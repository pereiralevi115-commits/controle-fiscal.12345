import { base44 } from "@/api/base44Client";

const functionByType = {
  nfe: "generateInvoicePDF",
  nfse: "generateNFSePDF",
  cte: "generateCTePDF",
};

function pdfUrlFromBase64(pdfBase64) {
  const binary = atob(pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  return window.URL.createObjectURL(blob);
}

export async function openInvoicePdfForPrint(invoice) {
  const functionName = functionByType[invoice?.document_type || "nfe"] || "generateInvoicePDF";
  const response = await base44.functions.invoke(functionName, { invoice });
  const { pdf_base64, filename } = response.data;
  const url = pdfUrlFromBase64(pdf_base64);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `NotaFiscal_${invoice?.number || "documento"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}