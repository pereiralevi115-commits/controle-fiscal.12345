import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import CellTooltip from "./CellTooltip";
import { formatCNPJ } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const SortableHeader = ({ label, sortKey, currentSort, onSort }) => (
  <button
    onClick={() => onSort(sortKey)}
    className="flex items-center gap-2 hover:text-foreground transition-colors"
  >
    {label}
    <span className="inline-block">
      {currentSort.key === sortKey ? (
        currentSort.direction === "asc" ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-30" />
      )}
    </span>
  </button>
);

export default function InvoiceTable({ invoices, branches, onMarkReceived, onViewDetails, sortConfig, onSort }) {
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
            <TableHead className="font-semibold">
              <SortableHeader label="Filial" sortKey="branch_cnpj" currentSort={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="font-semibold">
              <SortableHeader label="Fornecedor" sortKey="supplier_name" currentSort={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="font-semibold">
              <SortableHeader label="NF" sortKey="number" currentSort={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="font-semibold">
              <SortableHeader label="Emissão" sortKey="issue_date" currentSort={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="font-semibold">
              <SortableHeader label="Vencimento" sortKey="due_date" currentSort={sortConfig} onSort={onSort} />
            </TableHead>
            <TableHead className="font-semibold text-right">
              <div className="flex items-center justify-end gap-2">
                <SortableHeader label="Valor" sortKey="total_value" currentSort={sortConfig} onSort={onSort} />
              </div>
            </TableHead>
            <TableHead className="font-semibold">Produto</TableHead>
            <TableHead className="font-semibold">Informações Adicionais</TableHead>
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="group">
              <TableCell className="font-medium">{getBranchName(invoice.branch_cnpj)}</TableCell>
              <TableCell className="text-sm">{invoice.supplier_name}</TableCell>
              <TableCell className="font-medium">
                <div className="text-sm">
                  <p>{invoice.series ? `${invoice.series}/${invoice.number}` : invoice.number}</p>
                </div>
              </TableCell>
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
              <TableCell className="text-sm">
                {invoice.items && invoice.items.length > 0
                  ? invoice.items.map(item => item.description).join(", ")
                  : "—"}
              </TableCell>
              <TableCell className="text-sm">
                {invoice.additional_info || "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 h-7 px-3 text-xs font-medium">
                    SIGV
                  </Button>
                  <Button variant="outline" size="sm" className="border-violet-500 text-violet-600 hover:bg-violet-50 h-7 px-3 text-xs font-medium">
                    TOPCON
                  </Button>
                  <Button variant="outline" size="sm" className="border-amber-500 text-amber-600 hover:bg-amber-50 h-7 px-3 text-xs font-medium">
                    BOLETO
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onViewDetails(invoice)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}