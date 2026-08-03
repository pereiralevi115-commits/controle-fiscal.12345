import React, { useState } from "react";
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
import { usePaginatedInvoices } from "@/hooks/usePaginatedInvoices";
import { updateInvoiceInCaches } from "@/lib/invoiceCache";
import { useAuth } from "@/lib/AuthContext";

export default function NF() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();

  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all", includeManagementSuppliers: true });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState("nfe");
  const [sortConfig, setSortConfig] = useState([
    { key: "issue_date", direction: "desc" }
  ]);

  // NFS-e tab state
  const [nfseFilters, setNfseFilters] = useState({ search: "", status: "all", branch: "all", cancelled: "ativas", sigv: "all", topcon: "all", boleto: "all", monthYear: "all", includeManagementSuppliers: true });
  const [selectedNfse, setSelectedNfse] = useState(null);
  const [selectedNfseIds, setSelectedNfseIds] = useState([]);
  const [nfseSortConfig, setNfseSortConfig] = useState([
    { key: "issue_date", direction: "desc" }
  ]);
  const [nfePage, setNfePage] = useState(0);
  const [nfsePage, setNfsePage] = useState(0);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);
  const toggleSelectNfse = (id) =>
    setSelectedNfseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAllNfse = (checked, docs) =>
    setSelectedNfseIds(checked ? docs.map((d) => d.id) : []);

  const { data: nfeData = { items: [], total: 0, availableMonths: [], pageSize: 50 }, isLoading } = usePaginatedInvoices({
    documentType: "nfe",
    filters,
    sortConfig,
    page: nfePage,
    enabled: !branchFilterLoading,
  });
  const { data: nfseData = { items: [], total: 0, availableMonths: [], pageSize: 50 }, isLoading: isLoadingNfse } = usePaginatedInvoices({
    documentType: "nfse",
    filters: nfseFilters,
    sortConfig: nfseSortConfig,
    page: nfsePage,
    enabled: !branchFilterLoading,
  });
  const filteredInvoices = nfeData.items || [];
  const filteredNfse = nfseData.items || [];

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const markReceivedMutation = useMutation({
    mutationFn: (invoice) =>
      base44.entities.Invoice.update(invoice.id, {
        status: "recebida",
        received_date: new Date().toISOString().split("T")[0],
      }),
    onSuccess: (_result, invoice) => {
      updateInvoiceInCaches(queryClient, invoice.id, {
        status: "recebida",
        received_date: new Date().toISOString().split("T")[0],
      });
      setSelectedInvoice(null);
      toast.success("Nota marcada como recebida!");
    },
  });



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

  const handleSort = (key) => {
    setNfePage(0);
    setSortConfig((prev) => cycleSort(prev, key));
  };
  const handleNfseSort = (key) => {
    setNfsePage(0);
    setNfseSortConfig((prev) => cycleSort(prev, key));
  };
  const handleFiltersChange = (next) => {
    setNfePage(0);
    setFilters(next);
  };
  const handleNfseFiltersChange = (next) => {
    setNfsePage(0);
    setNfseFilters(next);
  };

  if ((activeTab === "nfe" && isLoading) || (activeTab === "nfse" && isLoadingNfse) || branchFilterLoading) {
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
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">FINANCEIRO NFE/NFSE</h1>
          </div>
          <Button onClick={() => setShowReport(true)} className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="nfe">FINANCEIRO NF-e ({nfeData.total || 0})</TabsTrigger>
            <TabsTrigger value="nfse">FINANCEIRO NFS-e ({nfseData.total || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="nfe" className="space-y-6">
            <InvoiceFilters filters={filters} onFilterChange={handleFiltersChange} branches={branches} invoices={filteredInvoices} availableMonths={nfeData.availableMonths || []} showCancelledFilter={true} />
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
                pagination={{ page: nfePage, pageSize: nfeData.pageSize || 50, total: nfeData.total || 0, onPageChange: setNfePage }}
              />
            </div>
          </TabsContent>

          <TabsContent value="nfse" className="space-y-6">
            <InvoiceFilters filters={nfseFilters} onFilterChange={handleNfseFiltersChange} branches={branches} invoices={filteredNfse} availableMonths={nfseData.availableMonths || []} showCancelledFilter={true} />
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
                pagination={{ page: nfsePage, pageSize: nfseData.pageSize || 50, total: nfseData.total || 0, onPageChange: setNfsePage }}
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