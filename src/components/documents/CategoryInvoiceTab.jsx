import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import NFSeDetailDialog from "@/components/invoices/NFSeDetailDialog";
import { usePaginatedInvoices } from "@/hooks/usePaginatedInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function CategoryInvoiceTab({ documentType = "nfe", supplierFlag, branches = [], onItemsChange, extraFilters = {}, showCancelledFilter = true }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    branch: "all",
    cancelled: "ativas",
    sigv: "all",
    topcon: "all",
    boleto: "all",
    monthYear: "all",
    ...extraFilters,
    categoryFlag: supplierFlag,
  });
  const [sortConfig, setSortConfig] = useState([{ key: "issue_date", direction: "desc" }]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: pageData, isLoading } = usePaginatedInvoices({ documentType, filters, sortConfig, page });
  const documents = pageData?.items || [];
  const total = pageData?.total || 0;
  const pageSize = pageData?.pageSize || 50;
  const availableMonths = pageData?.availableMonths || [];

  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [filters, sortConfig]);

  useEffect(() => {
    onItemsChange?.(documents);
  }, [documents, onItemsChange]);

  const markReceivedMutation = useMutation({
    mutationFn: (invoice) =>
      base44.entities.Invoice.update(invoice.id, {
        status: "recebida",
        received_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoicePage"] });
      setSelected(null);
      toast.success("Nota marcada como recebida!");
    },
  });

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      let next;
      if (!existing) next = [{ key, direction: "asc" }, ...prev];
      else if (existing.direction === "asc") next = prev.map((s) => (s.key === key ? { ...s, direction: "desc" } : s));
      else next = prev.filter((s) => s.key !== key);
      return next.length === 0 && key !== "issue_date" ? [{ key: "issue_date", direction: "desc" }] : next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[45vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const DetailDialog = documentType === "nfse" ? NFSeDetailDialog : InvoiceDetailDialog;

  return (
    <div className="space-y-6">
      <p className="text-slate-500">
        {total} nota{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
      </p>

      <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={documents} availableMonths={availableMonths} showCancelledFilter={showCancelledFilter} />

      <BatchDeleteBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

      <div className="bg-white rounded-xl shadow-lg border-0">
        <InvoiceTable
          invoices={documents}
          branches={branches}
          onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
          onViewDetails={setSelected}
          sortConfig={sortConfig}
          onSort={handleSort}
          selectable={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          isService={documentType === "nfse"}
          pagination={{ page, pageSize, total, onPageChange: setPage }}
        />
      </div>

      <DetailDialog
        invoice={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
        branches={branches}
      />
    </div>
  );
}