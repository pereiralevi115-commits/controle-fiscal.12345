import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import TablePagination from "@/components/documents/TablePagination";
import { usePaginatedInvoices } from "@/hooks/usePaginatedInvoices";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatCancellationActor = (invoice) => {
  if (invoice.cancelled_by_name) return invoice.cancelled_by_name;
  if (invoice.cancelled_at) return "Usuário não identificado";
  return "Registro antigo";
};

export default function CancelledInvoiceTab({ documentType = "nfe", branches = [] }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    branch: "all",
    cancelled: "canceladas",
    sigv: "all",
    topcon: "all",
    boleto: "all",
    monthYear: "all",
    includeAllSuppliers: true,
  });
  const [sortConfig] = useState([{ key: "issue_date", direction: "desc" }]);

  const { data: pageData, isLoading } = usePaginatedInvoices({ documentType, filters, sortConfig, page });
  const documents = pageData?.items || [];
  const total = pageData?.total || 0;
  const pageSize = pageData?.pageSize || 50;
  const availableMonths = pageData?.availableMonths || [];

  const branchMap = useMemo(() => {
    const map = {};
    branches.forEach((branch) => { map[branch.cnpj] = branch.name; });
    return map;
  }, [branches]);

  const undoMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.update(id, {
      cancelled: false,
      cancellation_date: null,
      cancelled_by_id: "",
      cancelled_by_name: "",
      cancelled_at: "",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoicePage"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      toast.success("Cancelamento desfeito!");
    },
  });

  const handleFilterChange = (next) => {
    setPage(0);
    setFilters(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[45vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-500">
        {total} nota{total !== 1 ? "s" : ""} cancelada{total !== 1 ? "s" : ""}
      </p>

      <InvoiceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        branches={branches}
        invoices={documents}
        availableMonths={availableMonths}
        showCancelledFilter={false}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <XCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma nota cancelada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Filial</TableHead>
                  <TableHead className="font-semibold">Fornecedor</TableHead>
                  <TableHead className="font-semibold">NF</TableHead>
                  <TableHead className="font-semibold">Emissão</TableHead>
                  <TableHead className="font-semibold">Cancelamento</TableHead>
                  <TableHead className="font-semibold">Cancelado por</TableHead>
                  {documentType === "nfse" && <TableHead className="font-semibold">Descrição / Observações</TableHead>}
                  <TableHead className="font-semibold text-right">Valor</TableHead>
                  <TableHead className="font-semibold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((inv) => (
                  <TableRow key={inv.id} className="bg-red-50/40">
                    <TableCell className="font-medium">{branchMap[inv.branch_cnpj] || "—"}</TableCell>
                    <TableCell className="text-sm">{inv.supplier_name}</TableCell>
                    <TableCell className="font-medium text-sm">
                      {inv.series ? `${inv.series}/` : ""}{inv.number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {inv.issue_date ? format(new Date(inv.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-red-600 font-medium">
                      {inv.cancellation_date ? format(new Date(inv.cancellation_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 font-medium">
                      <div>{formatCancellationActor(inv)}</div>
                      {inv.cancelled_at && (
                        <div className="text-xs text-slate-400 font-normal">
                          {format(new Date(inv.cancelled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                    {documentType === "nfse" && (
                      <TableCell className="text-sm text-slate-600 max-w-md">
                        <span className="line-clamp-2 whitespace-pre-wrap">{inv.service_description || "—"}</span>
                      </TableCell>
                    )}
                    <TableCell className="text-right font-semibold">{formatCurrency(inv.total_value)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => undoMutation.mutate(inv.id)}
                        disabled={undoMutation.isPending}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 hover:bg-blue-50 rounded px-2 py-1 transition-all"
                      >
                        Desfazer
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              pageCount={Math.ceil(total / pageSize)}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}