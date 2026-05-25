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
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();
  const { user, userProfile, canAccessPage } = useAuth();
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 250000),
  });

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const isLoading = loadingInvoices || loadingBranches || loadingSuppliers || branchFilterLoading;

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

  const hiddenCnpjs = new Set(suppliers.filter(s => s.hidden).map(s => s.cnpj));

  // Determinar quais fornecedores são "especiais" (pertencem a telas específicas)
  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.cnpj] = s; });

  const isAdmin = user?.role === 'admin';
  const isLider = userProfile?.name?.toLowerCase() === 'líder' || userProfile?.name?.toLowerCase() === 'lider';

  // Determinar quais telas o usuário acessa (para perfis que não são admin/lider)
  const accessesMateriaPrima = isAdmin || canAccessPage('materia-prima');
  const accessesGestaCompras = isAdmin || canAccessPage('gestao-compras');
  const accessesGestaFrota   = isAdmin || canAccessPage('gestao-frota');
  const accessesControladoria = isAdmin || canAccessPage('controladoria');
  const accessesNotas         = isAdmin || isLider || canAccessPage('notas');
  const accessesArquivadas    = isAdmin || isLider || canAccessPage('arquivadas');

  // Notas arquivadas (para contar na seção de telas)
  const archivedInvoices = invoices.filter(inv => {
    if (inv.cancelled) return false;
    const allRecorded = inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;
    if (!inv.archived && !allRecorded) return false;
    if (hiddenCnpjs.has(inv.supplier_cnpj)) return false;
    if (allowedCnpjs && !allowedCnpjs.includes(inv.branch_cnpj)) return false;
    return true;
  });

  const archivedSet = new Set(archivedInvoices.map(inv => inv.id));

  const visibleInvoices = invoices.filter(inv => {
    if (inv.cancelled) return false;
    if (inv.archived) return false;
    if (inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded) return false;
    if (archivedSet.has(inv.id)) return false;
    if (hiddenCnpjs.has(inv.supplier_cnpj)) return false;
    if (allowedCnpjs && !allowedCnpjs.includes(inv.branch_cnpj)) return false;

    const s = supplierMap[inv.supplier_cnpj];

    // Se é líder: apenas notas fiscais normais (não especiais)
    if (isLider) {
      const isSpecial = s && (s.materia_prima || s.gestao_compras || s.gestao_frota || s.controladoria);
      return !isSpecial && accessesNotas;
    }

    // Admin ou outros perfis: filtrar por telas acessíveis
    if (s?.materia_prima) return accessesMateriaPrima;
    if (s?.gestao_compras) return accessesGestaCompras;
    if (s?.gestao_frota) return accessesGestaFrota;
    if (s?.controladoria) return accessesControladoria;
    return accessesNotas;
  });

  // Helper: count invoices by screen category
  // Replica exatamente a lógica de cada tela (mesmos filtros: não cancelada, não arquivada, não 100% concluída)
  // NF (/nf) e Matéria Prima NÃO entram na contagem de telas
  const isCompleted = (inv) => inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;

  const screenSummary = (invs, mpInvs) => {
    const screens = { materia_prima: [], notas: [], compras: [], frota: [], controladoria: [] };
    // Matéria Prima: usa pool separado que inclui concluídas (igual à tela MateriaPrima)
    if (mpInvs) {
      screens.materia_prima = mpInvs;
    }
    invs.forEach(inv => {
      const s = supplierMap[inv.supplier_cnpj];
      if (isCompleted(inv)) return;
      if (s?.materia_prima) { if (!mpInvs) screens.materia_prima.push(inv); return; }
      if (s?.gestao_compras) { screens.compras.push(inv); return; }
      if (s?.gestao_frota)   { screens.frota.push(inv);   return; }
      if (s?.controladoria)  { screens.controladoria.push(inv); return; }
      screens.notas.push(inv);
    });
    const summarize = (arr) => ({
      count: arr.length,
      sigv: arr.filter(i => i.sigv_recorded).length,
      topcon: arr.filter(i => i.topcon_recorded).length,
      boleto: arr.filter(i => i.boleto_recorded).length,
      value: arr.reduce((s, i) => s + (i.total_value || 0), 0),
    });
    return {
      materia_prima: summarize(screens.materia_prima),
      notas: summarize(screens.notas),
      compras: summarize(screens.compras),
      frota: summarize(screens.frota),
      controladoria: summarize(screens.controladoria),
    };
  };

  const countByScreen = (invs, archivedInvs) => {
    let materia_prima = 0, notas = 0, compras = 0, frota = 0, controladoria = 0, arquivadas = 0;
    invs.forEach(inv => {
      const s = supplierMap[inv.supplier_cnpj];
      if (s?.materia_prima) { if (!isCompleted(inv)) materia_prima++; return; }
      const completed = isCompleted(inv);
      if (s?.gestao_compras) { if (!completed) compras++; return; }
      if (s?.gestao_frota)   { if (!completed) frota++;   return; }
      if (s?.controladoria)  { if (!completed) controladoria++; return; }
      if (!completed) notas++;
    });
    if (archivedInvs) {
      archivedInvs.forEach(inv => {
        const s = supplierMap[inv.supplier_cnpj];
        if (!s?.materia_prima) arquivadas++;
      });
    }
    return { materia_prima, notas, compras, frota, controladoria, arquivadas };
  };

  // Pool completo de Matéria Prima: não canceladas, não arquivadas, fornecedor materia_prima, não ocultos, filiais permitidas
  // Igual ao filtro da tela MateriaPrima: não verifica hidden, só materia_prima === true
  const allMateriaPrimaInvoices = invoices.filter(inv => {
    if (inv.cancelled) return false;
    if (inv.archived) return false;
    if (allowedCnpjs && !allowedCnpjs.includes(inv.branch_cnpj)) return false;
    const s = supplierMap[inv.supplier_cnpj];
    return s?.materia_prima === true;
  });

  // Group invoices by branch (visible + archived)
  const grouped = {};
  visibleInvoices.forEach(inv => {
    const key = inv.branch_cnpj || "__sem_filial__";
    if (!grouped[key]) grouped[key] = { visible: [], archived: [] };
    grouped[key].visible.push(inv);
  });
  archivedInvoices.forEach(inv => {
    const key = inv.branch_cnpj || "__sem_filial__";
    if (!grouped[key]) grouped[key] = { visible: [], archived: [] };
    grouped[key].archived.push(inv);
  });

  // Build rows: one per branch that has invoices
  const rows = Object.entries(grouped).map(([cnpj, { visible: invs, archived: archInvs }]) => {
    const name = cnpj === "__sem_filial__" ? "Sem Filial" : (branchMap[cnpj] || cnpj);
    const total = invs.length;
    const sigv = invs.filter(i => i.sigv_recorded).length;
    const topcon = invs.filter(i => i.topcon_recorded).length;
    const boleto = invs.filter(i => i.boleto_recorded).length;
    const value = invs.reduce((s, i) => s + (i.total_value || 0), 0);
    const screens = countByScreen(invs, archInvs);
    const branchMPInvoices = allMateriaPrimaInvoices.filter(inv => (inv.branch_cnpj || '__sem_filial__') === cnpj);
    const screenStats = screenSummary(invs, branchMPInvoices);
    const archivedValue = archInvs.reduce((s, i) => s + (i.total_value || 0), 0);
    return { name, total, sigv, topcon, boleto, value, screens, screenStats, archivedValue };
  });

  // Sort by branch name
  rows.sort((a, b) => a.name.localeCompare(b.name));

  // Totals across all branches
  const allTotal  = visibleInvoices.length;
  const allSigv   = visibleInvoices.filter(i => i.sigv_recorded).length;
  const allTopcon = visibleInvoices.filter(i => i.topcon_recorded).length;
  const allBoleto = visibleInvoices.filter(i => i.boleto_recorded).length;
  const allValue  = visibleInvoices.reduce((s, i) => s + (i.total_value || 0), 0);
  const allScreens = countByScreen(visibleInvoices, archivedInvoices);
  const allScreenStats = screenSummary(visibleInvoices, allMateriaPrimaInvoices);
  const allArchivedValue = archivedInvoices.reduce((s, i) => s + (i.total_value || 0), 0);

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
          <BranchCard name="Todas as Filiais" total={allTotal} sigv={allSigv} topcon={allTopcon} boleto={allBoleto} value={allValue} screens={allScreens} screenStats={allScreenStats} archivedValue={allArchivedValue} highlight />

          {rows.map((row) => (
            <BranchCard key={row.name} name={row.name} total={row.total} sigv={row.sigv} topcon={row.topcon} boleto={row.boleto} value={row.value} screens={row.screens} screenStats={row.screenStats} archivedValue={row.archivedValue} />
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