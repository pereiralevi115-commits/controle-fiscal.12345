import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TablePagination from "@/components/documents/TablePagination";

const PAGE_SIZE = 50;
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { formatCNPJ } from "@/lib/formatters";
import InvoiceActionButtons from "@/components/invoices/InvoiceActionButtons";
import InvoiceNotesButton from "@/components/invoices/InvoiceNotesButton";
import InvoiceDeleteButton from "@/components/invoices/InvoiceDeleteButton";
import { TooltipProvider } from "@/components/ui/tooltip";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function DocumentSimpleTable({ documents, branches = [], emptyLabel, onViewDetails, showDescription = false, showTomador = false, showActionButtons = false, selectable = false, selectedIds = [], onToggleSelect, onToggleSelectAll, pagination, sortConfig = [], onSort }) {
  const getBranchName = (cnpj) => branches.find((b) => b.cnpj === cnpj)?.name || "—";
  const usingExternalPagination = !!pagination;

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (key) => {
    if (usingExternalPagination && onSort) {
      onSort(key);
      return;
    }
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedDocuments = useMemo(() => {
    if (usingExternalPagination) return documents || [];
    if (!documents || !sortKey) return documents || [];
    const getValue = (doc) => {
      switch (sortKey) {
        case "filial":
        case "branch_cnpj": return getBranchName(doc.branch_cnpj).toLowerCase();
        case "emitente":
        case "supplier_name": return (doc.supplier_name || "").toLowerCase();
        case "tomador":
        case "tomador_name": return (doc.tomador_name || doc.recipient_name || "").toLowerCase();
        case "numero":
        case "number": return parseInt(doc.number, 10) || 0;
        case "emissao":
        case "issue_date": return doc.issue_date || "";
        case "descricao":
        case "service_description": return (doc.service_description || "").toLowerCase();
        case "valor":
        case "total_value": return doc.total_value || 0;
        default: return "";
      }
    };
    return [...documents].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [documents, sortKey, sortDir, branches, usingExternalPagination]);

  const [page, setPage] = useState(0);
  const currentPage = usingExternalPagination ? pagination.page : page;
  const pageSize = usingExternalPagination ? pagination.pageSize : PAGE_SIZE;
  const total = usingExternalPagination ? pagination.total : sortedDocuments.length;
  const pageCount = Math.ceil(total / pageSize);

  useEffect(() => { if (!usingExternalPagination) setPage(0); }, [sortKey, sortDir, usingExternalPagination]);
  useEffect(() => {
    if (!usingExternalPagination && page > 0 && page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount, usingExternalPagination]);

  const pageDocuments = useMemo(
    () => usingExternalPagination ? sortedDocuments : sortedDocuments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [sortedDocuments, page, usingExternalPagination]
  );

  const SortIcon = ({ column }) => {
    const activeSort = usingExternalPagination
      ? sortConfig.find((s) => s.key === column)
      : (sortKey === column ? { direction: sortDir } : null);
    if (!activeSort) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return activeSort.direction === "asc"
      ? <ArrowUp className="w-3.5 h-3.5" />
      : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const SortableHead = ({ column, label, align = "left" }) => (
    <TableHead className={`font-semibold ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => handleSort(column)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${align === "right" ? "ml-auto" : ""}`}
      >
        {label}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">{emptyLabel || "Nenhum documento encontrado"}</p>
        <p className="text-sm mt-1">Importe arquivos XML para começar</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={pageDocuments.length > 0 && pageDocuments.every((d) => selectedIds.includes(d.id))}
                  onCheckedChange={(checked) => onToggleSelectAll?.(checked, pageDocuments)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            <SortableHead column="branch_cnpj" label="Filial" />
            <SortableHead column="supplier_name" label="Emitente" />
            {showTomador && <SortableHead column="tomador_name" label="Tomador" />}
            <SortableHead column="number" label="Número" />
            <SortableHead column="issue_date" label="Emissão" />
            {showDescription && <SortableHead column="service_description" label="Descrição / Observações" />}
            <SortableHead column="total_value" label="Valor" align="right" />
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageDocuments.map((doc) => (
            <TableRow key={doc.id} className={doc.cancelled ? "bg-red-50" : (selectedIds.includes(doc.id) ? "bg-blue-50" : "")}>
              {selectable && (
                <TableCell className="w-10">
                  <Checkbox
                    checked={selectedIds.includes(doc.id)}
                    onCheckedChange={() => onToggleSelect?.(doc.id)}
                    aria-label="Selecionar nota"
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{getBranchName(doc.branch_cnpj)}</TableCell>
              <TableCell className="text-sm">
                <div>{doc.supplier_name}</div>
                <div className="text-xs text-muted-foreground">{formatCNPJ(doc.supplier_cnpj)}</div>
              </TableCell>
              {showTomador && (
                <TableCell className="text-sm">
                  <div>{doc.tomador_name || doc.recipient_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{formatCNPJ(doc.tomador_cnpj || doc.recipient_cnpj)}</div>
                </TableCell>
              )}
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
                  <InvoiceNotesButton invoice={doc} />
                  <InvoiceDeleteButton invoice={doc} />
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
      <TablePagination
        page={currentPage}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPageChange={usingExternalPagination ? pagination.onPageChange : setPage}
      />
    </div>
    </TooltipProvider>
  );
}