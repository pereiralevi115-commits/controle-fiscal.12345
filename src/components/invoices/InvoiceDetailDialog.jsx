import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";
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
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b border-border p-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">NF-e #{invoice.number} <span className="text-lg font-normal">(Série {invoice.series || "—"})</span></h2>
            <p className="text-muted-foreground text-sm mt-1">{invoice.supplier_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
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
              <InfoField label="INSCRIÇÃO ESTADUAL" value="—" />
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
              <InfoField label="VALOR PRODUTOS" value={formatCurrency(invoice.total_value)} />
              <InfoField label="VALOR ICMS" value={formatCurrency(0)} />
              <InfoField label="VALOR IPI" value={formatCurrency(0)} />
              <InfoField label="VALOR PIS" value={formatCurrency(0)} />
            </div>
            <div className="bg-amber-50 p-6 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">TOTAL NF</p>
              <p className="text-3xl font-bold text-amber-700">{formatCurrency(invoice.total_value)}</p>
            </div>
          </div>

          {/* CHAVE DE ACESSO */}
          {invoice.access_key && (
            <div className="border rounded-lg overflow-hidden">
              <SectionHeader title="CHAVE DE ACESSO" />
              <div className="p-6">
                <p className="font-mono text-sm break-all">{invoice.access_key}</p>
              </div>
            </div>
          )}

          {/* AÇÃO */}
          {invoice.status === "pendente" && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => onMarkReceived(invoice)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                size="lg"
              >
                <CheckCircle2 className="w-5 h-5" />
                Marcar como Recebida
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}