import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";
import { updateInvoiceInCaches } from "@/lib/invoiceCache";

export default function DueDateCell({ invoice }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('edit_due_date');
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const queryClient = useQueryClient();

  const isEdited = !!invoice.due_date_edited;

  const formatDateSafe = (value) => {
    if (!value) return "—";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const mutation = useMutation({
    mutationFn: (newDate) =>
      base44.entities.Invoice.update(invoice.id, {
        due_date: newDate,
        due_date_edited: true,
      }),
    onSuccess: (_result, newDate) => {
      updateInvoiceInCaches(queryClient, invoice.id, {
        due_date: newDate,
        due_date_edited: true,
      });
      toast.success("Vencimento atualizado!");
      setEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar vencimento");
    },
  });

  const handleOpen = () => {
    if (invoice.due_date) {
      const [y, m, d] = invoice.due_date.split("-");
      setDay(d || "");
      setMonth(m || "");
      setYear(y || "");
    } else {
      setDay(""); setMonth(""); setYear("");
    }
    setEditing(true);
  };

  const handleSave = () => {
    const currentDay = dayRef.current?.value || day;
    const currentMonth = monthRef.current?.value || month;
    const currentYear = yearRef.current?.value || year;
    const d = currentDay.padStart(2, "0");
    const m = currentMonth.padStart(2, "0");
    const y = currentYear;
    if (d && m && y && y.length === 4) {
      const dateStr = `${y}-${m}-${d}`;
      mutation.mutate(dateStr);
    } else {
      setEditing(false);
    }
  };

  const handleDayChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDay(val);
    if (val.length === 2) monthRef.current?.focus();
  };

  const handleMonthChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMonth(val);
    if (val.length === 2) yearRef.current?.focus();
  };

  const handleYearChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYear(val);
  };

  const handleSaveWithValues = (d, m, y) => {
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    if (dd && mm && y && y.length === 4) {
      const dateStr = `${y}-${mm}-${dd}`;
      mutation.mutate(dateStr);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setEditing(false);
    if (e.key === "Enter") handleSave();
  };

  const displayDate = formatDateSafe(invoice.due_date);

  const formatCurrency = (val) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  const paymentTypeMap = {
    "01": "Dinheiro", "02": "Cheque", "03": "Cartão Crédito", "04": "Cartão Débito",
    "05": "Crediário", "10": "Vale Alimentação", "12": "Duplicata", "13": "Boleto Bancário", "99": "Outro"
  };

  const hasPaymentInfo = invoice.installments?.length > 0 || invoice.payments?.length > 0;

  const tooltipContent = hasPaymentInfo
    ? invoice.installments?.length > 0
      ? `DADOS DE PAGAMENTO\n\n${invoice.installments.map((inst, idx) =>
          `Parcela ${String(inst.number || idx + 1).padStart(3, "0")}\n${formatDateSafe(inst.due_date)} - ${formatCurrency(inst.value)}`
        ).join("\n\n")}`
      : `DADOS DE PAGAMENTO\n\n${invoice.payments.map((pay) =>
          `${paymentTypeMap[pay.payment_type] || "Pagamento"}\n${formatCurrency(pay.value)}`
        ).join("\n\n")}`
    : null;

  if (editing) {
    return (
      <div className="flex items-center gap-0.5" onKeyDown={handleKeyDown}>
        <input
          ref={dayRef}
          autoFocus
          type="text"
          placeholder="DD"
          value={day}
          onChange={handleDayChange}
          className="border border-blue-400 rounded px-1 py-0.5 text-sm w-9 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-slate-400">/</span>
        <input
          ref={monthRef}
          type="text"
          placeholder="MM"
          value={month}
          onChange={handleMonthChange}
          className="border border-blue-400 rounded px-1 py-0.5 text-sm w-9 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-slate-400">/</span>
        <input
          ref={yearRef}
          type="text"
          placeholder="AAAA"
          value={year}
          onChange={handleYearChange}
          className="border border-blue-400 rounded px-1 py-0.5 text-sm w-14 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          aria-label="Salvar vencimento"
          title="Salvar vencimento"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const trigger = (
    <span
      onClick={canEdit ? handleOpen : undefined}
      className={`group flex items-center gap-1 rounded px-1 py-0.5 transition-colors w-fit ${
        canEdit ? "cursor-pointer hover:bg-slate-100" : "cursor-default"
      } ${isEdited ? "text-red-600 font-semibold" : ""}`}
    >
      {displayDate}
      {canEdit && <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />}
    </span>
  );

  if (!hasPaymentInfo) return trigger;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <span className="whitespace-pre-wrap text-xs">{tooltipContent}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}