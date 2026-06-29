import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DocumentSimpleTable from "@/components/documents/DocumentSimpleTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import CTeDetailDialog from "@/components/invoices/CTeDetailDialog";
import CTeReport from "@/components/reports/CTeReport";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/lib/AuthContext";
import { getMonthsFromInvoices } from "@/lib/availableMonths";

export default function CTe() {
  const { data: documents = [], isLoading } = useInvoices("cte");
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });
  const [filters, setFilters] = useState({ search: "", branch: "all", monthYear: "all", sigv: "all", topcon: "all", boleto: "all" });
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);

  const filteredWithoutMonth = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (term && !(doc.supplier_name?.toLowerCase().includes(term) || doc.number?.includes(term))) return false;
      if (filters.branch !== "all" && doc.branch_cnpj !== filters.branch) return false;
      if (filters.sigv === "sim" && !doc.sigv_recorded) return false;
      if (filters.sigv === "nao" && doc.sigv_recorded) return false;
      if (filters.topcon === "sim" && !doc.topcon_recorded) return false;
      if (filters.topcon === "nao" && doc.topcon_recorded) return false;
      if (filters.boleto === "sim" && !doc.boleto_recorded) return false;
      if (filters.boleto === "nao" && doc.boleto_recorded) return false;
      return true;
    });
  }, [documents, filters.search, filters.branch, filters.sigv, filters.topcon, filters.boleto]);

  const availableMonths = useMemo(() => getMonthsFromInvoices(filteredWithoutMonth), [filteredWithoutMonth]);

  const filtered = useMemo(() => {
    return filteredWithoutMonth.filter((doc) => {
      if (filters.monthYear !== "all" && doc.issue_date) {
        const date = new Date(doc.issue_date + "T12:00:00");
        const my = `${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
        if (my !== filters.monthYear) return false;
      }
      return true;
    });
  }, [filteredWithoutMonth, filters.monthYear]);

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
              {filtered.length} conhecimento{filtered.length !== 1 ? "s" : ""} de transporte
            </p>
          </div>
          <Button onClick={() => setShowReport(true)} className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>

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
            documents={filtered}
            branches={branches}
            emptyLabel="Nenhum CT-e encontrado"
            showActionButtons
            onViewDetails={setSelected}
            selectable={isAdmin}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
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
          invoices={filtered}
          branches={branches}
        />
      </div>
    </div>
  );
}