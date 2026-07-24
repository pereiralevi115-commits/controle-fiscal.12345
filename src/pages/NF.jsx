import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import NFSeDetailDialog from "@/components/invoices/NFSeDetailDialog";
import NFReport from "@/components/reports/NFReport";
import NFSeReport from "@/components/reports/NFSeReport";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function NF() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();

  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState("nfe");
  const [sortConfig, setSortConfig] = useState([
    { key: "issue_date", direction: "desc" }
  ]);

  // NFS-e tab state
  const [nfseFilters, setNfseFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all" });
  const [selectedNfse, setSelectedNfse] = useState(null);
  const [selectedNfseIds, setSelectedNfseIds] = useState([]);
  const [nfseSortConfig, setNfseSortConfig] = useState([
    { key: "issue_date", direction: "desc" }
  ]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);
  const toggleSelectNfse = (id) =>
    setSelectedNfseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAllNfse = (checked, docs) =>
    setSelectedNfseIds(checked ? docs.map((d) => d.id) : []);

  const { data: invoices = [], isLoading } = useInvoices();
  const { data: nfseDocuments = [], isLoading: isLoadingNfse } = useInvoices("nfse");

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

  const sortInvoices = (list, config) => {
    return [...list].sort((a, b) => {
      for (let cfg of config) {
        const aValue = a[cfg.key];
        const bValue = b[cfg.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        let comparison = typeof aValue === "string" ? aValue.localeCompare(bValue) : aValue - bValue;
        if (comparison !== 0) return cfg.direction === "asc" ? comparison : -comparison;
      }
      return 0;
    });
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter((inv) => {
      const searchMatch =
        filters.search === "" ||
        inv.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.number?.includes(filters.search);
      const statusMatch = filters.status === "all" || inv.status === filters.status;
      const branchMatch = filters.branch === "all" || inv.branch_cnpj === filters.branch;

      let cancelledMatch = true;
      if (filters.cancelled === "ativas") {
        cancelledMatch = !inv.cancelled;
      } else if (filters.cancelled === "canceladas") {
        cancelledMatch = inv.cancelled;
      }

      const supplier = suppliers.find((s) => s.cnpj === inv.supplier_cnpj);
      const supplierNotHidden = !supplier || !supplier.hidden;
      const supplierInScope = !supplier || (
        !supplier.materia_prima && (
          !supplier.gestao_compras && !supplier.gestao_frota && !supplier.controladoria
            ? true
            : supplier.gestao_compras || supplier.gestao_frota || supplier.controladoria
        )
      );

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
      return searchMatch && statusMatch && branchMatch && cancelledMatch && supplierNotHidden && supplierInScope && sigvMatch && topconMatch && boletoMatch && monthYearMatch && liderBranchMatch && notArchived && notCompleted;
    });

    return sortInvoices(filtered, sortConfig);
  }, [invoices, filters, sortConfig, suppliers, allowedCnpjs]);

  const filteredNfse = useMemo(() => {
    let filtered = nfseDocuments.filter((inv) => {
      const allRecorded = inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;
      if (inv.archived || allRecorded) return false;

      const searchMatch =
        nfseFilters.search === "" ||
        inv.supplier_name?.toLowerCase().includes(nfseFilters.search.toLowerCase()) ||
        inv.number?.includes(nfseFilters.search);
      const branchMatch = nfseFilters.branch === "all" || inv.branch_cnpj === nfseFilters.branch;

      let cancelledMatch = true;
      if (nfseFilters.cancelled === "ativas") cancelledMatch = !inv.cancelled;
      else if (nfseFilters.cancelled === "canceladas") cancelledMatch = inv.cancelled;

      const sigvMatch = nfseFilters.sigv === "all" || (nfseFilters.sigv === "sim" ? inv.sigv_recorded : !inv.sigv_recorded);
      const topconMatch = nfseFilters.topcon === "all" || (nfseFilters.topcon === "sim" ? inv.topcon_recorded : !inv.topcon_recorded);
      const boletoMatch = nfseFilters.boleto === "all" || (nfseFilters.boleto === "sim" ? inv.boleto_recorded : !inv.boleto_recorded);

      const monthYearMatch = nfseFilters.monthYear === "all" || (inv.issue_date && (() => {
        const date = new Date(inv.issue_date + "T12:00:00");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}-${year}` === nfseFilters.monthYear;
      })());
      const liderBranchMatch = !allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj);

      return searchMatch && branchMatch && cancelledMatch && sigvMatch && topconMatch && boletoMatch && monthYearMatch && liderBranchMatch;
    });

    return sortInvoices(filtered, nfseSortConfig);
  }, [nfseDocuments, nfseFilters, nfseSortConfig, allowedCnpjs]);

  const cycleSort = (prev, key) => {
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
  };

  const handleSort = (key) => setSortConfig((prev) => cycleSort(prev, key));
  const handleNfseSort = (key) => setNfseSortConfig((prev) => cycleSort(prev, key));

  if (isLoading || isLoadingNfse || branchFilterLoading) {
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
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Notas Fiscais</h1>
          </div>
          <Button onClick={() => setShowReport(true)} className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="nfe">NF-e ({filteredInvoices.length})</TabsTrigger>
            <TabsTrigger value="nfse">NFS-e ({filteredNfse.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="nfe" className="space-y-6">
            <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} invoices={invoices} showCancelledFilter={true} />
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
          </TabsContent>

          <TabsContent value="nfse" className="space-y-6">
            <InvoiceFilters filters={nfseFilters} onFilterChange={setNfseFilters} branches={branches} invoices={nfseDocuments} showCancelledFilter={true} />
            <BatchDeleteBar selectedIds={selectedNfseIds} onClear={() => setSelectedNfseIds([])} />
            <div className="bg-white rounded-xl shadow-lg border-0">
              <InvoiceTable
                invoices={filteredNfse}
                branches={branches}
                onMarkReceived={() => {}}
                onViewDetails={setSelectedNfse}
                sortConfig={nfseSortConfig}
                onSort={handleNfseSort}
                selectable={isAdmin}
                selectedIds={selectedNfseIds}
                onToggleSelect={toggleSelectNfse}
                onToggleSelectAll={toggleSelectAllNfse}
                isService={true}
              />
            </div>
          </TabsContent>
        </Tabs>

        <InvoiceDetailDialog
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkReceived={(inv) => markReceivedMutation.mutate(inv)}
          branches={branches}
        />

        <NFSeDetailDialog
          invoice={selectedNfse}
          open={!!selectedNfse}
          onClose={() => setSelectedNfse(null)}
          branches={branches}
        />

        {activeTab === "nfse" ? (
          <NFSeReport
            open={showReport}
            onClose={() => setShowReport(false)}
            invoices={filteredNfse}
            branches={branches}
          />
        ) : (
          <NFReport
            open={showReport}
            onClose={() => setShowReport(false)}
            invoices={filteredInvoices}
            branches={branches}
          />
        )}
      </div>
    </div>
  );
}