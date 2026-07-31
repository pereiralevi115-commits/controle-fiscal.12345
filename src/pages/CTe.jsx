import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DocumentSimpleTable from "@/components/documents/DocumentSimpleTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import CTeDetailDialog from "@/components/invoices/CTeDetailDialog";
import CTeReport from "@/components/reports/CTeReport";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart } from "lucide-react";
import { usePaginatedInvoices } from "@/hooks/usePaginatedInvoices";
import { useAuth } from "@/lib/AuthContext";

export default function CTe() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [filters, setFilters] = useState({ search: "", branch: "all", monthYear: "all", sigv: "all", topcon: "all", boleto: "all", tomadorGroup: "concretar" });
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [page, setPage] = useState(0);

  const { data: pageData, isLoading } = usePaginatedInvoices({
    documentType: "cte",
    filters,
    sortConfig: [{ key: "issue_date", direction: "desc" }],
    page,
  });

  const documents = pageData?.items || [];
  const total = pageData?.total || 0;
  const pageSize = pageData?.pageSize || 50;
  const availableMonths = pageData?.availableMonths || [];
  const tomadorCounts = pageData?.tomadorCounts || { concretar: 0, outros: 0 };

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [filters]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">CT-e</h1>
            <p className="text-slate-500 mt-1">
              {total} conhecimento{total !== 1 ? "s" : ""} de transporte
            </p>
          </div>
          <Button onClick={() => setShowReport(true)} className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>

        <Tabs value={filters.tomadorGroup} onValueChange={(value) => setFilters((prev) => ({ ...prev, tomadorGroup: value }))}>
          <TabsList className="bg-white border border-slate-200 shadow-sm">
            <TabsTrigger value="concretar">Tomador Concretar ({tomadorCounts.concretar})</TabsTrigger>
            <TabsTrigger value="outros">Demais tomadores ({tomadorCounts.outros})</TabsTrigger>
          </TabsList>
        </Tabs>

        <InvoiceFilters
          filters={filters}
          onFilterChange={setFilters}
          branches={branches}
          invoices={documents}
          availableMonths={availableMonths}
        />

        <BatchDeleteBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

        <div className="bg-white rounded-xl shadow-lg border-0">
          <DocumentSimpleTable
            documents={documents}
            branches={branches}
            emptyLabel="Nenhum CT-e encontrado"
            showActionButtons
            showTomador
            onViewDetails={setSelected}
            selectable={isAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            pagination={{ page, pageSize, total, onPageChange: setPage }}
          />
        </div>

        <CTeDetailDialog
          invoice={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          branches={branches}
        />

        <CTeReport
          open={showReport}
          onClose={() => setShowReport(false)}
          invoices={documents}
          branches={branches}
        />
      </div>
    </div>
  );
}