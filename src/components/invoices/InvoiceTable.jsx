import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import InvoiceTooltip from "./InvoiceTooltip";
import { formatCNPJ } from "@/lib/formatters";

export default function InvoiceTable({ invoices, branches, onMarkReceived, onViewDetails }) {
  const getBranchName = (branchCnpj) => {
    const branch = branches.find((b) => b.cnpj === branchCnpj);
    return branch?.name || "—";
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Nenhuma nota fiscal encontrada</p>
        <p className="text-sm mt-1">Importe arquivos XML para começar</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Filial</TableHead>
            <TableHead className="font-semibold">Fornecedor / CNPJ</TableHead>
            <TableHead className="font-semibold">NF</TableHead>
            <TableHead className="font-semibold">Emissão</TableHead>
            <TableHead className="font-semibold">Vencimento</TableHead>
            <TableHead className="font-semibold text-right">Valor</TableHead>
            <TableHead className="font-semibold">Produto</TableHead>
            <TableHead className="font-semibold">Informações Adicionais</TableHead>
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
           <InvoiceTooltip key={invoice.id} invoice={invoice}>
             <TableRow className="group cursor-help">
               <TableCell className="font-medium">{getBranchName(invoice.branch_cnpj)}</TableCell>
               <TableCell>
                 <div className="max-w-[200px]">
                   <p className="font-medium text-sm truncate">{invoice.supplier_name}</p>
                   <p className="text-xs text-muted-foreground font-mono">{formatCNPJ(invoice.supplier_cnpj)}</p>
                 </div>
               </TableCell>
               <TableCell className="font-medium">{invoice.number}</TableCell>
               <TableCell>
                 {invoice.issue_date
                   ? format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR })
                   : "—"}
               </TableCell>
               <TableCell>
                 {invoice.due_date
                   ? format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })
                   : "—"}
               </TableCell>
               <TableCell className="text-right font-semibold">
                 {formatCurrency(invoice.total_value)}
               </TableCell>
               <TableCell className="text-sm max-w-[180px]">
                 {invoice.items && invoice.items.length > 0
                   ? invoice.items.map(item => item.description).join(", ")
                   : "—"}
               </TableCell>
               <TableCell>
                 <InvoiceStatusBadge status={invoice.status} />
               </TableCell>
               <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8"
                     onClick={() => onViewDetails(invoice)}
                   >
                     <Eye className="w-4 h-4" />
                   </Button>
                   {invoice.status === "pendente" && (
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                       onClick={() => onMarkReceived(invoice)}
                     >
                       <CheckCircle2 className="w-4 h-4" />
                     </Button>
                   )}
                 </div>
               </TableCell>
             </TableRow>
           </InvoiceTooltip>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}