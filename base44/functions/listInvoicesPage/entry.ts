import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PAGE_SIZE = 50;
const IMPOSSIBLE_QUERY = { id: '__no_invoice_match__' };

const SUMMARY_FIELDS = [
  'id', 'document_type', 'branch_cnpj', 'supplier_name', 'supplier_cnpj', 'recipient_name', 'recipient_cnpj',
  'tomador_name', 'tomador_cnpj', 'series', 'number', 'issue_date', 'due_date', 'due_date_edited', 'total_value', 'total_products',
  'tax_icms', 'tax_ipi', 'tax_pis', 'status', 'cancelled', 'cancellation_date', 'cancelled_by_id',
  'cancelled_by_name', 'cancelled_at', 'archived', 'archive_notes', 'sigv_recorded', 'sigv_recorded_by_id',
  'sigv_recorded_by_name', 'sigv_recorded_at', 'sigv_updated_by_id', 'sigv_updated_by_name', 'sigv_updated_at',
  'topcon_recorded', 'topcon_recorded_by_id', 'topcon_recorded_by_name', 'topcon_recorded_at',
  'topcon_updated_by_id', 'topcon_updated_by_name', 'topcon_updated_at', 'boleto_recorded',
  'boleto_recorded_by_id', 'boleto_recorded_by_name', 'boleto_recorded_at', 'boleto_updated_by_id',
  'boleto_updated_by_name', 'boleto_updated_at', 'internal_notes', 'internal_notes_list', 'service_description'
];

const PAGE_FIELDS = [
  ...SUMMARY_FIELDS,
  'additional_info', 'items', 'installments', 'payments', 'cte_modal', 'cte_cfop', 'cte_service_type',
  'cte_payment_type', 'cte_origin_city', 'cte_origin_state', 'cte_destination_city', 'cte_destination_state',
  'cte_tomador_name', 'cte_tomador_cnpj', 'cte_tomador_ie', 'cte_tomador_address', 'cte_tomador_number',
  'cte_tomador_district', 'cte_tomador_city', 'cte_tomador_state', 'cte_tomador_zip', 'cte_tomador_phone',
  'sender_name', 'sender_cnpj', 'sender_ie', 'sender_address', 'sender_number', 'sender_district',
  'sender_city', 'sender_state', 'sender_zip', 'sender_phone', 'expedidor_name', 'expedidor_cnpj',
  'recebedor_name', 'recebedor_cnpj', 'product_description', 'cargo_quantity', 'cargo_quantity_unit',
  'freight_components', 'origin_documents'
];

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function monthYearOf(value) {
  if (!value) return '';
  const date = new Date(`${String(value).substring(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function issueDateRange(monthYear) {
  if (!monthYear || monthYear === 'all') return null;
  const [month, year] = String(monthYear).split('-').map((part) => Number(part));
  if (!month || !year) return null;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    $gte: `${year}-${String(month).padStart(2, '0')}-01`,
    $lte: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

function sortRows(list, config) {
  const safeConfig = Array.isArray(config) && config.length > 0 ? config : [{ key: 'issue_date', direction: 'desc' }];
  return [...list].sort((a, b) => {
    for (const cfg of safeConfig) {
      const aValue = a[cfg.key];
      const bValue = b[cfg.key];
      if (aValue === null || aValue === undefined || aValue === '') return 1;
      if (bValue === null || bValue === undefined || bValue === '') return -1;
      const comparison = typeof aValue === 'string'
        ? aValue.localeCompare(bValue, 'pt-BR')
        : Number(aValue || 0) - Number(bValue || 0);
      if (comparison !== 0) return cfg.direction === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
}

async function listAll(base44, query) {
  const rows = [];
  let skip = 0;
  const limit = 1000;
  while (true) {
    const page = Object.keys(query).length > 0
      ? await base44.asServiceRole.entities.Invoice.filter(query, '-issue_date', limit, skip, SUMMARY_FIELDS)
      : await base44.asServiceRole.entities.Invoice.list('-issue_date', limit, skip, SUMMARY_FIELDS);
    rows.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }
  return rows;
}

async function getAllowedCnpjs(base44, user) {
  if (!user || user.role === 'admin') return null;
  if (!user.profile_id || !Array.isArray(user.branch_ids) || user.branch_ids.length === 0) return null;
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: user.profile_id });
  const profile = profiles[0];
  const isLider = normalizeText(profile?.name) === 'lider';
  if (!isLider) return null;
  const branches = await base44.asServiceRole.entities.Branch.list();
  return branches.filter((b) => user.branch_ids.includes(b.id)).map((b) => b.cnpj);
}

function applyBranchQuery(query, filters, allowedCnpjs) {
  let branchValues = Array.isArray(allowedCnpjs) && allowedCnpjs.length > 0 ? [...allowedCnpjs] : null;
  if (filters?.branch && filters.branch !== 'all') {
    if (branchValues && !branchValues.includes(filters.branch)) return false;
    branchValues = [filters.branch];
  }
  if (branchValues?.length === 1) query.branch_cnpj = branchValues[0];
  else if (branchValues?.length > 1) query.branch_cnpj = { $in: branchValues };
  return true;
}

function applySupplierQuery(query, filters, suppliers) {
  if (!filters?.categoryFlag) return true;
  const cnpjs = suppliers.filter((supplier) => supplier[filters.categoryFlag] === true).map((supplier) => supplier.cnpj).filter(Boolean);
  if (cnpjs.length === 0) return false;
  query.supplier_cnpj = { $in: cnpjs };
  return true;
}

function buildInvoiceQuery(filters, allowedCnpjs, suppliers) {
  const query = {};
  const documentType = filters?.documentType || 'nfe';

  if (documentType !== 'nfe') query.document_type = documentType;
  if (!applyBranchQuery(query, filters, allowedCnpjs)) return IMPOSSIBLE_QUERY;
  if (!applySupplierQuery(query, filters, suppliers)) return IMPOSSIBLE_QUERY;

  if (filters?.status && filters.status !== 'all') query.status = filters.status;
  if (filters?.cancelled === 'canceladas') query.cancelled = true;
  else if (filters?.cancelled === 'ativas' || filters?.archivedMode === 'archived') query.cancelled = { $ne: true };

  if (filters?.archivedMode !== 'archived' && filters?.cancelled !== 'canceladas') {
    query.archived = { $ne: true };
  }

  if (filters?.sigv === 'sim') query.sigv_recorded = true;
  if (filters?.topcon === 'sim') query.topcon_recorded = true;
  if (filters?.boleto === 'sim') query.boleto_recorded = true;

  const dateRange = issueDateRange(filters?.monthYear);
  if (dateRange) query.issue_date = dateRange;

  return query;
}

function supplierAllowed(inv, supplierByCnpj, filters) {
  const supplier = supplierByCnpj.get(inv.supplier_cnpj || '');
  if (filters?.includeAllSuppliers) return true;
  if (filters?.categoryFlag) return !!supplier && supplier[filters.categoryFlag] === true;
  if (!supplier) return true;
  if (supplier.hidden) return false;
  if (supplier.materia_prima) return false;
  if (supplier.gestao_compras || supplier.gestao_frota || supplier.controladoria) return false;
  return true;
}

function isConcretarTomador(inv) {
  return normalizeText(inv.tomador_name).includes('concretar');
}

function applyFilters(rows, filters, supplierByCnpj, allowedCnpjs, ignoreMonth = false) {
  const search = normalizeText(filters?.search || '');
  return rows.filter((inv) => {
    const docType = inv.document_type || 'nfe';
    const documentType = filters?.documentType || 'nfe';
    if (docType !== documentType) return false;
    if (allowedCnpjs && !allowedCnpjs.includes(inv.branch_cnpj)) return false;
    if (filters?.branch && filters.branch !== 'all' && inv.branch_cnpj !== filters.branch) return false;
    if (filters?.tomadorGroup === 'concretar' && !isConcretarTomador(inv)) return false;
    if (filters?.tomadorGroup === 'outros' && isConcretarTomador(inv)) return false;
    if (search && !normalizeText(inv.supplier_name).includes(search) && !String(inv.number || '').includes(filters.search || '')) return false;
    if (filters?.status && filters.status !== 'all' && inv.status !== filters.status) return false;
    if (filters?.cancelled === 'ativas' && inv.cancelled) return false;
    if (filters?.cancelled === 'canceladas' && !inv.cancelled) return false;
    if (filters?.sigv && filters.sigv !== 'all' && (filters.sigv === 'sim') !== !!inv.sigv_recorded) return false;
    if (filters?.topcon && filters.topcon !== 'all' && (filters.topcon === 'sim') !== !!inv.topcon_recorded) return false;
    if (filters?.boleto && filters.boleto !== 'all' && (filters.boleto === 'sim') !== !!inv.boleto_recorded) return false;
    if (!ignoreMonth && filters?.monthYear && filters.monthYear !== 'all' && monthYearOf(inv.issue_date) !== filters.monthYear) return false;
    const allRecorded = inv.sigv_recorded && inv.topcon_recorded && inv.boleto_recorded;
    if (filters?.archivedMode === 'archived') {
      if (!inv.archived && !allRecorded) return false;
      if (inv.cancelled) return false;
    } else if (filters?.cancelled !== 'canceladas') {
      if (inv.archived) return false;
      if (allRecorded) return false;
    }
    return supplierAllowed(inv, supplierByCnpj, filters);
  });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const page = Math.max(0, Number(payload?.page) || 0);
    const pageSize = Math.min(100, Math.max(10, Number(payload?.pageSize) || PAGE_SIZE));
    const filters = { ...(payload?.filters || {}), documentType: payload?.documentType || 'nfe' };
    const sortConfig = payload?.sortConfig || [{ key: 'issue_date', direction: 'desc' }];
    const allowedCnpjs = await getAllowedCnpjs(base44, user);
    const suppliers = await base44.asServiceRole.entities.Supplier.list();
    const supplierByCnpj = new Map(suppliers.map((s) => [s.cnpj, s]));
    const query = buildInvoiceQuery(filters, allowedCnpjs, suppliers);
    const summaryRows = await listAll(base44, query);

    const monthBase = applyFilters(summaryRows, filters, supplierByCnpj, allowedCnpjs, true);
    const availableMonths = Array.from(new Set(monthBase.map((inv) => monthYearOf(inv.issue_date)).filter(Boolean))).sort().reverse();
    const countFilters = { ...filters, tomadorGroup: undefined };
    const countBase = applyFilters(summaryRows, countFilters, supplierByCnpj, allowedCnpjs, true);
    const tomadorCounts = {
      concretar: countBase.filter(isConcretarTomador).length,
      outros: countBase.filter((inv) => !isConcretarTomador(inv)).length,
    };
    const filtered = sortRows(applyFilters(summaryRows, filters, supplierByCnpj, allowedCnpjs), sortConfig);
    const total = filtered.length;
    const pageSummaries = filtered.slice(page * pageSize, page * pageSize + pageSize);
    const ids = pageSummaries.map((inv) => inv.id);

    let items = pageSummaries;
    if (ids.length > 0) {
      const fullRows = await base44.asServiceRole.entities.Invoice.filter({ id: { $in: ids } }, '-issue_date', pageSize, 0, PAGE_FIELDS);
      const byId = new Map(fullRows.map((row) => [row.id, row]));
      items = pageSummaries.map((row) => byId.get(row.id) || row);
    }

    return Response.json({ items, total, page, pageSize, availableMonths, tomadorCounts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}