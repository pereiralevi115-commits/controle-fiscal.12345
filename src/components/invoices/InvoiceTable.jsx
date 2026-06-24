import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TablePagination from "@/components/documents/TablePagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import CellTooltip from "./CellTooltip";
import InvoiceTableTooltip from "./InvoiceTableTooltip";
import InvoiceActionButtons from "./InvoiceActionButtons";
import InvoiceNotesButton from "./InvoiceNotesButton";
import InvoiceDeleteButton from "./InvoiceDeleteButton";
import DueDateCell from "./DueDateCell";
import { formatCNPJ } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const SortableHeader = ({ label, sortKey, currentSort, onSort }) => {
  const sortConfig = currentSort.find((s) => s.key === sortKey);
  
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-2 hover:text-foreground transition-colors"
    >
      {label}
      <span className="inline-block">
        {sortConfig ? (
          sortConfig.direction === "asc" ? (
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
};

const PAGE_SIZE = 50;

export default function InvoiceTable({ invoices, branches, onMarkReceived, onViewDetails, sortConfig, onSort, selectable = false, selectedIds = [], onToggleSelect, onToggleSelectAll, isService = false }) {
  const [page, setPage] = useState(0);

  const pageCount = Math.ceil(invoices.length / PAGE_SIZE);

  // Volta para a primeira página quando o conjunto de notas muda (filtros, ordenação, etc.)
  useEffect(() => {
    setPage(0);
  }, [invoices.length, sortConfig]);

  // Garante que a página atual continue válida se a lista diminuir
  useEffect(() => {
    if (page > 0 && page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const pageInvoices = useMemo(
    () => invoices.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [invoices, page]
  );

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
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={pageInvoices.length > 0 && pageInvoices.every((inv) => selectedIds.includes(inv.id))}
                  onCheckedChange={(checked) => onToggleSelectAll?.(checked, pageInvoices)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
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
            <TableHead className="font-semibold">{isService ? "Serviço" : "Produto"}</TableHead>
            <TableHead className="font-semibold">Informações Adicionais</TableHead>
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageInvoices.map((invoice) => (
            <TableRow key={invoice.id} className={`group ${invoice.cancelled ? "bg-red-50" : (selectedIds.includes(invoice.id) ? "bg-blue-50" : "")}`}>
              {selectable && (
                <TableCell className="w-10">
                  <Checkbox
                    checked={selectedIds.includes(invoice.id)}
                    onCheckedChange={() => onToggleSelect?.(invoice.id)}
                    aria-label="Selecionar nota"
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                <InvoiceTableTooltip content={`Destinatário: ${invoice.recipient_name}\nCNPJ: ${formatCNPJ(invoice.recipient_cnpj)}`}>
                  <span>{getBranchName(invoice.branch_cnpj)}</span>
                </InvoiceTableTooltip>
              </TableCell>
              <TableCell className="text-sm">
                <InvoiceTableTooltip content={`Fornecedor: ${invoice.supplier_name}\nCNPJ: ${formatCNPJ(invoice.supplier_cnpj)}`}>
                  <span className="cursor-help">{invoice.supplier_name}</span>
                </InvoiceTableTooltip>
              </TableCell>
              <TableCell className="font-medium">
                <InvoiceTableTooltip content={`Série: ${invoice.series || "—"}\nNúmero: ${invoice.number}`}>
                  <div className="text-sm cursor-help">
                    <p>{invoice.series ? `${invoice.series}/${invoice.number}` : invoice.number}</p>
                  </div>
                </InvoiceTableTooltip>
              </TableCell>
              <TableCell>
                <InvoiceTableTooltip content={`Data de Emissão: ${invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR }) : "—"}`}>
                  <span className="cursor-help">
                    {invoice.issue_date
                      ? format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </span>
                </InvoiceTableTooltip>
              </TableCell>
              <TableCell>
                <DueDateCell invoice={invoice} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                <InvoiceTableTooltip content={`CÁLCULO DO IMPOSTO / TOTAIS\n\nVALOR PRODUTOS\n${formatCurrency(invoice.total_products || invoice.total_value)}\n\nVALOR ICMS\n${formatCurrency(invoice.tax_icms || 0)}\n\nVALOR IPI\n${formatCurrency(invoice.tax_ipi || 0)}\n\nVALOR PIS\n${formatCurrency(invoice.tax_pis || 0)}\n\nTOTAL NF\n${formatCurrency(invoice.total_value)}`}>
                  <span className="cursor-help">{formatCurrency(invoice.total_value)}</span>
                </InvoiceTableTooltip>
              </TableCell>
              <TableCell className="text-sm">
                {isService ? (
                  <InvoiceTableTooltip content={invoice.service_description || "—"}>
                    <span className="cursor-help">
                      {invoice.service_description
                        ? (invoice.service_description.length > 35
                          ? invoice.service_description.substring(0, 35) + "..."
                          : invoice.service_description)
                        : "—"}
                    </span>
                  </InvoiceTableTooltip>
                ) : (
                  <InvoiceTableTooltip content={invoice.items && invoice.items.length > 0 
                    ? `PRODUTOS\n\n${invoice.items.map(item => `• ${item.description}`).join("\n")}`
                    : "—"}>
                    <span className="cursor-help">
                      {invoice.items && invoice.items.length > 0
                        ? (invoice.items.map(item => item.description).join(", ").length > 35
                          ? invoice.items.map(item => item.description).join(", ").substring(0, 35) + "..."
                          : invoice.items.map(item => item.description).join(", "))
                        : "—"}
                    </span>
                  </InvoiceTableTooltip>
                )}
              </TableCell>
              <TableCell className="text-sm">
                <InvoiceTableTooltip content={invoice.additional_info || "—"}>
                  <span className="cursor-help">
                    {invoice.additional_info
                      ? (invoice.additional_info.length > 35
                        ? invoice.additional_info.substring(0, 35) + "..."
                        : invoice.additional_info)
                      : "—"}
                  </span>
                </InvoiceTableTooltip>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <InvoiceActionButtons invoiceId={invoice.id} invoice={invoice} />
                  <InvoiceNotesButton invoice={invoice} />
                  <InvoiceDeleteButton invoice={invoice} />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onViewDetails(invoice)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalhes</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        pageCount={pageCount}
        total={invoices.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}