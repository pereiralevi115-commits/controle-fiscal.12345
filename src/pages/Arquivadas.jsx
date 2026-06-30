import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function Arquivadas({ embedded } = {}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "all", sigv: "all", topcon: "all", boleto: "all", monthYear: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedNfseIds, setSelectedNfseIds] = useState([]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);
  const toggleSelectNfse = (id) =>
    setSelectedNfseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAllNfse = (checked, docs) =>
    setSelectedNfseIds(checked ? docs.map((d) => d.id) : []);
  const [sortConfig, setSortConfig] = useState([
    { key: "issue_date", direction: "desc" }
  ]);

  const { data: invoices = [], isLoading } = useInvoices(["nfe", "nfse"]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => {
      // Notas arquivadas manualmente OU com os 3 botões marcados, excluindo canceladas
      const allRecorded = inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;
      if (!inv.archived && !allRecorded) return false;
      if (inv.cancelled) return false;

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

  const nfeArquivadas = useMemo(
    () => filteredInvoices.filter((inv) => (inv.document_type || "nfe") === "nfe"),
    [filteredInvoices]
  );
  const nfseArquivadas = useMemo(
    () => filteredInvoices.filter((inv) => inv.document_type === "nfse"),
    [filteredInvoices]
  );

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

  const tabs = (
    <Tabs defaultValue="nfe" className="space-y-6">
      <TabsList>
        <TabsTrigger value="nfe">NF-e</TabsTrigger>
        <TabsTrigger value="nfse">NFS-e</TabsTrigger>
      </TabsList>

      <TabsContent value="nfe" className="space-y-6 mt-0">
        <p className="text-slate-500 text-sm">
          Notas arquivadas (SIGV+TOPCON+BOLETO ou arquivadas manualmente) — {nfeArquivadas.length} nota{nfeArquivadas.length !== 1 ? "s" : ""}
        </p>
        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} showCancelledFilter={false} />
        <BatchDeleteBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
        <div className="bg-white rounded-xl shadow-lg border-0">
          <InvoiceTable
            invoices={nfeArquivadas}
            branches={branches}
            onMarkReceived={() => {}}
            onViewDetails={setSelectedInvoice}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectable={isAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        </div>
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          branches={branches}
        />
      </TabsContent>

      <TabsContent value="nfse" className="space-y-6 mt-0">
        <p className="text-slate-500 text-sm">
          Notas de serviço arquivadas (SIGV+TOPCON+BOLETO ou arquivadas manualmente) — {nfseArquivadas.length} nota{nfseArquivadas.length !== 1 ? "s" : ""}
        </p>
        <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} showCancelledFilter={false} />
        <BatchDeleteBar selectedIds={selectedNfseIds} onClear={() => setSelectedNfseIds([])} />
        <div className="bg-white rounded-xl shadow-lg border-0">
          <InvoiceTable
            invoices={nfseArquivadas}
            branches={branches}
            onMarkReceived={() => {}}
            onViewDetails={setSelectedInvoice}
            sortConfig={sortConfig}
            onSort={handleSort}
            selectable={isAdmin}
            selectedIds={selectedNfseIds}
            onToggleSelect={toggleSelectNfse}
            onToggleSelectAll={toggleSelectAllNfse}
          />
        </div>
        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          branches={branches}
        />
      </TabsContent>
    </Tabs>
  );

  if (embedded) return <div className="space-y-4">{tabs}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Arquivadas</h1>
        </div>
        {tabs}
      </div>
    </div>
  );
}