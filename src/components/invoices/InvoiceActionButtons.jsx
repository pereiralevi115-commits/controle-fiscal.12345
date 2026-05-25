import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function InvoiceActionButtons({ invoiceId, invoice }) {
  const { hasPermission, user, userProfile } = useAuth();
  const showOutrasOperacoes = user?.role === 'admin' || userProfile?.name === 'Compras' || userProfile?.name === 'Gestor';
  const queryClient = useQueryClient();
  const [showChoiceDialog, setShowChoiceDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiveNotes, setArchiveNotes] = useState("");

  const recordMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.update(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const handleArchiveClick = () => {
    if (invoice.archived) {
      recordMutation.mutate({ archived: false, archive_notes: "" }, {
        onSuccess: () => toast.success("Nota desarquivada!"),
      });
    } else {
      setShowChoiceDialog(true);
    }
  };

  const handleChoiceArquivar = () => {
    setShowChoiceDialog(false);
    setArchiveNotes("");
    setShowArchiveDialog(true);
  };

  const handleChoiceCancelar = () => {
    const today = new Date().toISOString().split("T")[0];
    recordMutation.mutate({ cancelled: true, cancellation_date: today }, {
      onSuccess: () => {
        toast.success("Nota cancelada!");
        setShowChoiceDialog(false);
      },
    });
  };

  const handleArchiveConfirm = () => {
    recordMutation.mutate({ archived: true, archive_notes: archiveNotes }, {
      onSuccess: () => {
        toast.success("Nota arquivada!");
        setShowArchiveDialog(false);
      },
    });
  };

  const handleButtonClick = (buttonType) => {
    const fieldMap = {
      SIGV: "sigv_recorded",
      TOPCON: "topcon_recorded",
      BOLETO: "boleto_recorded"
    };
    
    const field = fieldMap[buttonType];
    const newValue = !invoice[field];
    
    recordMutation.mutate({ [field]: newValue }, {
      onSuccess: () => {
        toast.success(`${buttonType} ${newValue ? "registrado" : "desregistrado"}!`);
      }
    });
  };

  const buttons = [
    { id: "SIGV", label: "SIGV", permission: "toggle_sigv", borderColor: "border-emerald-500", textColor: "text-emerald-600", bgColor: "bg-emerald-50", activeBg: "bg-emerald-600", field: "sigv_recorded" },
    { id: "TOPCON", label: "TOPCON", permission: "toggle_topcon", borderColor: "border-violet-500", textColor: "text-violet-600", bgColor: "bg-violet-50", activeBg: "bg-violet-600", field: "topcon_recorded" },
    { id: "BOLETO", label: "BOLETO", permission: "toggle_boleto", borderColor: "border-amber-500", textColor: "text-amber-600", bgColor: "bg-amber-50", activeBg: "bg-amber-600", field: "boleto_recorded" }
  ];

  return (
    <>
      {/* Dialog de escolha: Arquivar ou Cancelar */}
      <Dialog open={showChoiceDialog} onOpenChange={setShowChoiceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Arquivar ou Cancelar?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-1">
            NF {invoice.series ? `${invoice.series}/` : ""}{invoice.number} — {invoice.supplier_name}
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={handleChoiceArquivar}
              className="bg-slate-800 hover:bg-slate-700 text-white h-16 flex-col gap-1 text-sm font-semibold"
            >
              📁 ARQUIVAR
            </Button>
            <Button
              onClick={handleChoiceCancelar}
              disabled={recordMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white h-16 flex-col gap-1 text-sm font-semibold"
            >
              ✕ CANCELAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arquivar Nota Fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              NF {invoice.series ? `${invoice.series}/` : ""}{invoice.number} — {invoice.supplier_name}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="archive-notes">Observação</Label>
              <Textarea
                id="archive-notes"
                placeholder="Digite o motivo ou observação para arquivar..."
                value={archiveNotes}
                onChange={(e) => setArchiveNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleArchiveConfirm}
              disabled={recordMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <div className="flex items-center justify-end gap-2">
      {showOutrasOperacoes && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleArchiveClick}
          disabled={recordMutation.isPending}
          className={`h-7 px-3 text-xs font-medium transition-all border-red-500 ${
            invoice.archived
              ? "bg-red-600 text-white border-2"
              : "text-red-600 hover:bg-red-50"
          }`}
        >
          ARQUIVAR
        </Button>
      )}
      {buttons.map((btn) => {
        const canEdit = hasPermission(btn.permission);
        return (
          <Button
            key={btn.id}
            variant="outline"
            size="sm"
            onClick={() => canEdit && handleButtonClick(btn.id)}
            disabled={recordMutation.isPending || !canEdit}
            className={`h-7 px-3 text-xs font-medium transition-all ${btn.borderColor} ${
              invoice[btn.field]
                ? `${btn.activeBg} text-white border-2`
                : `${btn.textColor} hover:${btn.bgColor}`
            } ${!canEdit ? "cursor-not-allowed pointer-events-none" : ""}`}
          >
            {btn.label}
          </Button>
        );
      })}
    </div>
    </>
  );
}