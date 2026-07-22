import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BoletoBarcode from "@/components/dda/BoletoBarcode";
import { formatCurrency, formatDate, formatCnpjCpf } from "@/lib/boletoUtils";

const statusClass = {
  vinculado: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  pendente: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  duplicado: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

const typeLabel = { nfe: "NF-e", nfse: "NFS-e", cte: "CT-e" };

export default function DdaTable({ boletos, onLink }) {
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return boletos.filter((b) => {
      if (status !== "todos" && b.status !== status) return false;
      const text = `${b.beneficiary_name || ""} ${b.document_number || ""} ${b.payer_name || ""} ${b.line_digitavel || ""}`.toLowerCase();
      return !term || text.includes(term);
    });
  }, [boletos, status, search]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por fornecedor, documento ou linha digitável" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FDB913] md:col-span-2" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FDB913]">
          <option value="todos">Todos os status</option>
          <option value="vinculado">Vinculados</option>
          <option value="pendente">Pendentes</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Boleto</th>
              <th className="text-left px-4 py-3 font-medium">Beneficiário</th>
              <th className="text-left px-4 py-3 font-medium">Pagador</th>
              <th className="text-left px-4 py-3 font-medium">Vencimento</th>
              <th className="text-right px-4 py-3 font-medium">Valor</th>
              <th className="text-left px-4 py-3 font-medium">Vínculo</th>
              <th className="text-right px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((b) => (
              <tr key={b.id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-3 min-w-[260px]">
                  <p className="font-semibold text-slate-800">{b.document_number || "Sem número"}</p>
                  <p className="text-xs text-slate-500">{b.bank_name || "—"}</p>
                  <p className="text-[11px] text-slate-400 mt-1 break-all">{b.line_digitavel}</p>
                  <div className="mt-2 max-w-xs"><BoletoBarcode code={b.barcode} /></div>
                </td>
                <td className="px-4 py-3 min-w-[220px]"><p className="font-medium text-slate-700">{b.beneficiary_name}</p><p className="text-xs text-slate-500">{formatCnpjCpf(b.beneficiary_cnpj)}</p></td>
                <td className="px-4 py-3 min-w-[180px]"><p className="text-slate-700">{b.payer_name}</p><p className="text-xs text-slate-500">{formatCnpjCpf(b.payer_cnpj)}</p></td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(b.due_date)}</td>
                <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{formatCurrency(b.charged_value)}</td>
                <td className="px-4 py-3 min-w-[220px]"><Badge className={statusClass[b.status] || statusClass.pendente}>{b.status}</Badge><p className="text-xs text-slate-500 mt-2">{b.invoice_id ? `${typeLabel[b.invoice_type]} ${b.invoice_number}` : b.match_reason}</p></td>
                <td className="px-4 py-3 text-right">{b.status === "pendente" && <Button variant="outline" size="sm" onClick={() => onLink(b)}>Vincular</Button>}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="7" className="py-12 text-center text-slate-500">Nenhum boleto encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}