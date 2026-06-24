import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
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

export default function BatchDeleteBar({ selectedIds, onClear }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        await base44.functions.invoke("deleteInvoice", { invoiceId: id });
      }
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

  if (user?.role !== "admin" || selectedIds.length === 0) return null;

  return (
    <div className="sticky top-2 z-20 flex items-center justify-between gap-3 bg-slate-800 text-white rounded-xl px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={onClear}>
          <X className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium">{selectedIds.length} nota(s) selecionada(s)</span>
      </div>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Excluir selecionadas
      </Button>

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