import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { onlyDigits, formatCurrency } from "@/lib/boletoUtils";
import DdaCandidateCard from "@/components/dda/DdaCandidateCard";
import DdaLinkComparison from "@/components/dda/DdaLinkComparison";
import DdaQuickFilters from "@/components/dda/DdaQuickFilters";
import { getDdaMatch, matchSearchText, passesQuickFilter } from "@/components/dda/ddaMatchUtils";

export default function DdaLinkDialog({ boleto, open, onClose, onLink, loading }) {
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("todos");
  const [selectedIds, setSelectedIds] = useState([]);
  const { data: invoices = [], isFetching: loadingCandidates } = useQuery({
    queryKey: ["ddaCandidateInvoices", boleto?.id],
    enabled: open && !!boleto,
    queryFn: async () => {
      const supplierCnpj = onlyDigits(boleto.beneficiary_cnpj);
      const payerCnpj = onlyDigits(boleto.payer_cnpj);
      const pages = await Promise.all([
        base44.entities.Invoice.filter({ supplier_cnpj: supplierCnpj }, "-issue_date", 100),
        base44.entities.Invoice.filter({ branch_cnpj: payerCnpj }, "-issue_date", 100),
        base44.entities.Invoice.filter({ recipient_cnpj: payerCnpj }, "-issue_date", 100),
        base44.entities.Invoice.list("-issue_date", 300),
      ]);
      return [...new Map(pages.flat().map((invoice) => [invoice.id, invoice])).values()];
    },
  });
  const { data: branches = [] } = useQuery({ queryKey: ["ddaLinkBranches"], queryFn: () => base44.entities.Branch.list() });

  useEffect(() => {
    if (open) {
      setSearch("");
      setQuickFilter("todos");
      const linked = Array.isArray(boleto?.linked_invoices) ? boleto.linked_invoices.map((item) => item.invoice_id).filter(Boolean) : [];
      setSelectedIds(linked);
    }
  }, [open, boleto?.id]);

  const branchMap = useMemo(() => new Map(branches.map((branch) => [onlyDigits(branch.cnpj), branch.name])), [branches]);
  const payerBranchName = boleto ? branchMap.get(onlyDigits(boleto.payer_cnpj)) : null;

  const candidates = useMemo(() => {
    if (!boleto) return [];
    const term = search.trim().toLowerCase();
    return invoices
      .filter((inv) => !inv.archived && !inv.cancelled)
      .map((invoice) => ({ invoice, match: getDdaMatch(boleto, invoice) }))
      .filter((row) => !term || matchSearchText(row.invoice).includes(term))
      .filter((row) => passesQuickFilter(row, quickFilter))
      .sort((a, b) => new Date(`${b.invoice.issue_date || "1900-01-01"}T12:00:00`) - new Date(`${a.invoice.issue_date || "1900-01-01"}T12:00:00`))
      .slice(0, 40);
  }, [invoices, boleto, search, quickFilter]);

  const selectedRows = useMemo(() => candidates.filter((row) => selectedIds.includes(row.invoice.id)), [candidates, selectedIds]);
  const selectedTotal = selectedRows.reduce((sum, row) => sum + (row.invoice.total_value || 0), 0);
  const selectedRow = selectedRows[0] || candidates[0];
  const toggleSelected = (invoiceId) => setSelectedIds((ids) => ids.includes(invoiceId) ? ids.filter((id) => id !== invoiceId) : [...ids, invoiceId]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular boleto pendente</DialogTitle>
        </DialogHeader>
        {boleto && (
          <div className="space-y-4">
            <DdaLinkComparison boleto={boleto} row={selectedRow} selectedRows={selectedRows} payerBranchName={payerBranchName} />
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Input placeholder="Buscar por número da nota, fornecedor ou CNPJ" value={search} onChange={(e) => setSearch(e.target.value)} />
              <DdaQuickFilters value={quickFilter} onChange={setQuickFilter} />
            </div>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <p className="text-sm text-slate-500">
                {selectedRows.length > 0 ? `${selectedRows.length} NF(s) selecionada(s) · Total ${formatCurrency(selectedTotal)}` : "Selecione uma ou mais notas para vincular ao mesmo boleto."}
              </p>
              <Button disabled={selectedRows.length === 0 || loading} onClick={() => onLink(boleto.id, selectedRows.map((row) => row.invoice.id))}>
                {selectedRows.length > 1 ? `Vincular ${selectedRows.length} NFs` : "Vincular selecionada"}
              </Button>
            </div>
            <div className="space-y-2">
              {loadingCandidates && <p className="py-8 text-center text-sm text-slate-500">Carregando notas candidatas...</p>}
              {!loadingCandidates && candidates.map((row) => (
                <DdaCandidateCard
                  key={row.invoice.id}
                  row={row}
                  selected={selectedIds.includes(row.invoice.id)}
                  loading={loading}
                  onSelect={() => toggleSelected(row.invoice.id)}
                />
              ))}
              {!loadingCandidates && candidates.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhuma nota encontrada com os filtros atuais.</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}