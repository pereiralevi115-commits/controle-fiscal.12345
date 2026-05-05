import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function InvoiceDetailDialog({ invoice, open, onClose, onMarkReceived, branchName }) {
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            NF-e #{invoice.number}
            <InvoiceStatusBadge status={invoice.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Fornecedor</p>
            <p className="font-medium mt-1">{invoice.supplier_name}</p>
            <p className="text-sm text-muted-foreground font-mono">{invoice.supplier_cnpj}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Destinatário</p>
            <p className="font-medium mt-1">{invoice.recipient_name || "—"}</p>
            <p className="text-sm text-muted-foreground font-mono">{invoice.recipient_cnpj || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Filial</p>
            <p className="font-medium mt-1">{branchName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Emissão</p>
            <p className="font-medium mt-1">
              {invoice.issue_date
                ? format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Série</p>
            <p className="font-medium mt-1">{invoice.series || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</p>
            <p className="font-bold text-lg mt-1">{formatCurrency(invoice.total_value)}</p>
          </div>
        </div>

        {invoice.access_key && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Chave de Acesso</p>
            <p className="text-xs font-mono mt-1 break-all bg-muted p-2 rounded-lg">{invoice.access_key}</p>
          </div>
        )}

        {invoice.items && invoice.items.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Itens ({invoice.items.length})</p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs text-right">Qtd</TableHead>
                    <TableHead className="text-xs text-right">Vlr Unit.</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">{item.description}</TableCell>
                      <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatCurrency(item.unit_value)}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {invoice.status === "pendente" && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => onMarkReceived(invoice)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar como Recebida
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}