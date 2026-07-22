import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BoletoBarcode from "@/components/dda/BoletoBarcode";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { printDdaBoleto } from "@/lib/ddaPrint";
import { openInvoicePdfForPrint } from "@/lib/invoicePrint";
import { formatCurrency, formatDate, formatCnpjCpf } from "@/lib/boletoUtils";

const statusClass = {
  vinculado: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  pendente: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  duplicado: "bg-blue-100 text-blue-700 hover:bg-blue-100",
};

const typeLabel = { nfe: "NF-e", nfse: "NFS-e", cte: "CT-e" };
const yesNoClass = (value) => value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600";

function AuditBadge({ label, value, name, date }) {
  return (
    <span className={`inline-flex flex-col rounded-lg px-2 py-1 text-[11px] font-semibold ${yesNoClass(value)}`}>
      <span>{label}: {value ? "Sim" : "Não"}</span>
      {value && <span className="font-normal opacity-80">{name || "registro antigo"}{date ? ` · ${new Date(date).toLocaleDateString("pt-BR")}` : ""}</span>}
    </span>
  );
}

function InvoiceDetails({ boleto, invoice }) {
  if (!boleto.invoice_id) return <p className="text-xs text-slate-500 mt-2">{boleto.match_reason}</p>;
  if (!invoice) return <p className="text-xs text-slate-500 mt-2">{typeLabel[boleto.invoice_type]} {boleto.invoice_number}</p>;
  return (
    <div className="mt-2 space-y-2 text-xs text-slate-600 min-w-[260px]">
      <p className="font-semibold text-slate-800">{typeLabel[invoice.document_type || "nfe"]} {invoice.series ? `${invoice.series}/` : ""}{invoice.number}</p>
      <p>{invoice.supplier_name}</p>
      <p>Emissão {formatDate(invoice.issue_date)} · Venc. NF {formatDate(invoice.due_date)} · {formatCurrency(invoice.total_value)}</p>
      <div className="flex flex-wrap gap-1.5">
        <AuditBadge label="SIGV" value={invoice.sigv_recorded} name={invoice.sigv_recorded_by_name || invoice.sigv_updated_by_name} date={invoice.sigv_recorded_at || invoice.sigv_updated_at} />
        <AuditBadge label="TOPCON" value={invoice.topcon_recorded} name={invoice.topcon_recorded_by_name || invoice.topcon_updated_by_name} date={invoice.topcon_recorded_at || invoice.topcon_updated_at} />
      </div>
    </div>
  );
}

export default function DdaTable({ boletos, onLink }) {
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [printingInvoiceId, setPrintingInvoiceId] = useState(null);
  const linkedIds = useMemo(() => [...new Set(boletos.map((b) => b.invoice_id).filter(Boolean))], [boletos]);
  const { data: invoices = [] } = useQuery({
    queryKey: ["ddaLinkedInvoices", linkedIds.join(",")],
    enabled: linkedIds.length > 0,
    queryFn: async () => {
      const rows = [];
      for (const id of linkedIds) rows.push(await base44.entities.Invoice.get(id));
      return rows;
    },
  });
  const invoiceMap = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv])), [invoices]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return boletos.filter((b) => {
      const invoice = invoiceMap.get(b.invoice_id);
      if (status !== "todos" && b.status !== status) return false;
      const text = `${b.beneficiary_name || ""} ${b.document_number || ""} ${b.payer_name || ""} ${b.line_digitavel || ""} ${invoice?.number || ""} ${invoice?.supplier_name || ""}`.toLowerCase();
      return !term || text.includes(term);
    });
  }, [boletos, status, search, invoiceMap]);

  const handlePrintInvoice = async (invoice) => {
    if (!invoice) return;
    setPrintingInvoiceId(invoice.id);
    try {
      await openInvoicePdfForPrint(invoice);
      toast.success("Nota fiscal aberta para impressão.");
    } catch (error) {
      toast.error("Não foi possível abrir a nota fiscal.");
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por fornecedor, documento, NF ou linha digitável" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FDB913] md:col-span-2" />
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
              <th className="text-left px-4 py-3 font-medium">NF vinculada</th>
              <th className="text-right px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((b) => {
              const invoice = invoiceMap.get(b.invoice_id);
              return (
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
                  <td className="px-4 py-3 min-w-[300px]"><Badge className={statusClass[b.status] || statusClass.pendente}>{b.status}</Badge><InvoiceDetails boleto={b} invoice={invoice} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => printDdaBoleto(b, invoice)}>Imprimir boleto</Button>
                      <Button variant="outline" size="sm" disabled={!invoice || printingInvoiceId === invoice.id} onClick={() => handlePrintInvoice(invoice)} title={!invoice ? "Disponível após vincular uma NF" : "Abrir nota fiscal para impressão"}>
                        {printingInvoiceId === invoice?.id ? "Abrindo..." : "Imprimir NF"}
                      </Button>
                      {b.status === "pendente" && <Button variant="outline" size="sm" onClick={() => onLink(b)}>Vincular</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan="7" className="py-12 text-center text-slate-500">Nenhum boleto encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}