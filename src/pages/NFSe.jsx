import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText } from "lucide-react";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import NFSeDetailDialog from "@/components/invoices/NFSeDetailDialog";
import NFSeReport from "@/components/reports/NFSeReport";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function NFSe() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all" });
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReport, setShowReport] = useState(false);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);
  const [sortConfig, setSortConfig] = useState([
    { key: "issue_date", direction: "desc" }
  ]);

  const { data: documents = [], isLoading } = useInvoices("nfse");

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  // CNPJs de fornecedores que já têm categoria de gestão atribuída — suas notas
  // aparecem apenas na aba específica, não na NFS-e geral.
  const managedCnpjs = useMemo(
    () =>
      new Set(
        suppliers
          .filter((s) => s.gestao_frota || s.gestao_compras || s.controladoria)
          .map((s) => s.cnpj)
      ),
    [suppliers]
  );

  const filteredInvoices = useMemo(() => {
    let filtered = documents.filter((inv) => {
      // Esconde notas já arquivadas (manualmente ou com SIGV+TOPCON+BOLETO marcados)
      const allRecorded = inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;
      if (inv.archived || allRecorded) return false;

      // Esconde fornecedores que já têm categoria de gestão (aparecem só na aba específica)
      if (managedCnpjs.has(inv.supplier_cnpj)) return false;

      const searchMatch =
        filters.search === "" ||
        inv.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.number?.includes(filters.search);
      const branchMatch = filters.branch === "all" || inv.branch_cnpj === filters.branch;

      let cancelledMatch = true;
      if (filters.cancelled === "ativas") cancelledMatch = !inv.cancelled;
      else if (filters.cancelled === "canceladas") cancelledMatch = inv.cancelled;

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

      return searchMatch && branchMatch && cancelledMatch && sigvMatch && topconMatch && boletoMatch && monthYearMatch && liderBranchMatch;
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
  }, [documents, filters, sortConfig, allowedCnpjs, managedCnpjs]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      let next;
      if (!existing) {
        next = [{ key, direction: "asc" }, ...prev];
      } else if (existing.direction === "asc") {
        next = prev.map((s) => (s.key === key ? { ...s, direction: "desc" } : s));
      } else {
        next = prev.filter((s) => s.key !== key);
      }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <FileText className="w-8 h-8 text-slate-600" />
              NFS-e
            </h1>
            <p className="text-slate-500 mt-1">
              {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? "s" : ""} de serviço
            </p>
          </div>
          <Button onClick={() => setShowReport(true)} className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>

        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={documents} showCancelledFilter={true} />

        <BatchDeleteBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

        <div className="bg-white rounded-xl shadow-lg border-0">
          <InvoiceTable
            invoices={filteredInvoices}
            branches={branches}
            onMarkReceived={() => {}}
            onViewDetails={setSelected}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectable={isAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            isService={true}
          />
        </div>

        <NFSeDetailDialog
          invoice={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          branches={branches}
        />

        <NFSeReport
          open={showReport}
          onClose={() => setShowReport(false)}
          invoices={filteredInvoices}
          branches={branches}
        />
      </div>
    </div>
  );
}