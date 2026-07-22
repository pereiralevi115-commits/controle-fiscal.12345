import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency, formatDate, formatCnpjCpf, onlyDigits } from "@/lib/boletoUtils";

const typeLabel = { nfe: "NF-e", nfse: "NFS-e", cte: "CT-e" };

export default function DdaLinkDialog({ boleto, open, onClose, onLink, loading }) {
  const [search, setSearch] = useState("");
  const { data: invoices = [] } = useInvoices(["nfe", "nfse", "cte"]);

  const candidates = useMemo(() => {
    if (!boleto) return [];
    const term = search.trim().toLowerCase();
    return invoices
      .filter((inv) => !inv.archived && !inv.cancelled)
      .filter((inv) => {
        const supplierMatch = onlyDigits(inv.supplier_cnpj) === boleto.beneficiary_cnpj;
        const branchMatch = onlyDigits(inv.branch_cnpj || inv.recipient_cnpj) === boleto.payer_cnpj;
        const valueMatch = Math.abs((inv.total_value || 0) - (boleto.charged_value || 0)) <= 0.01;
        const text = `${inv.number || ""} ${inv.supplier_name || ""}`.toLowerCase();
        return (supplierMatch || branchMatch || valueMatch || text.includes(term)) && (!term || text.includes(term));
      })
      .slice(0, 25);
  }, [invoices, boleto, search]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Vincular boleto pendente</DialogTitle></DialogHeader>
        {boleto && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
              <strong>{boleto.beneficiary_name}</strong> · {formatCurrency(boleto.charged_value)} · vence em {formatDate(boleto.due_date)}
            </div>
            <Input placeholder="Buscar nota por número ou fornecedor" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="space-y-2">
              {candidates.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{typeLabel[inv.document_type || "nfe"]} {inv.series ? `${inv.series}/` : ""}{inv.number}</p>
                    <p className="text-xs text-slate-500 truncate">{inv.supplier_name} · {formatCnpjCpf(inv.supplier_cnpj)}</p>
                    <p className="text-xs text-slate-500">Emissão {formatDate(inv.issue_date)} · Vencimento {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800">{formatCurrency(inv.total_value)}</p>
                    <Button size="sm" disabled={loading} onClick={() => onLink(boleto.id, inv.id)}>Vincular</Button>
                  </div>
                </div>
              ))}
              {candidates.length === 0 && <p className="text-center text-sm text-slate-500 py-8">Nenhuma nota encontrada com os filtros atuais.</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}