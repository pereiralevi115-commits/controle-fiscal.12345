import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BranchCard from "@/components/dashboard/BranchCard";
import { FileText } from "lucide-react";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useAuth } from "@/lib/AuthContext";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function Dashboard() {
  const { allowedCnpjs } = useBranchFilter();
  const { user, userProfile } = useAuth();
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const isLoading = loadingInvoices || loadingBranches || loadingSuppliers;

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

  // Same filter as Notas Fiscais page: exclude cancelled and hidden suppliers
  const hiddenCnpjs = new Set(suppliers.filter(s => s.hidden).map(s => s.cnpj));
  const visibleInvoices = invoices.filter(inv =>
    !inv.cancelled &&
    !hiddenCnpjs.has(inv.supplier_cnpj) &&
    (!allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj))
  );

  // Group invoices by branch
  const grouped = {};
  visibleInvoices.forEach(inv => {
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
    const value = invs.reduce((s, i) => s + (i.total_value || 0), 0);
    return { name, total, sigv, topcon, boleto, value };
  });

  // Sort by branch name
  rows.sort((a, b) => a.name.localeCompare(b.name));

  // Totals across all branches
  const allTotal  = visibleInvoices.length;
  const allSigv   = visibleInvoices.filter(i => i.sigv_recorded).length;
  const allTopcon = visibleInvoices.filter(i => i.topcon_recorded).length;
  const allBoleto = visibleInvoices.filter(i => i.boleto_recorded).length;
  const allValue  = visibleInvoices.reduce((s, i) => s + (i.total_value || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Controle de lançamentos por filial</p>
          </div>

        </div>

        <div className="space-y-5">
          {/* Card consolidado — todas as filiais */}
          <BranchCard name="Todas as Filiais" total={allTotal} sigv={allSigv} topcon={allTopcon} boleto={allBoleto} value={allValue} highlight />

          {rows.map((row) => (
            <BranchCard key={row.name} name={row.name} total={row.total} sigv={row.sigv} topcon={row.topcon} boleto={row.boleto} value={row.value} />
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