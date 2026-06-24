import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { formatCNPJ } from "@/lib/formatters";
import { useAuth } from "@/lib/AuthContext";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const fmtDate = (d) =>
  d ? format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—";

const SectionHeader = ({ title }) => (
  <div className="bg-slate-800 text-white px-6 py-3 font-bold text-sm tracking-wide">
    {title}
  </div>
);

const InfoField = ({ label, value }) => (
  <div className="py-3 px-6 border-b border-border">
    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
    <p className="font-medium text-sm">{value || "—"}</p>
  </div>
);

export default function NFSeDetailDialog({ invoice: invoiceProp, open, onClose, branches }) {
  const { hasPermission } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [fullInvoice, setFullInvoice] = useState(null);

  useEffect(() => {
    let active = true;
    setFullInvoice(null);
    if (open && invoiceProp?.id) {
      base44.entities.Invoice.get(invoiceProp.id)
        .then((data) => { if (active) setFullInvoice(data); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [open, invoiceProp?.id]);

  const invoice = fullInvoice || invoiceProp;
  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await base44.functions.invoke("generateNFSePDF", { invoice });
      const { pdf_base64, filename } = response.data;
      const binary = atob(pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `NFSe_${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar PDF");
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b border-border p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">
              NFS-e {invoice.number} <span className="text-lg font-normal">(Série {invoice.series || "—"})</span>
            </h2>
            <p className="text-muted-foreground text-sm mt-1">{invoice.supplier_name}</p>
          </div>
          <div className="flex items-center gap-4">
            {hasPermission('download_pdf') && (
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading} className="gap-2">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Baixar PDF
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* IDENTIFICAÇÃO */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="IDENTIFICAÇÃO" />
            <div className="grid grid-cols-4 gap-0">
              <InfoField label="Nº NFS-e" value={invoice.number} />
              <InfoField label="SÉRIE" value={invoice.series} />
              <InfoField label="DATA DE EMISSÃO" value={fmtDate(invoice.issue_date)} />
              <InfoField label="VALOR TOTAL" value={formatCurrency(invoice.total_value)} />
            </div>
          </div>

          {/* PRESTADOR DO SERVIÇO */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="PRESTADOR DO SERVIÇO" />
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="RAZÃO SOCIAL" value={invoice.supplier_name} />
              <InfoField label="CNPJ" value={formatCNPJ(invoice.supplier_cnpj)} />
              <InfoField label="INSCRIÇÃO MUNICIPAL" value={invoice.supplier_ie} />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="ENDEREÇO" value={invoice.supplier_address ? `${invoice.supplier_address}, ${invoice.supplier_number || ""}` : "—"} />
              <InfoField label="MUNICÍPIO / UF" value={invoice.supplier_city && invoice.supplier_state ? `${invoice.supplier_city} / ${invoice.supplier_state}` : (invoice.supplier_city || "—")} />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="TELEFONE" value={invoice.supplier_phone} />
              <InfoField label="E-MAIL" value={invoice.supplier_email} />
            </div>
          </div>

          {/* TOMADOR DO SERVIÇO */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="TOMADOR DO SERVIÇO" />
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="RAZÃO SOCIAL" value={invoice.recipient_name} />
              <InfoField label="CNPJ / CPF" value={formatCNPJ(invoice.recipient_cnpj)} />
              <InfoField label="FILIAL" value={branches?.find((b) => b.cnpj === invoice.branch_cnpj)?.name} />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="ENDEREÇO" value={invoice.recipient_address ? `${invoice.recipient_address}, ${invoice.recipient_number || ""}` : "—"} />
              <InfoField label="BAIRRO" value={invoice.recipient_district} />
            </div>
          </div>

          {/* DISCRIMINAÇÃO DOS SERVIÇOS */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="DISCRIMINAÇÃO DOS SERVIÇOS" />
            <div className="p-6">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {(invoice.service_description || "—").replace(/\\n/g, "\n")}
              </p>
            </div>
          </div>

          {/* VALORES E TRIBUTOS */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="VALORES E TRIBUTOS" />
            <div className="grid grid-cols-4 gap-0">
              <InfoField label="VALOR DO SERVIÇO" value={formatCurrency(invoice.total_value)} />
              <InfoField label="VALOR ISS" value={formatCurrency(invoice.tax_iss || 0)} />
              <InfoField label="VALOR PIS" value={formatCurrency(invoice.tax_pis || 0)} />
              <InfoField label="VALOR COFINS" value={formatCurrency(invoice.tax_cofins || 0)} />
            </div>
            <div className="bg-amber-50 p-6 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">VALOR LÍQUIDO DA NFS-e</p>
              <p className="text-3xl font-bold text-amber-700">{formatCurrency(invoice.total_value)}</p>
            </div>
          </div>

          {/* CHAVE / CÓDIGO DE VERIFICAÇÃO */}
          {invoice.access_key && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="CHAVE / CÓDIGO DE VERIFICAÇÃO" />
              <div className="p-6">
                <p className="font-mono text-sm break-all">{invoice.access_key}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}