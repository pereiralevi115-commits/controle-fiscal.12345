import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import { useBranchFilter } from "@/hooks/useBranchFilter";

export default function Invoices() {
  const queryClient = useQueryClient();
  const { allowedCnpjs } = useBranchFilter();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", month: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sortConfig, setSortConfig] = useState([
    { key: "branch_cnpj", direction: "asc" },
    { key: "issue_date", direction: "desc" }
  ]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 500),
  });

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
      
      // Filter by cancellation status
      let cancelledMatch = true;
      if (filters.cancelled === "ativas") {
        cancelledMatch = !inv.cancelled;
      } else if (filters.cancelled === "canceladas") {
        cancelledMatch = inv.cancelled;
      }
      
      // Filter out invoices from hidden suppliers and show only suppliers with NO category
      const supplier = suppliers.find((s) => s.cnpj === inv.supplier_cnpj);
      const supplierNotHidden = !supplier || !supplier.hidden;
      const supplierHasNoCategory = !supplier || (!supplier.materia_prima && !supplier.gestao_compras && !supplier.gestao_frota && !supplier.controladoria);
      
      const sigvMatch = filters.sigv === "all" || (filters.sigv === "sim" ? inv.sigv_recorded : !inv.sigv_recorded);
      const topconMatch = filters.topcon === "all" || (filters.topcon === "sim" ? inv.topcon_recorded : !inv.topcon_recorded);
      const boletoMatch = filters.boleto === "all" || (filters.boleto === "sim" ? inv.boleto_recorded : !inv.boleto_recorded);
      const monthMatch = filters.month === "all" || (inv.issue_date && new Date(inv.issue_date).getMonth() + 1 === parseInt(filters.month));

      const liderBranchMatch = !allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj);
      const notArchived = !inv.archived && !(inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded);
      return searchMatch && statusMatch && branchMatch && cancelledMatch && supplierNotHidden && supplierHasNoCategory && sigvMatch && topconMatch && boletoMatch && monthMatch && liderBranchMatch && notArchived;
    });

    // Sort by multiple criteria
    filtered.sort((a, b) => {
      for (let config of sortConfig) {
        const aValue = a[config.key];
        const bValue = b[config.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === "string") {
          comparison = aValue.localeCompare(bValue);
        } else {
          comparison = aValue - bValue;
        }

        if (comparison !== 0) {
          return config.direction === "asc" ? comparison : -comparison;
        }
      }
      return 0;
    });

    return filtered;
  }, [invoices, filters, sortConfig, suppliers, allowedCnpjs]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        return prev.map((s) =>
          s.key === key
            ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" }
            : s
        );
      }
      return [{ key, direction: "asc" }, ...prev];
    });
  };

  const getBranchName = (cnpj) => branches.find((b) => b.cnpj === cnpj)?.name || "—";

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
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Notas Fiscais</h1>
          <p className="text-slate-500 mt-1">
            {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? "s" : ""} encontrada{filteredInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>

        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} showCancelledFilter={true} />

        <div className="bg-white rounded-xl shadow-lg border-0">
        <InvoiceTable
          invoices={filteredInvoices}
          branches={branches}
          onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
          onViewDetails={setSelectedInvoice}
          sortConfig={sortConfig}
          onSort={handleSort}
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