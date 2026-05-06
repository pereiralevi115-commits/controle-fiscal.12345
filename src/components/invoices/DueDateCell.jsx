import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

export default function DueDateCell({ invoice }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const isEdited = !!invoice.due_date_edited;

  const mutation = useMutation({
    mutationFn: (newDate) =>
      base44.entities.Invoice.update(invoice.id, {
        due_date: newDate,
        due_date_edited: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Vencimento atualizado!");
      setEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar vencimento");
    },
  });

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleChange = (e) => {
    if (e.target.value) {
      mutation.mutate(e.target.value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setEditing(false);
  };

  const displayDate = invoice.due_date
    ? format(new Date(invoice.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "—";

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={invoice.due_date || ""}
        onChange={handleChange}
        onBlur={() => setEditing(false)}
        onKeyDown={handleKeyDown}
        className="border border-blue-400 rounded px-1 py-0.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`cursor-pointer group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 transition-colors w-fit ${
        isEdited ? "text-red-600 font-semibold" : ""
      }`}
      title="Clique para editar o vencimento"
    >
      {displayDate}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </span>
  );
}