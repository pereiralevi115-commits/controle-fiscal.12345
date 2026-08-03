import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAllowedCnpjs, getUserProfile, isConcretarTomador, normalizeText } from '../../shared/invoiceAccess.ts';

const DASHBOARD_FIELDS = [
  'id', 'document_type', 'branch_cnpj', 'supplier_cnpj', 'tomador_name', 'issue_date', 'total_value',
  'cancelled', 'archived', 'sigv_recorded', 'topcon_recorded', 'boleto_recorded'
];

function isCompleted(inv) {
  return !!inv.sigv_recorded && !!inv.topcon_recorded && !!inv.boleto_recorded;
}

function issueDateQuery(startDate, endDate) {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.$gte = startDate;
  if (endDate) range.$lte = endDate;
  return { issue_date: range };
}

async function listInvoices(base44, query) {
  const rows = [];
  let skip = 0;
  const limit = 1000;
  while (true) {
    const page = Object.keys(query).length > 0
      ? await base44.asServiceRole.entities.Invoice.filter(query, '-issue_date', limit, skip, DASHBOARD_FIELDS)
      : await base44.asServiceRole.entities.Invoice.list('-issue_date', limit, skip, DASHBOARD_FIELDS);
    rows.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }
  return rows;
}

function summarize(arr) {
  return {
    count: arr.length,
    sigv: arr.filter((i) => i.sigv_recorded).length,
    topcon: arr.filter((i) => i.topcon_recorded).length,
    boleto: arr.filter((i) => i.boleto_recorded).length,
    value: arr.reduce((sum, i) => sum + (i.total_value || 0), 0),
  };
}

function splitDoc(arr) {
  return {
    nfe: summarize(arr.filter((i) => (i.document_type || 'nfe') !== 'nfse')),
    nfse: summarize(arr.filter((i) => (i.document_type || 'nfe') === 'nfse')),
  };
}

function screenSummary(invoices, materiaPrimaInvoices, supplierMap) {
  const screens = { materia_prima: materiaPrimaInvoices || [], notas: [], nfse: [], compras: [], frota: [], controladoria: [] };
  invoices.forEach((inv) => {
    const supplier = supplierMap[inv.supplier_cnpj];
    if (isCompleted(inv)) return;
    if (supplier?.materia_prima) {
      if (!materiaPrimaInvoices) screens.materia_prima.push(inv);
      return;
    }
    if (supplier?.gestao_compras) { screens.compras.push(inv); return; }
    if (supplier?.gestao_frota) { screens.frota.push(inv); return; }
    if (supplier?.controladoria) { screens.controladoria.push(inv); return; }
    if ((inv.document_type || 'nfe') === 'nfse') { screens.nfse.push(inv); return; }
    screens.notas.push(inv);
  });
  return {
    materia_prima: summarize(screens.materia_prima),
    notas: summarize(screens.notas),
    nfse: summarize(screens.nfse),
    compras: summarize(screens.compras),
    frota: summarize(screens.frota),
    controladoria: summarize(screens.controladoria),
    compras_split: splitDoc(screens.compras),
    frota_split: splitDoc(screens.frota),
    controladoria_split: splitDoc(screens.controladoria),
  };
}

function countByScreen(invoices, archivedInvoices, materiaPrimaInvoices, supplierMap) {
  const counts = {
    materia_prima: materiaPrimaInvoices ? materiaPrimaInvoices.length : 0,
    notas: 0,
    nfse: 0,
    compras: 0,
    frota: 0,
    controladoria: 0,
    arquivadas: 0,
    arquivadas_nfe: 0,
    arquivadas_nfse: 0,
    compras_nfe: 0,
    compras_nfse: 0,
    frota_nfe: 0,
    frota_nfse: 0,
    controladoria_nfe: 0,
    controladoria_nfse: 0,
  };

  invoices.forEach((inv) => {
    const supplier = supplierMap[inv.supplier_cnpj];
    if (supplier?.materia_prima) return;
    const completed = isCompleted(inv);
    const docNfse = (inv.document_type || 'nfe') === 'nfse';
    if (supplier?.gestao_compras) { if (!completed) { counts.compras++; if (docNfse) counts.compras_nfse++; else counts.compras_nfe++; } return; }
    if (supplier?.gestao_frota) { if (!completed) { counts.frota++; if (docNfse) counts.frota_nfse++; else counts.frota_nfe++; } return; }
    if (supplier?.controladoria) { if (!completed) { counts.controladoria++; if (docNfse) counts.controladoria_nfse++; else counts.controladoria_nfe++; } return; }
    if (completed) return;
    if (docNfse) counts.nfse++;
    else counts.notas++;
  });

  archivedInvoices.forEach((inv) => {
    const supplier = supplierMap[inv.supplier_cnpj];
    if (supplier?.materia_prima) return;
    counts.arquivadas++;
    if ((inv.document_type || 'nfe') === 'nfse') counts.arquivadas_nfse++;
    else counts.arquivadas_nfe++;
  });

  return counts;
}

function cteStatsOf(arr) {
  const concretar = arr.filter(isConcretarTomador);
  const outros = arr.filter((i) => !isConcretarTomador(i));
  const summarizeCte = (items) => ({ count: items.length, value: items.reduce((sum, i) => sum + (i.total_value || 0), 0) });
  return {
    count: arr.length,
    value: arr.reduce((sum, i) => sum + (i.total_value || 0), 0),
    concretar: summarizeCte(concretar),
    outros: summarizeCte(outros),
  };
}

function byBranch(rows) {
  return rows.reduce((acc, inv) => {
    const key = inv.branch_cnpj || '__sem_filial__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {});
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const startDate = String(payload?.startDate || '').slice(0, 10);
    const endDate = String(payload?.endDate || '').slice(0, 10);

    const [branches, suppliers, profile] = await Promise.all([
      base44.asServiceRole.entities.Branch.list(),
      base44.asServiceRole.entities.Supplier.list(),
      getUserProfile(base44, user),
    ]);

    const allowedCnpjs = await getAllowedCnpjs(base44, user, profile, branches, false);
    const supplierMap = Object.fromEntries(suppliers.map((supplier) => [supplier.cnpj, supplier]));
    const hiddenCnpjs = new Set(suppliers.filter((supplier) => supplier.hidden).map((supplier) => supplier.cnpj));
    const branchMap = Object.fromEntries(branches.map((branch) => [branch.cnpj, branch.name]));

    const allInvoices = await listInvoices(base44, issueDateQuery(startDate, endDate));
    const nfeAndNfse = allInvoices.filter((inv) => (inv.document_type || 'nfe') !== 'cte');
    const cteList = allInvoices.filter((inv) => (inv.document_type || 'nfe') === 'cte' && !inv.cancelled);
    const nfseList = allInvoices.filter((inv) => (inv.document_type || 'nfe') === 'nfse' && !inv.cancelled);

    const isAdmin = user?.role === 'admin';
    const isLider = normalizeText(profile?.name) === 'lider';
    const pages = Array.isArray(profile?.pages) ? profile.pages : [];
    const canAccessPage = (pageKey) => isAdmin || pages.includes(pageKey);
    const accessesMateriaPrima = isAdmin || canAccessPage('materia-prima');
    const accessesGestaoCompras = isAdmin || canAccessPage('gestao-compras');
    const accessesGestaoFrota = isAdmin || canAccessPage('gestao-frota');
    const accessesControladoria = isAdmin || canAccessPage('controladoria');
    const accessesNotas = isAdmin || isLider || canAccessPage('notas');

    const branchAllowed = (inv) => !allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj);

    const archivedInvoices = nfeAndNfse.filter((inv) => {
      if (inv.cancelled) return false;
      if (!inv.archived && !isCompleted(inv)) return false;
      if (hiddenCnpjs.has(inv.supplier_cnpj)) return false;
      return branchAllowed(inv);
    });

    const cancelledInvoices = nfeAndNfse.filter((inv) => inv.cancelled && branchAllowed(inv));
    const archivedSet = new Set(archivedInvoices.map((inv) => inv.id));

    const visibleInvoices = nfeAndNfse.filter((inv) => {
      if (inv.cancelled || inv.archived || isCompleted(inv) || archivedSet.has(inv.id)) return false;
      if (hiddenCnpjs.has(inv.supplier_cnpj)) return false;
      if (!branchAllowed(inv)) return false;
      const supplier = supplierMap[inv.supplier_cnpj];
      if (isLider) {
        const isSpecial = supplier && (supplier.materia_prima || supplier.gestao_compras || supplier.gestao_frota || supplier.controladoria);
        return !isSpecial && accessesNotas;
      }
      if (supplier?.materia_prima) return accessesMateriaPrima;
      if (supplier?.gestao_compras) return accessesGestaoCompras;
      if (supplier?.gestao_frota) return accessesGestaoFrota;
      if (supplier?.controladoria) return accessesControladoria;
      return accessesNotas;
    });

    const allMateriaPrimaInvoices = nfeAndNfse.filter((inv) => {
      if (inv.cancelled || inv.archived) return false;
      if (!branchAllowed(inv)) return false;
      return supplierMap[inv.supplier_cnpj]?.materia_prima === true;
    });

    const filteredCte = cteList.filter(branchAllowed);
    const filteredNfse = nfseList.filter((inv) => {
      if (inv.archived || isCompleted(inv)) return false;
      if (!branchAllowed(inv)) return false;
      const supplier = supplierMap[inv.supplier_cnpj];
      return !(supplier?.gestao_frota || supplier?.gestao_compras || supplier?.controladoria);
    });

    const cteByBranch = byBranch(filteredCte);
    const nfseByBranch = byBranch(filteredNfse);
    const grouped = {};
    const ensureGroup = (key) => {
      if (!grouped[key]) grouped[key] = { visible: [], archived: [], cancelled: [] };
      return grouped[key];
    };
    visibleInvoices.forEach((inv) => ensureGroup(inv.branch_cnpj || '__sem_filial__').visible.push(inv));
    archivedInvoices.forEach((inv) => ensureGroup(inv.branch_cnpj || '__sem_filial__').archived.push(inv));
    cancelledInvoices.forEach((inv) => ensureGroup(inv.branch_cnpj || '__sem_filial__').cancelled.push(inv));
    [...filteredCte, ...filteredNfse].forEach((inv) => ensureGroup(inv.branch_cnpj || '__sem_filial__'));

    const rows = Object.entries(grouped).map(([cnpj, group]) => {
      const name = cnpj === '__sem_filial__' ? 'Sem Filial' : (branchMap[cnpj] || cnpj);
      const branchMPInvoices = allMateriaPrimaInvoices.filter((inv) => (inv.branch_cnpj || '__sem_filial__') === cnpj);
      const screens = countByScreen(group.visible, group.archived, branchMPInvoices, supplierMap);
      const screenStats = screenSummary(group.visible, branchMPInvoices, supplierMap);
      const nonMpArchived = group.archived.filter((inv) => !supplierMap[inv.supplier_cnpj]?.materia_prima);
      const archivedValue = group.archived.reduce((sum, inv) => sum + (inv.total_value || 0), 0);
      const archivedNfeValue = nonMpArchived.filter((inv) => (inv.document_type || 'nfe') !== 'nfse').reduce((sum, inv) => sum + (inv.total_value || 0), 0);
      const archivedNfseValue = nonMpArchived.filter((inv) => (inv.document_type || 'nfe') === 'nfse').reduce((sum, inv) => sum + (inv.total_value || 0), 0);
      const cancelledNfe = group.cancelled.filter((inv) => (inv.document_type || 'nfe') !== 'nfse');
      const cancelledNfse = group.cancelled.filter((inv) => (inv.document_type || 'nfe') === 'nfse');
      return {
        cnpj,
        name,
        total: group.visible.length,
        sigv: group.visible.filter((i) => i.sigv_recorded).length,
        topcon: group.visible.filter((i) => i.topcon_recorded).length,
        boleto: group.visible.filter((i) => i.boleto_recorded).length,
        value: group.visible.reduce((sum, i) => sum + (i.total_value || 0), 0),
        screens,
        screenStats,
        archivedValue,
        archivedNfeValue,
        archivedNfseValue,
        cancelledNfeCount: cancelledNfe.length,
        cancelledNfseCount: cancelledNfse.length,
        cancelledNfeValue: cancelledNfe.reduce((sum, i) => sum + (i.total_value || 0), 0),
        cancelledNfseValue: cancelledNfse.reduce((sum, i) => sum + (i.total_value || 0), 0),
        cteStats: cteStatsOf(cteByBranch[cnpj] || []),
        nfseStats: summarize(nfseByBranch[cnpj] || []),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const allScreens = countByScreen(visibleInvoices, archivedInvoices, allMateriaPrimaInvoices, supplierMap);
    const allScreenStats = screenSummary(visibleInvoices, allMateriaPrimaInvoices, supplierMap);
    const allNonMpArchived = archivedInvoices.filter((inv) => !supplierMap[inv.supplier_cnpj]?.materia_prima);
    const allCancelledNfe = cancelledInvoices.filter((inv) => (inv.document_type || 'nfe') !== 'nfse');
    const allCancelledNfse = cancelledInvoices.filter((inv) => (inv.document_type || 'nfe') === 'nfse');
    const allCteStats = cteStatsOf(filteredCte);
    const allNfseStats = summarize(filteredNfse);

    const branchBreakdown = rows.map((row) => ({
      name: row.name,
      tiles: {
        notas: { count: row.screens.notas, value: row.screenStats?.notas?.value || 0 },
        nfse: { count: row.screens.nfse, value: row.screenStats?.nfse?.value || 0 },
        cte: { count: row.cteStats?.count || 0, value: row.cteStats?.value || 0 },
        cte_concretar: { count: row.cteStats?.concretar?.count || 0, value: row.cteStats?.concretar?.value || 0 },
        cte_outros: { count: row.cteStats?.outros?.count || 0, value: row.cteStats?.outros?.value || 0 },
        materia_prima: { count: row.screens.materia_prima, value: row.screenStats?.materia_prima?.value || 0 },
        compras_nfe: { count: row.screens.compras_nfe, value: row.screenStats?.compras_split?.nfe?.value || 0 },
        compras_nfse: { count: row.screens.compras_nfse, value: row.screenStats?.compras_split?.nfse?.value || 0 },
        frota_nfe: { count: row.screens.frota_nfe, value: row.screenStats?.frota_split?.nfe?.value || 0 },
        frota_nfse: { count: row.screens.frota_nfse, value: row.screenStats?.frota_split?.nfse?.value || 0 },
        controladoria_nfe: { count: row.screens.controladoria_nfe, value: row.screenStats?.controladoria_split?.nfe?.value || 0 },
        controladoria_nfse: { count: row.screens.controladoria_nfse, value: row.screenStats?.controladoria_split?.nfse?.value || 0 },
        arquivadas_nfe: { count: row.screens.arquivadas_nfe, value: row.archivedNfeValue || 0 },
        arquivadas_nfse: { count: row.screens.arquivadas_nfse, value: row.archivedNfseValue || 0 },
        canceladas_nfe: { count: row.cancelledNfeCount || 0, value: row.cancelledNfeValue || 0 },
        canceladas_nfse: { count: row.cancelledNfseCount || 0, value: row.cancelledNfseValue || 0 },
      },
    }));

    return Response.json({
      rows,
      isLider,
      allTotal: visibleInvoices.length,
      allSigv: visibleInvoices.filter((i) => i.sigv_recorded).length,
      allTopcon: visibleInvoices.filter((i) => i.topcon_recorded).length,
      allBoleto: visibleInvoices.filter((i) => i.boleto_recorded).length,
      allValue: visibleInvoices.reduce((sum, i) => sum + (i.total_value || 0), 0),
      allScreens,
      allScreenStats,
      allArchivedValue: archivedInvoices.reduce((sum, i) => sum + (i.total_value || 0), 0),
      allArchivedNfeValue: allNonMpArchived.filter((i) => (i.document_type || 'nfe') !== 'nfse').reduce((sum, i) => sum + (i.total_value || 0), 0),
      allArchivedNfseValue: allNonMpArchived.filter((i) => (i.document_type || 'nfe') === 'nfse').reduce((sum, i) => sum + (i.total_value || 0), 0),
      allCancelledNfeCount: allCancelledNfe.length,
      allCancelledNfseCount: allCancelledNfse.length,
      allCancelledNfeValue: allCancelledNfe.reduce((sum, i) => sum + (i.total_value || 0), 0),
      allCancelledNfseValue: allCancelledNfse.reduce((sum, i) => sum + (i.total_value || 0), 0),
      cteStats: allCteStats,
      nfseStats: allNfseStats,
      branchBreakdown,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}