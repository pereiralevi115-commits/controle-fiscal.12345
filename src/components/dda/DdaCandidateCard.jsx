import React from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatCnpjCpf } from "@/lib/boletoUtils";
import { confidenceStyle, typeLabel } from "@/components/dda/ddaMatchUtils";

export default function DdaCandidateCard({ row, selected, loading, onSelect }) {
  const { invoice, match } = row;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3 transition ${selected ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
            <p className="font-semibold text-slate-800">{typeLabel[invoice.document_type || "nfe"]} {invoice.series ? `${invoice.series}/` : ""}{invoice.number}</p>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${confidenceStyle[match.confidence]}`}>{match.score}% · {match.confidence === "media" ? "média" : match.confidence}</span>
          </div>
          <p className="truncate text-xs text-slate-500">{invoice.supplier_name} · {formatCnpjCpf(invoice.supplier_cnpj)}</p>
          <p className="text-xs text-slate-500">Emissão {formatDate(invoice.issue_date)} · Vencimento {formatDate(invoice.due_date)}</p>
          <p className="text-xs text-slate-600">Motivo: {match.reasons.length ? match.reasons.join(", ") : "sem compatibilidade forte"}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="mb-2 font-bold text-slate-800">{formatCurrency(invoice.total_value)}</p>
          <Button size="sm" variant={selected ? "secondary" : "default"} disabled={loading} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
            {selected ? "Remover" : "Selecionar"}
          </Button>
        </div>
      </div>
    </button>
  );
}