import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, CheckSquare, Receipt, BookOpen } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function Dashboard() {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const isLoading = loadingInvoices || loadingBranches;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Map CNPJ -> branch name, include "sem filial"
  const branchMap = {};
  branches.forEach(b => { branchMap[b.cnpj] = b.name; });

  // Group invoices by branch
  const grouped = {};
  invoices.forEach(inv => {
    const key = inv.branch_cnpj || "__sem_filial__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(inv);
  });

  // Build rows: one per branch that has invoices
  const rows = Object.entries(grouped).map(([cnpj, invs]) => {
    const name = cnpj === "__sem_filial__" ? "Sem Filial" : (branchMap[cnpj] || cnpj);
    const total = invs.length;
    const sigv = invs.filter(i => i.sigv_recorded).length;
    const topcon = invs.filter(i => i.topcon_recorded).length;
    const boleto = invs.filter(i => i.boleto_recorded).length;
    return { name, total, sigv, topcon, boleto };
  });

  // Sort by branch name
  rows.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Controle de lançamentos por filial</p>
        </div>

        <div className="space-y-5">
          {rows.map((row) => (
            <div key={row.name} className="bg-white rounded-xl shadow border border-slate-100">
              {/* Branch header */}
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-base">{row.name}</h2>
              </div>

              {/* 4 stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
                {/* Total */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{row.total}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total de Notas</p>
                  </div>
                </div>

                {/* SIGV */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{row.sigv}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Lançado SIGV</p>
                    <p className="text-xs text-slate-400">{row.total > 0 ? Math.round(row.sigv/row.total*100) : 0}% do total</p>
                  </div>
                </div>

                {/* TOPCON */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{row.topcon}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Lançado TOPCON</p>
                    <p className="text-xs text-slate-400">{row.total > 0 ? Math.round(row.topcon/row.total*100) : 0}% do total</p>
                  </div>
                </div>

                {/* BOLETO */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-700">{row.boleto}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Boleto em Mãos</p>
                    <p className="text-xs text-slate-400">{row.total > 0 ? Math.round(row.boleto/row.total*100) : 0}% do total</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 py-16 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma nota fiscal importada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}