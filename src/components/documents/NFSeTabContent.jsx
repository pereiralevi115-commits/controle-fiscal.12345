import React, { useState, useMemo } from "react";
import DocumentSimpleTable from "@/components/documents/DocumentSimpleTable";
import BatchDeleteBar from "@/components/documents/BatchDeleteBar";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import NFSeDetailDialog from "@/components/invoices/NFSeDetailDialog";
import { useInvoices } from "@/hooks/useInvoices";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useAuth } from "@/lib/AuthContext";
import { getMonthsFromInvoices } from "@/lib/availableMonths";

/**
 * Conteúdo da aba "NFS-e" reutilizado nas telas de gestão (Compras, Frota,
 * Controladoria). Mostra as NFS-e dos fornecedores marcados para a tela atual
 * através de `supplierFlag` (ex: "gestao_compras").
 */
export default function NFSeTabContent({ branches, suppliers, supplierFlag }) {
  const { data: documents = [] } = useInvoices("nfse");
  const { allowedCnpjs } = useBranchFilter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [filters, setFilters] = useState({ search: "", branch: "all", monthYear: "all", sigv: "all", topcon: "all", boleto: "all" });
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = (checked, docs) =>
    setSelectedIds(checked ? docs.map((d) => d.id) : []);

  const filteredWithoutMonth = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return documents.filter((doc) => {
      const supplier = suppliers.find((s) => s.cnpj === doc.supplier_cnpj);
      if (!(supplier && supplier[supplierFlag] === true)) return false;
      if (allowedCnpjs && !allowedCnpjs.includes(doc.branch_cnpj)) return false;
      if (doc.archived) return false;
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
  }, [documents, filters.search, filters.branch, filters.sigv, filters.topcon, filters.boleto, suppliers, supplierFlag, allowedCnpjs]);

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

  return (
    <div className="space-y-6">
      <p className="text-slate-500">
        {filtered.length} nota{filtered.length !== 1 ? "s" : ""} de serviço
      </p>

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
          emptyLabel="Nenhuma NFS-e encontrada"
          showDescription
          showActionButtons
          onViewDetails={setSelected}
          selectable={isAdmin}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      </div>

      <NFSeDetailDialog
        invoice={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        branches={branches}
      />
    </div>
  );
}