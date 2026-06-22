import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useInvoices } from "@/hooks/useInvoices";

export default function Arquivadas({ embedded } = {}) {
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "all", sigv: "all", topcon: "all", boleto: "all", monthYear: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sortConfig, setSortConfig] = useState([
    { key: "branch_cnpj", direction: "asc" },
    { key: "issue_date", direction: "desc" }
  ]);

  const { data: invoices = [], isLoading } = useInvoices();

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => {
      // Notas arquivadas manualmente OU com os 3 botões marcados
      const allRecorded = inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;
      if (!inv.archived && !allRecorded) return false;

      const searchMatch =
        filters.search === "" ||
        inv.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.number?.includes(filters.search);

      const branchMatch = filters.branch === "all" || inv.branch_cnpj === filters.branch;

      let cancelledMatch = true;
      if (filters.cancelled === "ativas") cancelledMatch = !inv.cancelled;
      else if (filters.cancelled === "canceladas") cancelledMatch = inv.cancelled;

      const monthYearMatch = filters.monthYear === "all" || (inv.issue_date && (() => {
        const date = new Date(inv.issue_date + "T12:00:00");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}-${year}` === filters.monthYear;
      })());

      const liderBranchMatch = !allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj);

      return searchMatch && branchMatch && cancelledMatch && monthYearMatch && liderBranchMatch;
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
  }, [invoices, filters, sortConfig, allowedCnpjs]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        return prev.map((s) =>
          s.key === key ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" } : s
        );
      }
      return [{ key, direction: "asc" }, ...prev];
    });
  };

  if (isLoading || branchFilterLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const content = (
    <>
      <p className="text-slate-500 text-sm">
        Notas arquivadas (SIGV+TOPCON+BOLETO ou arquivadas manualmente) — {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? "s" : ""}
      </p>
      <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} showCancelledFilter={false} />
      <div className="bg-white rounded-xl shadow-lg border-0">
        <InvoiceTable
          invoices={filteredInvoices}
          branches={branches}
          onMarkReceived={() => {}}
          onViewDetails={setSelectedInvoice}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </div>
      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        branches={branches}
      />
    </>
  );

  if (embedded) return <div className="space-y-4">{content}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Arquivadas</h1>
          <p className="text-slate-500 mt-1">
            Notas arquivadas (SIGV+TOPCON+BOLETO ou arquivadas manualmente) — {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} showCancelledFilter={false} />
        <div className="bg-white rounded-xl shadow-lg border-0">
          <InvoiceTable
            invoices={filteredInvoices}
            branches={branches}
            onMarkReceived={() => {}}
            onViewDetails={setSelectedInvoice}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          branches={branches}
        />
      </div>
    </div>
  );
}