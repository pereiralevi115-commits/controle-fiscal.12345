import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { formatCNPJ } from "@/lib/formatters";
import InvoiceActionButtons from "@/components/invoices/InvoiceActionButtons";
import InvoiceNotesButton from "@/components/invoices/InvoiceNotesButton";
import InvoiceDeleteButton from "@/components/invoices/InvoiceDeleteButton";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function DocumentSimpleTable({ documents, branches = [], emptyLabel, onViewDetails, showDescription = false, showActionButtons = false }) {
  const getBranchName = (cnpj) => branches.find((b) => b.cnpj === cnpj)?.name || "—";

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedDocuments = useMemo(() => {
    if (!documents || !sortKey) return documents || [];
    const getValue = (doc) => {
      switch (sortKey) {
        case "filial": return getBranchName(doc.branch_cnpj).toLowerCase();
        case "emitente": return (doc.supplier_name || "").toLowerCase();
        case "numero": return parseInt(doc.number, 10) || 0;
        case "emissao": return doc.issue_date || "";
        case "descricao": return (doc.service_description || "").toLowerCase();
        case "valor": return doc.total_value || 0;
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
  }, [documents, sortKey, sortDir, branches]);

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "asc"
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead column="filial" label="Filial" />
            <SortableHead column="emitente" label="Emitente" />
            <SortableHead column="numero" label="Número" />
            <SortableHead column="emissao" label="Emissão" />
            {showDescription && <SortableHead column="descricao" label="Descrição / Observações" />}
            <SortableHead column="valor" label="Valor" align="right" />
            <TableHead className="font-semibold text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedDocuments.map((doc) => (
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
    </div>
  );
}