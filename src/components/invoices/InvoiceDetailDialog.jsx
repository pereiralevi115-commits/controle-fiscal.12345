import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import { formatCNPJ } from "@/lib/formatters";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

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

export default function InvoiceDetailDialog({ invoice, open, onClose, onMarkReceived, branches }) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await base44.functions.invoke("generateInvoicePDF", { invoice });
      
      // Handle both ArrayBuffer and direct data
      const data = response.data instanceof ArrayBuffer ? response.data : response.data.buffer;
      const blob = new Blob([new Uint8Array(data)], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `NF_${invoice.number}.pdf`;
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
        <div className="sticky top-0 bg-white border-b border-border p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">NF-e #{invoice.number} <span className="text-lg font-normal">(Série {invoice.series || "—"})</span></h2>
            <p className="text-muted-foreground text-sm mt-1">{invoice.supplier_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Baixar PDF
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* IDENTIFICAÇÃO */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="IDENTIFICAÇÃO" />
            <div className="grid grid-cols-4 gap-0">
              <InfoField label="Nº DOCUMENTO" value={invoice.number} />
              <InfoField label="SÉRIE" value={invoice.series} />
              <InfoField label="DATA DE EMISSÃO" value={invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
              <InfoField label="NATUREZA DA OPERAÇÃO" value="Venda de mercadorias" />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="VALOR TOTAL NF" value={formatCurrency(invoice.total_value)} />
              <InfoField label="DATA DE VENCIMENTO" value={invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
            </div>
          </div>

          {/* EMITENTE */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="EMITENTE" />
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="RAZÃO SOCIAL" value={invoice.supplier_name} />
              <InfoField label="CNPJ" value={formatCNPJ(invoice.supplier_cnpj)} />
              <InfoField label="INSCRIÇÃO ESTADUAL" value={invoice.supplier_ie || "—"} />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="ENDEREÇO" value={invoice.supplier_address ? `${invoice.supplier_address}, ${invoice.supplier_number || ""}` : "—"} />
              <InfoField label="MUNICÍPIO / UF" value={invoice.supplier_city && invoice.supplier_state ? `${invoice.supplier_city} / ${invoice.supplier_state}` : "—"} />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="TELEFONE" value={invoice.supplier_phone || "—"} />
              <InfoField label="E-MAIL" value={invoice.supplier_email || "—"} />
            </div>
          </div>

          {/* DESTINATÁRIO */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="DESTINATÁRIO" />
            <div className="grid grid-cols-3 gap-0">
              <InfoField label="RAZÃO SOCIAL" value={invoice.recipient_name} />
              <InfoField label="CNPJ" value={formatCNPJ(invoice.recipient_cnpj)} />
              <InfoField label="INSCRIÇÃO ESTADUAL" value="—" />
            </div>
            <div className="grid grid-cols-2 gap-0">
              <InfoField label="FILIAL" value={branches?.find((b) => b.cnpj === invoice.branch_cnpj)?.name} />
            </div>
          </div>

          {/* PRODUTOS */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title={`PRODUTOS / SERVIÇOS (${invoice.items.length})`} />
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="text-xs font-semibold">Descrição</TableHead>
                    <TableHead className="text-xs font-semibold">Qtd</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Vlr Unit.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.unit_value)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* CÁLCULO DO IMPOSTO / TOTAIS */}
          <div className="border rounded-lg overflow-hidden">
            <SectionHeader title="CÁLCULO DO IMPOSTO / TOTAIS" />
            <div className="grid grid-cols-4 gap-0">
              <InfoField label="VALOR PRODUTOS" value={formatCurrency(invoice.total_products || invoice.total_value)} />
              <InfoField label="VALOR ICMS" value={formatCurrency(invoice.tax_icms || 0)} />
              <InfoField label="VALOR IPI" value={formatCurrency(invoice.tax_ipi || 0)} />
              <InfoField label="VALOR PIS" value={formatCurrency(invoice.tax_pis || 0)} />
            </div>
            <div className="bg-amber-50 p-6 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">TOTAL NF</p>
              <p className="text-3xl font-bold text-amber-700">{formatCurrency(invoice.total_value)}</p>
            </div>
          </div>

          {/* DADOS DE PAGAMENTO */}
          {(invoice.installments?.length > 0 || invoice.payments?.length > 0) && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="DADOS DE PAGAMENTO" />
              <div className="p-6 space-y-3">
                {invoice.installments && invoice.installments.length > 0 ? (
                  invoice.installments.map((inst, idx) => {
                    const paymentTypeMap = {
                      "01": "Dinheiro",
                      "02": "Cheque",
                      "03": "Cartão Crédito",
                      "04": "Cartão Débito",
                      "05": "Crediário",
                      "10": "Vale Alimentação",
                      "11": "Vale Refeição",
                      "12": "Duplicata",
                      "13": "Boleto Bancário",
                      "99": "Outro"
                    };
                    const paymentType = invoice.payments?.[0]?.payment_type || "13";
                    const paymentTypeStr = paymentTypeMap[paymentType] || "Boleto Bancário";

                    return (
                      <div key={idx} className="pb-3 border-b border-border last:border-b-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm">Parcela {String(inst.number || idx + 1).padStart(3, '0')}</p>
                          <p className="font-semibold text-sm">{formatCurrency(inst.value)}</p>
                        </div>
                        <div className="flex justify-between items-start">
                          <p className="text-xs text-muted-foreground">{inst.due_date ? format(new Date(inst.due_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                          <p className="text-xs text-muted-foreground">{paymentTypeStr}</p>
                        </div>
                      </div>
                    );
                  })
                ) : invoice.payments && invoice.payments.length > 0 ? (
                  invoice.payments.map((payment, idx) => {
                    const paymentTypeMap = {
                      "01": "Dinheiro",
                      "02": "Cheque",
                      "03": "Cartão Crédito",
                      "04": "Cartão Débito",
                      "05": "Crediário",
                      "10": "Vale Alimentação",
                      "11": "Vale Refeição",
                      "12": "Duplicata",
                      "13": "Boleto Bancário",
                      "99": "Outro"
                    };
                    const paymentTypeStr = paymentTypeMap[payment.payment_type] || "Boleto Bancário";

                    return (
                      <div key={idx} className="pb-3 border-b border-border last:border-b-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm">Pagamento {idx + 1}</p>
                          <p className="font-semibold text-sm">{formatCurrency(payment.value)}</p>
                        </div>
                        <div className="flex justify-between items-start">
                          <p className="text-xs text-muted-foreground">{invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p>
                          <p className="text-xs text-muted-foreground">{paymentTypeStr}</p>
                        </div>
                      </div>
                    );
                  })
                ) : null}
              </div>
            </div>
          )}

          {/* INFORMAÇÕES COMPLEMENTARES */}
          {invoice.additional_info && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="INFORMAÇÕES COMPLEMENTARES" />
              <div className="p-6">
                <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.additional_info}</p>
              </div>
            </div>
          )}

          {/* CHAVE DE ACESSO */}
          {invoice.access_key && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="CHAVE DE ACESSO" />
              <div className="p-6">
                <p className="font-mono text-sm break-all">{invoice.access_key}</p>
              </div>
            </div>
          )}

          {/* CANCELAMENTO */}
          {invoice.cancelled && (
            <div className="border rounded-lg overflow-hidden bg-red-50">
              <SectionHeader title="CANCELAMENTO" />
              <div className="space-y-0">
                <InfoField label="Status" value="Cancelada" />
                {invoice.cancellation_date && (
                  <InfoField label="Data do Cancelamento" value={invoice.cancellation_date ? format(new Date(invoice.cancellation_date), "dd/MM/yyyy", { locale: ptBR }) : "—"} />
                )}
                {invoice.cancellation_reason && (
                  <InfoField label="Motivo" value={invoice.cancellation_reason} />
                )}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}