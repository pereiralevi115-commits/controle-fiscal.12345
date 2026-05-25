import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useBranchFilter } from "@/hooks/useBranchFilter";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Canceladas() {
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();
  const [search, setSearch] = useState("");

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 250000),
  });

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const branchMap = useMemo(() => {
    const m = {};
    branches.forEach(b => { m[b.cnpj] = b.name; });
    return m;
  }, [branches]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.cancelled) return false;
      if (allowedCnpjs && !allowedCnpjs.includes(inv.branch_cnpj)) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          inv.supplier_name?.toLowerCase().includes(s) ||
          inv.number?.includes(s) ||
          (branchMap[inv.branch_cnpj] || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [invoices, allowedCnpjs, search, branchMap]);

  const isLoading = loadingInvoices || loadingBranches || branchFilterLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              Canceladas
            </h1>
            <p className="text-slate-500 mt-1">Notas fiscais canceladas — {filtered.length} registros</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <Input
            placeholder="Buscar por fornecedor, número ou filial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <XCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma nota cancelada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Filial</TableHead>
                    <TableHead className="font-semibold">Fornecedor</TableHead>
                    <TableHead className="font-semibold">NF</TableHead>
                    <TableHead className="font-semibold">Emissão</TableHead>
                    <TableHead className="font-semibold">Cancelamento</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(inv => (
                    <TableRow key={inv.id} className="bg-red-50/40">
                      <TableCell className="font-medium">{branchMap[inv.branch_cnpj] || "—"}</TableCell>
                      <TableCell className="text-sm">{inv.supplier_name}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {inv.series ? `${inv.series}/` : ""}{inv.number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.issue_date
                          ? format(new Date(inv.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-red-600 font-medium">
                        {inv.cancellation_date
                          ? format(new Date(inv.cancellation_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(inv.total_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}