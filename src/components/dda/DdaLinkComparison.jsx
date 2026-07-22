import React from "react";
import { formatCurrency, formatDate, formatCnpjCpf } from "@/lib/boletoUtils";
import { confidenceStyle, typeLabel } from "@/components/dda/ddaMatchUtils";

function Info({ label, value, highlight }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p><p className={`text-sm ${highlight ? "font-semibold text-emerald-700" : "text-slate-700"}`}>{value || "—"}</p></div>;
}

export default function DdaLinkComparison({ boleto, row, selectedRows = [], payerBranchName }) {
  const invoice = row?.invoice;
  const match = row?.match;
  const selectedTotal = selectedRows.reduce((sum, item) => sum + (item.invoice.total_value || 0), 0);
  const difference = selectedTotal - (boleto.charged_value || 0);
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="mb-3 text-sm font-bold text-amber-900">Dados do boleto</p>
        <div className="grid grid-cols-2 gap-3">
          <Info label="Beneficiário" value={boleto.beneficiary_name} />
          <Info label="CNPJ beneficiário" value={formatCnpjCpf(boleto.beneficiary_cnpj)} />
          <Info label="Pagador/usina" value={payerBranchName || boleto.payer_name} />
          <Info label="CNPJ pagador" value={formatCnpjCpf(boleto.payer_cnpj)} />
          <Info label="Valor" value={formatCurrency(boleto.charged_value)} />
          <Info label="Vencimento" value={formatDate(boleto.due_date)} />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-800">Notas selecionadas</p>
          {match && <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${confidenceStyle[match.confidence]}`}>{match.score}% confiança</span>}
        </div>
        {selectedRows.length > 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Info label="Qtd. NFs" value={selectedRows.length} />
                <Info label="Total NFs" value={formatCurrency(selectedTotal)} highlight={Math.abs(difference) <= 0.01} />
                <Info label="Diferença" value={formatCurrency(difference)} highlight={Math.abs(difference) <= 0.01} />
              </div>
            </div>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {selectedRows.map(({ invoice }) => (
                <div key={invoice.id} className="rounded-lg border border-slate-100 p-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{typeLabel[invoice.document_type || "nfe"]} {invoice.series ? `${invoice.series}/` : ""}{invoice.number || "—"} · {formatCurrency(invoice.total_value)}</p>
                  <p>{invoice.supplier_name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : invoice ? (
          <div className="grid grid-cols-2 gap-3">
            <Info label="Documento" value={`${typeLabel[invoice.document_type || "nfe"]} ${invoice.series ? `${invoice.series}/` : ""}${invoice.number || "—"}`} />
            <Info label="Fornecedor" value={invoice.supplier_name} highlight={match?.sameSupplier} />
            <Info label="CNPJ fornecedor" value={formatCnpjCpf(invoice.supplier_cnpj)} highlight={match?.sameSupplier} />
            <Info label="Valor NF" value={formatCurrency(invoice.total_value)} highlight={match?.exactValue || match?.closeValue} />
            <Info label="Vencimento NF" value={formatDate(invoice.due_date)} highlight={match?.closeDueDate} />
            <Info label="Controles" value={`SIGV ${invoice.sigv_recorded ? "sim" : "não"} · TOPCON ${invoice.topcon_recorded ? "sim" : "não"}`} />
          </div>
        ) : <p className="py-8 text-center text-sm text-slate-500">Selecione uma ou mais notas para comparar.</p>}
      </div>
    </div>
  );
}