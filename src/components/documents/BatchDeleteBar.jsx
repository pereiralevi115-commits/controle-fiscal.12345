import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Archive } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

// Aplica a mesma alteração a todas as notas selecionadas, em pequenos lotes para
// não estourar o rate limit do banco.
async function applyToAll(ids, data) {
  for (let i = 0; i < ids.length; i += 20) {
    const slice = ids.slice(i, i + 20);
    await Promise.all(slice.map((id) => base44.entities.Invoice.update(id, data)));
    if (i + 20 < ids.length) await new Promise((r) => setTimeout(r, 200));
  }
}

export default function BatchDeleteBar({ selectedIds, onClear }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke("deleteInvoicesBatch", { invoiceIds: selectedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`${selectedIds.length} nota(s) excluída(s)! Não serão reimportadas.`);
      setOpen(false);
      onClear();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Erro ao excluir as notas.");
    },
  });

  const markMutation = useMutation({
    mutationFn: ({ data }) => applyToAll(selectedIds, data),
    onSuccess: (_res, { label }) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`${selectedIds.length} nota(s): ${label} aplicado!`);
      onClear();
    },
    onError: () => {
      toast.error("Erro ao aplicar a ação nas notas.");
    },
  });

  if (user?.role !== "admin" || selectedIds.length === 0) return null;

  const isBusy = markMutation.isPending || deleteMutation.isPending;

  const markButtons = [
    { id: "archive", label: "Arquivar", data: { archived: true }, className: "border-slate-400 text-white hover:bg-white/10" },
    { id: "sigv", label: "SIGV", data: { sigv_recorded: true }, className: "border-emerald-400 text-emerald-200 hover:bg-emerald-500/20" },
    { id: "topcon", label: "TOPCON", data: { topcon_recorded: true }, className: "border-violet-400 text-violet-200 hover:bg-violet-500/20" },
    { id: "boleto", label: "Boleto", data: { boleto_recorded: true }, className: "border-amber-400 text-amber-200 hover:bg-amber-500/20" },
  ];

  return (
    <div className="sticky top-2 z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-800 text-white rounded-xl px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={onClear}>
          <X className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium">{selectedIds.length} nota(s) selecionada(s)</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {markButtons.map((btn) => (
          <Button
            key={btn.id}
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => markMutation.mutate({ data: btn.data, label: btn.label })}
            className={`h-8 px-3 text-xs font-medium bg-transparent gap-1.5 ${btn.className}`}
          >
            {btn.id === "archive" && <Archive className="w-3.5 h-3.5" />}
            {btn.label}
          </Button>
        ))}
        <Button
          size="sm"
          disabled={isBusy}
          onClick={() => setOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white gap-2 h-8"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.length} nota(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. As notas também não serão carregadas novamente em importações futuras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}