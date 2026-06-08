import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StickyNote, Pencil, Trash2, X, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

// Converte o campo legado (texto único) em formato de lista, se necessário
const getNotes = (invoice) => {
  if (Array.isArray(invoice.internal_notes_list)) return invoice.internal_notes_list;
  if (invoice.internal_notes) {
    return [{ id: "legacy", text: invoice.internal_notes, author_id: null, author_name: "—", created_at: null }];
  }
  return [];
};

export default function InvoiceNotesButton({ invoice }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const notes = getNotes(invoice);
  const hasNotes = notes.length > 0;

  const saveMutation = useMutation({
    mutationFn: (list) => base44.entities.Invoice.update(invoice.id, { internal_notes_list: list, internal_notes: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const handleAdd = () => {
    if (!newText.trim()) return;
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: newText.trim(),
      author_id: user?.id || null,
      author_name: user?.full_name || user?.email || "Usuário",
      created_at: new Date().toISOString(),
    };
    saveMutation.mutate([...notes, note], {
      onSuccess: () => { toast.success("Observação adicionada!"); setNewText(""); },
    });
  };

  const handleSaveEdit = (id) => {
    if (!editingText.trim()) return;
    const list = notes.map((n) => (n.id === id ? { ...n, text: editingText.trim() } : n));
    saveMutation.mutate(list, {
      onSuccess: () => { toast.success("Observação atualizada!"); setEditingId(null); setEditingText(""); },
    });
  };

  const handleDelete = (id) => {
    const list = notes.filter((n) => n.id !== id);
    saveMutation.mutate(list, {
      onSuccess: () => toast.success("Observação removida!"),
    });
  };

  const canManage = (note) => user?.role === "admin" || (note.author_id && note.author_id === user?.id);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpen(true)}
              className={`h-8 w-8 transition-all ${
                hasNotes
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-700 hover:text-white"
                  : "text-slate-500"
              }`}
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hasNotes ? `Observações (${notes.length})` : "Adicionar observação interna"}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Observações Internas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            NF {invoice.series ? `${invoice.series}/` : ""}{invoice.number} — {invoice.supplier_name}
          </p>

          <div className="space-y-3 py-2">
            {notes.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma observação ainda.</p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-3 bg-slate-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {note.author_name || "—"}
                    {note.created_at && (
                      <span className="font-normal text-slate-400 ml-2">
                        {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </span>
                  {canManage(note) && editingId !== note.id && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(note.id); setEditingText(note.text); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-700" onClick={() => handleDelete(note.id)} disabled={saveMutation.isPending}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={3} />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditingText(""); }} className="gap-1">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(note.id)} disabled={saveMutation.isPending} className="gap-1">
                        <Check className="w-3.5 h-3.5" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.text}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t pt-3">
            <Textarea
              placeholder="Escreva uma nova observação..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button onClick={handleAdd} disabled={saveMutation.isPending || !newText.trim()}>
                Adicionar observação
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}