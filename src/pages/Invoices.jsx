import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import InvoiceFilters from "@/components/invoices/InvoiceFilters";
import InvoiceDetailDialog from "@/components/invoices/InvoiceDetailDialog";

export default function Invoices() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: "", status: "all", branch: "all" });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      for (const invoice of invoices) {
        await base44.entities.Invoice.delete(invoice.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setShowDeleteDialog(false);
      toast.success("Todas as notas foram deletadas!");
    },
    onError: () => {
      toast.error("Erro ao deletar notas");
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
      
      // Filter out invoices from hidden suppliers
      const supplier = suppliers.find((s) => s.cnpj === inv.supplier_cnpj);
      const supplierNotHidden = !supplier || !supplier.hidden;
      
      return searchMatch && statusMatch && branchMatch && supplierNotHidden;
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
  }, [invoices, filters, sortConfig, suppliers]);

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
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground mt-1">
            {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? "s" : ""} encontrada{filteredInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        {invoices.length > 0 && (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Deletar Todas
          </button>
        )}
      </div>

      <InvoiceFilters filters={filters} onFilterChange={setFilters} branches={branches} />

      <div className="bg-card rounded-xl border border-border">
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar todas as notas fiscais?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as {invoices.length} nota{invoices.length !== 1 ? "s" : ""} será{invoices.length !== 1 ? "ão" : "á"} permanentemente deletada{invoices.length !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteAllMutation.isPending ? "Deletando..." : "Deletar Tudo"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}