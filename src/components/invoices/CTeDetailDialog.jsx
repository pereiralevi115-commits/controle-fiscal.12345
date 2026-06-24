import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import FiscalEventsSection from "./FiscalEventsSection";
import { formatCNPJ } from "@/lib/formatters";
import { useAuth } from "@/lib/AuthContext";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const MODAL_MAP = {
  "01": "Rodoviário",
  "02": "Aéreo",
  "03": "Aquaviário",
  "04": "Ferroviário",
  "05": "Dutoviário",
  "06": "Multimodal",
};

const SectionHeader = ({ title }) => (
  <div className="bg-slate-800 text-white px-6 py-3 font-bold text-sm tracking-wide">{title}</div>
);

const InfoField = ({ label, value }) => (
  <div className="py-3 px-6 border-b border-border">
    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
    <p className="font-medium text-sm">{value || "—"}</p>
  </div>
);

export default function CTeDetailDialog({ invoice: invoiceProp, open, onClose, branches }) {
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

  const formatAddr = (addr, num) => addr ? `${addr}${num ? ", " + num : ""}` : "—";
  const cityState = (city, state) => city && state ? `${city} / ${state}` : (city || state || "—");

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await base44.functions.invoke("generateCTePDF", { invoice });
      const { pdf_base64, filename } = response.data;
      const binary = atob(pdf_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `CTe_${invoice.number}.pdf`;
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
            <h2 className="text-2xl font-bold">CT-e {invoice.number} <span className="text-lg font-normal">(Série {invoice.series || "—"})</span></h2>
            <p className="text-muted-foreground text-sm mt-1">{invoice.supplier_name}</p>
          </div>
          {hasPermission('download_pdf') && (
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isDownloading} className="gap-2">
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Baixar PDF
            </Button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {invoice.archived && invoice.archive_notes && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
              <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mb-1">Observação de Arquivamento</p>
              <p className="text-sm text-red-700 font-medium">{invoice.archive_notes}</p>
            </div>
          )}

          {/* IDENTIFICAÇÃO */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="IDENTIFICAÇÃO DO TRANSPORTE" />
            <div className="grid grid-cols-4 gap-0">
              <InfoField label="Nº CT-e" value={invoice.number} />
              <InfoField label="SÉRIE" value={invoice.series} />
              <InfoField label="DATA DE EMISSÃO" value={invoice.issue_date ? format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
              <InfoField label="MODAL" value={MODAL_MAP[invoice.cte_modal] || invoice.cte_modal} />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="NATUREZA DA OPERAÇÃO" value={invoice.operation_nature} />
              <InfoField label="CFOP DO TRANSPORTE" value={invoice.cte_cfop} />
            </div>
          </div>

          {/* EMITENTE / TRANSPORTADOR */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="EMITENTE / TRANSPORTADORA" />
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="RAZÃO SOCIAL" value={invoice.supplier_name} />
              <InfoField label="CNPJ" value={formatCNPJ(invoice.supplier_cnpj)} />
              <InfoField label="INSCRIÇÃO ESTADUAL" value={invoice.supplier_ie} />
            </div>
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="ENDEREÇO" value={formatAddr(invoice.supplier_address, invoice.supplier_number)} />
              <InfoField label="BAIRRO" value={invoice.supplier_district} />
              <InfoField label="MUNICÍPIO / UF" value={cityState(invoice.supplier_city, invoice.supplier_state)} />
            </div>
            <div className="grid grid-cols-1 gap-0">
              <InfoField label="TELEFONE" value={invoice.supplier_phone} />
            </div>
          </div>

          {/* DESTINATÁRIO / TOMADOR */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="DESTINATÁRIO / TOMADOR" />
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="RAZÃO SOCIAL" value={invoice.recipient_name} />
              <InfoField label="CNPJ / CPF" value={formatCNPJ(invoice.recipient_cnpj)} />
              <InfoField label="INSCRIÇÃO ESTADUAL" value={invoice.recipient_ie} />
            </div>
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="ENDEREÇO" value={formatAddr(invoice.recipient_address, invoice.recipient_number)} />
              <InfoField label="BAIRRO" value={invoice.recipient_district} />
              <InfoField label="MUNICÍPIO / UF" value={cityState(invoice.recipient_city, invoice.recipient_state)} />
            </div>
            <div className="grid grid-cols-1 gap-0">
              <InfoField label="FILIAL" value={branches?.find((b) => b.cnpj === invoice.branch_cnpj)?.name} />
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          {invoice.service_description && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="OBSERVAÇÕES DO TRANSPORTE" />
              <div className="p-6">
                <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.service_description.replace(/\\n/g, "\n")}</p>
              </div>
            </div>
          )}

          {/* VALORES E IMPOSTOS */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="CÁLCULO DO IMPOSTO / TOTAIS" />
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="BASE DE CÁLCULO ICMS" value={formatCurrency(invoice.tax_icms_base || 0)} />
              <InfoField label="VALOR ICMS" value={formatCurrency(invoice.tax_icms || 0)} />
            </div>
            <div className="bg-amber-50 p-6 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">VALOR TOTAL DA PRESTAÇÃO</p>
              <p className="text-3xl font-bold text-amber-700">{formatCurrency(invoice.total_value)}</p>
            </div>
          </div>

          {/* PROTOCOLO */}
          {(invoice.protocol_number || invoice.access_key) && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="PROTOCOLO / CHAVE DE ACESSO" />
              {invoice.protocol_number && (
                <div className="grid grid-cols-2 gap-0">
                  <InfoField label="Nº PROTOCOLO" value={invoice.protocol_number} />
                  <InfoField label="DATA DO PROTOCOLO" value={invoice.protocol_date ? format(new Date(invoice.protocol_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
                </div>
              )}
              {invoice.access_key && (
                <div className="p-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Chave de acesso</p>
                  <p className="font-mono text-sm break-all">{invoice.access_key}</p>
                </div>
              )}
            </div>
          )}

          <FiscalEventsSection events={invoice.fiscal_events} />

          {invoice.cancelled && (
            <div className="border rounded-lg overflow-hidden bg-red-50">
              <SectionHeader title="CANCELAMENTO" />
              <div className="space-y-0">
                <InfoField label="Status" value="Cancelado" />
                {invoice.cancellation_date && (
                  <InfoField label="Data do Cancelamento" value={format(new Date(invoice.cancellation_date), "dd/MM/yyyy", { locale: ptBR })} />
                )}
                {invoice.cancellation_reason && <InfoField label="Motivo" value={invoice.cancellation_reason} />}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}