import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import DocumentSimpleTable from "@/components/documents/DocumentSimpleTable";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";
import { useInvoices } from "@/hooks/useInvoices";

export default function NFSe() {
  const { data: documents = [], isLoading } = useInvoices("nfse");
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (doc) =>
        doc.supplier_name?.toLowerCase().includes(term) ||
        doc.number?.includes(term)
    );
  }, [documents, search]);

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
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">NFS-e</h1>
          <p className="text-slate-500 mt-1">
            {filtered.length} nota{filtered.length !== 1 ? "s" : ""} de serviço
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por prestador ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg border-0">
          <DocumentSimpleTable
            documents={filtered}
            branches={branches}
            emptyLabel="Nenhuma NFS-e encontrada"
            onViewDetails={setSelected}
          />
        </div>

        <InvoiceDetailDialog
          invoice={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          branches={branches}
        />
      </div>
    </div>
  );
}