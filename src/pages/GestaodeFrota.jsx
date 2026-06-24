import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import DocumentDetailDialog from "@/components/invoices/DocumentDetailDialog";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function GestaodeFrota() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { allowedCnpjs } = useBranchFilter();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all", docType: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);
  const [sortConfig, setSortConfig] = useState([
    { key: "branch_cnpj", direction: "asc" },
    { key: "issue_date", direction: "desc" }
  ]);

  const { data: invoices = [], isLoading } = useInvoices(["nfe", "nfse"]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const markReceivedMutation = useMutation({
    mutationFn: (invoice) =>
      base44.entities.Invoice.update(invoice.id, {
        status: "recebida",
        received_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedInvoice(null);
      toast.success("Nota marcada como recebida!");
    },
  });

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => {
      const searchMatch =
        filters.search === "" ||
        inv.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.number?.includes(filters.search);
      const statusMatch = filters.status === "all" || inv.status === filters.status;
      const branchMatch = filters.branch === "all" || inv.branch_cnpj === filters.branch;
      const docTypeMatch = !filters.docType || filters.docType === "all" || (inv.document_type || "nfe") === filters.docType;
      let cancelledMatch = true;
      if (filters.cancelled === "ativas") cancelledMatch = !inv.cancelled;
      else if (filters.cancelled === "canceladas") cancelledMatch = inv.cancelled;
      const supplier = suppliers.find((s) => s.cnpj === inv.supplier_cnpj);
      const supplierNotHidden = supplier && supplier.gestao_frota === true;
      const sigvMatch = filters.sigv === "all" || (filters.sigv === "sim" ? inv.sigv_recorded : !inv.sigv_recorded);
      const topconMatch = filters.topcon === "all" || (filters.topcon === "sim" ? inv.topcon_recorded : !inv.topcon_recorded);
      const boletoMatch = filters.boleto === "all" || (filters.boleto === "sim" ? inv.boleto_recorded : !inv.boleto_recorded);
      const monthYearMatch = filters.monthYear === "all" || (inv.issue_date && (() => {
        const date = new Date(inv.issue_date + "T12:00:00");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}-${year}` === filters.monthYear;
      })());
      const liderBranchMatch = !allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj);
      const notArchived = !inv.archived;
      const notCompleted = !(inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded);
      return searchMatch && statusMatch && branchMatch && docTypeMatch && cancelledMatch && supplierNotHidden && sigvMatch && topconMatch && boletoMatch && monthYearMatch && liderBranchMatch && notArchived && notCompleted;
    });

    filtered.sort((a, b) => {
      for (let config of sortConfig) {
        const aValue = a[config.key];
        const bValue = b[config.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        let comparison = typeof aValue === "string" ? aValue.localeCompare(bValue) : aValue - bValue;
        if (comparison !== 0) return config.direction === "asc" ? comparison : -comparison;
      }
      return 0;
    });

    return filtered;
  }, [invoices, filters, sortConfig, suppliers, allowedCnpjs]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) return prev.map((s) => s.key === key ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" } : s);
      return [{ key, direction: "asc" }, ...prev];
    });
  };

  if (isLoading) {
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
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Gestão de Frota</h1>
          <p className="text-slate-500 mt-1">
            {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? "s" : ""} encontrada{filteredInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>

        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} showCancelledFilter={true} showTypeFilter={true} />

        <BatchDeleteBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

        <div className="bg-white rounded-xl shadow-lg border-0">
          <InvoiceTable
            invoices={filteredInvoices}
            branches={branches}
            onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
            onViewDetails={setSelectedInvoice}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectable={isAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        </div>

        <DocumentDetailDialog
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