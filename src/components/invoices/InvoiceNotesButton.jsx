import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StickyNote } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function InvoiceNotesButton({ invoice }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(invoice.internal_notes || "");

  const hasNotes = !!invoice.internal_notes;

  const saveMutation = useMutation({
    mutationFn: (value) => base44.entities.Invoice.update(invoice.id, { internal_notes: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Observação salva!");
      setOpen(false);
    },
  });

  const handleOpen = () => {
    setNotes(invoice.internal_notes || "");
    setOpen(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleOpen}
              className={`h-8 w-8 transition-all ${
                hasNotes
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white"
                  : "text-slate-500"
              }`}
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hasNotes ? "Observação interna" : "Adicionar observação interna"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Observação Interna</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              NF {invoice.series ? `${invoice.series}/` : ""}{invoice.number} — {invoice.supplier_name}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="internal-notes">Observação</Label>
              <Textarea
                id="internal-notes"
                placeholder="Digite uma observação interna sobre esta nota..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate(notes)} disabled={saveMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}