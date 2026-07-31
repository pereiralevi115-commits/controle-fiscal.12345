import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { usePaginatedInvoices } from "@/hooks/usePaginatedInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function Invoices() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { isLoading: branchFilterLoading } = useBranchFilter();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState([{ key: "issue_date", direction: "desc" }]);

  const { data: pageData, isLoading } = usePaginatedInvoices({
    documentType: "nfe",
    filters,
    sortConfig,
    page,
    enabled: !branchFilterLoading,
  });

  const invoices = pageData?.items || [];
  const total = pageData?.total || 0;
  const pageSize = pageData?.pageSize || 50;
  const availableMonths = pageData?.availableMonths || [];

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [filters, sortConfig]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);

  const markReceivedMutation = useMutation({
    mutationFn: (invoice) =>
      base44.entities.Invoice.update(invoice.id, {
        status: "recebida",
        received_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoicePage"] });
      setSelectedInvoice(null);
      toast.success("Nota marcada como recebida!");
    },
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      let next;
      if (!existing) next = [{ key, direction: "asc" }, ...prev];
      else if (existing.direction === "asc") next = prev.map((s) => s.key === key ? { ...s, direction: "desc" } : s);
      else next = prev.filter((s) => s.key !== key);
      return next.length === 0 && key !== "issue_date" ? [{ key: "issue_date", direction: "desc" }] : next;
    });
  };

  if (isLoading || branchFilterLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">NF-e</h1>
          <p className="text-slate-500 mt-1">
            {total} nota{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </p>
        </div>

        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} availableMonths={availableMonths} showCancelledFilter />

        <BatchDeleteBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

        <div className="bg-white rounded-xl shadow-lg border-0">
          <InvoiceTable
            invoices={invoices}
            branches={branches}
            onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
            onViewDetails={setSelectedInvoice}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectable={isAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            pagination={{ page, pageSize, total, onPageChange: setPage }}
          />
        </div>

        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
          branches={branches}
        />
      </div>
    </div>
  );
}