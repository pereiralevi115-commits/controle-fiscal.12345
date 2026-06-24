import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { formatCNPJ } from "@/lib/formatters";
import InvoiceActionButtons from "@/components/invoices/InvoiceActionButtons";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function DocumentSimpleTable({ documents, branches = [], emptyLabel, onViewDetails, showDescription = false, showActionButtons = false }) {
  const getBranchName = (cnpj) => branches.find((b) => b.cnpj === cnpj)?.name || "—";

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">{emptyLabel || "Nenhum documento encontrado"}</p>
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
            <TableHead className="font-semibold">Emitente</TableHead>
            <TableHead className="font-semibold">Número</TableHead>
            <TableHead className="font-semibold">Emissão</TableHead>
            {showDescription && <TableHead className="font-semibold">Descrição / Observações</TableHead>}
            <TableHead className="font-semibold text-right">Valor</TableHead>
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} className={doc.cancelled ? "bg-red-50" : ""}>
              <TableCell className="font-medium">{getBranchName(doc.branch_cnpj)}</TableCell>
              <TableCell className="text-sm">
                <div>{doc.supplier_name}</div>
                <div className="text-xs text-muted-foreground">{formatCNPJ(doc.supplier_cnpj)}</div>
              </TableCell>
              <TableCell className="font-medium text-sm">
                {doc.series ? `${doc.series}/${doc.number}` : doc.number}
              </TableCell>
              <TableCell>
                {doc.issue_date
                  ? format(new Date(doc.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                  : "—"}
              </TableCell>
              {showDescription && (
                <TableCell className="text-sm text-slate-600 max-w-md">
                  <span className="line-clamp-2 whitespace-pre-wrap">{doc.service_description || "—"}</span>
                </TableCell>
              )}
              <TableCell className="text-right font-semibold">{formatCurrency(doc.total_value)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {showActionButtons && <InvoiceActionButtons invoiceId={doc.id} invoice={doc} />}
                  {onViewDetails && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetails(doc)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}