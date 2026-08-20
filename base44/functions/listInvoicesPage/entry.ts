import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAllowedCnpjs, isConcretarTomador, normalizeText } from '../../shared/invoiceAccess.ts';

const PAGE_SIZE = 25;
const IMPOSSIBLE_QUERY = { id: '__no_invoice_match__' };
const CACHE_TTL_MS = 60 * 1000;
const summaryCache = new Map();
const supplierCache = { expiresAt: 0, rows: null };
const pageRowsCache = new Map();

const SUMMARY_FIELDS = [
  'id', 'document_type', 'branch_cnpj', 'supplier_name', 'supplier_cnpj', 'tomador_name', 'tomador_cnpj',
  'series', 'number', 'issue_date', 'due_date', 'total_value', 'status', 'cancelled', 'archived', 'service_description',
  'sigv_recorded', 'topcon_recorded', 'boleto_recorded'
];

const PAGE_FIELDS = [
  ...SUMMARY_FIELDS,
  'recipient_name', 'recipient_cnpj', 'series', 'due_date_edited', 'total_products', 'tax_icms', 'tax_ipi', 'tax_pis',
  'additional_info', 'items', 'installments', 'payments', 'service_description', 'internal_notes', 'internal_notes_list',
  'archive_notes', 'cancelled_by_id', 'cancelled_by_name', 'cancelled_at', 'cancellation_date',
  'sigv_recorded_by_id', 'sigv_recorded_by_name', 'sigv_recorded_at', 'sigv_updated_by_id', 'sigv_updated_by_name', 'sigv_updated_at',
  'topcon_recorded_by_id', 'topcon_recorded_by_name', 'topcon_recorded_at', 'topcon_updated_by_id', 'topcon_updated_by_name', 'topcon_updated_at',
  'boleto_recorded_by_id', 'boleto_recorded_by_name', 'boleto_recorded_at', 'boleto_updated_by_id', 'boleto_updated_by_name', 'boleto_updated_at',
  'product_description', 'origin_documents'
];

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
  const key = JSON.stringify(query || {});
  const cached = summaryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;

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
  summaryCache.set(key, { rows, expiresAt: Date.now() + CACHE_TTL_MS });
  return rows;
}

async function listSuppliers(base44) {
  if (supplierCache.rows && supplierCache.expiresAt > Date.now()) return supplierCache.rows;
  const rows = await base44.asServiceRole.entities.Supplier.list();
  supplierCache.rows = rows;
  supplierCache.expiresAt = Date.now() + CACHE_TTL_MS;
  return rows;
}

async function listPageRows(base44, ids, pageSize) {
  if (ids.length === 0) return [];
  const key = ids.join('|');
  const cached = pageRowsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const rows = await base44.asServiceRole.entities.Invoice.filter({ id: { $in: ids } }, '-issue_date', pageSize, 0, PAGE_FIELDS);
  pageRowsCache.set(key, { rows, expiresAt: Date.now() + CACHE_TTL_MS });
  return rows;
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
  if (filters?.categoryFlag) {
    const cnpjs = suppliers.filter((supplier) => supplier[filters.categoryFlag] === true).map((supplier) => supplier.cnpj).filter(Boolean);
    if (cnpjs.length === 0) return false;
    query.supplier_cnpj = { $in: cnpjs };
    return true;
  }

  if (!filters?.includeAllSuppliers) {
    const excludedCnpjs = suppliers
      .filter((supplier) => supplier.hidden || supplier.materia_prima || (!filters?.includeManagementSuppliers && (supplier.gestao_compras || supplier.gestao_frota || supplier.controladoria)))
      .map((supplier) => supplier.cnpj)
      .filter(Boolean);
    if (excludedCnpjs.length > 0) query.supplier_cnpj = { $nin: excludedCnpjs };
  }

  return true;
}

function buildInvoiceQuery(filters, allowedCnpjs, suppliers) {
  const query = {};
  const documentType = filters?.documentType || 'nfe';

  query.document_type = documentType;
  if (!applyBranchQuery(query, filters, allowedCnpjs)) return IMPOSSIBLE_QUERY;
  if (!applySupplierQuery(query, filters, suppliers)) return IMPOSSIBLE_QUERY;

  if (filters?.status && filters.status !== 'all') query.status = filters.status;
  if (filters?.cancelled === 'canceladas') query.cancelled = true;
  else if (filters?.cancelled === 'ativas' || filters?.archivedMode === 'archived') query.cancelled = { $ne: true };

  if (filters?.archivedMode !== 'archived' && filters?.cancelled !== 'canceladas') {
    query.archived = { $ne: true };
  }

  if (filters?.sigv === 'sim') query.sigv_recorded = true;
  if (filters?.sigv === 'nao') query.sigv_recorded = { $ne: true };
  if (filters?.topcon === 'sim') query.topcon_recorded = true;
  if (filters?.topcon === 'nao') query.topcon_recorded = { $ne: true };
  if (filters?.boleto === 'sim') query.boleto_recorded = true;
  if (filters?.boleto === 'nao') query.boleto_recorded = { $ne: true };

  const dateRange = issueDateRange(filters?.monthYear);
  if (dateRange) query.issue_date = dateRange;

  const rawSearch = String(filters?.search || '').trim();
  if (/^\d+$/.test(rawSearch)) query.number = rawSearch;

  return query;
}

function supplierAllowed(inv, supplierByCnpj, filters) {
  const supplier = supplierByCnpj.get(inv.supplier_cnpj || '');
  if (filters?.includeAllSuppliers) return true;
  if (filters?.categoryFlag) return !!supplier && supplier[filters.categoryFlag] === true;
  if (!supplier) return true;
  if (supplier.hidden) return false;
  if (supplier.materia_prima) return false;
  if (filters?.includeManagementSuppliers) return true;
  if (supplier.gestao_compras || supplier.gestao_frota || supplier.controladoria) return false;
  return true;
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

function compactReportRow(row) {
  return {
    id: row.id,
    document_type: row.document_type,
    branch_cnpj: row.branch_cnpj,
    supplier_name: row.supplier_name,
    supplier_cnpj: row.supplier_cnpj,
    series: row.series,
    number: row.number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    total_value: row.total_value,
    service_description: row.service_description,
    sigv_recorded: row.sigv_recorded,
    topcon_recorded: row.topcon_recorded,
    boleto_recorded: row.boleto_recorded,
  };
}

function compactPageRow(row) {
  const shortText = (value, max = 180) => {
    if (!value) return undefined;
    const text = String(value);
    return text.length > max ? `${text.slice(0, max)}...` : text;
  };

  return {
    id: row.id,
    document_type: row.document_type,
    branch_cnpj: row.branch_cnpj,
    supplier_name: row.supplier_name,
    supplier_cnpj: row.supplier_cnpj,
    recipient_name: row.recipient_name,
    recipient_cnpj: row.recipient_cnpj,
    tomador_name: row.tomador_name,
    tomador_cnpj: row.tomador_cnpj,
    series: row.series,
    number: row.number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    due_date_edited: row.due_date_edited,
    total_value: row.total_value,
    total_products: row.total_products,
    tax_icms: row.tax_icms,
    tax_ipi: row.tax_ipi,
    tax_pis: row.tax_pis,
    status: row.status,
    cancelled: row.cancelled,
    cancellation_date: row.cancellation_date,
    cancelled_by_id: row.cancelled_by_id,
    cancelled_by_name: row.cancelled_by_name,
    cancelled_at: row.cancelled_at,
    archived: row.archived,
    archive_notes: row.archive_notes,
    additional_info: shortText(row.additional_info),
    service_description: shortText(row.service_description),
    items: Array.isArray(row.items) ? row.items.slice(0, 6).map((item) => ({ description: shortText(item.description, 80) })) : [],
    installments: Array.isArray(row.installments) ? row.installments.map((inst) => ({ number: inst.number, due_date: inst.due_date, value: inst.value })) : [],
    payments: Array.isArray(row.payments) ? row.payments.map((pay) => ({ payment_type: pay.payment_type, value: pay.value })) : [],
    internal_notes: row.internal_notes,
    internal_notes_list: Array.isArray(row.internal_notes_list) ? row.internal_notes_list : [],
    sigv_recorded: row.sigv_recorded,
    sigv_recorded_by_name: row.sigv_recorded_by_name,
    sigv_recorded_at: row.sigv_recorded_at,
    sigv_updated_by_name: row.sigv_updated_by_name,
    sigv_updated_at: row.sigv_updated_at,
    topcon_recorded: row.topcon_recorded,
    topcon_recorded_by_name: row.topcon_recorded_by_name,
    topcon_recorded_at: row.topcon_recorded_at,
    topcon_updated_by_name: row.topcon_updated_by_name,
    topcon_updated_at: row.topcon_updated_at,
    boleto_recorded: row.boleto_recorded,
    boleto_recorded_by_name: row.boleto_recorded_by_name,
    boleto_recorded_at: row.boleto_recorded_at,
    boleto_updated_by_name: row.boleto_updated_by_name,
    boleto_updated_at: row.boleto_updated_at,
  };
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
    const [allowedCnpjs, suppliers] = await Promise.all([
      getAllowedCnpjs(base44, user),
      listSuppliers(base44),
    ]);
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

    if (payload?.allRecords) {
      return Response.json({ items: filtered.map(compactReportRow), total, page: 0, pageSize: total, availableMonths, tomadorCounts });
    }

    const pageSummaries = filtered.slice(page * pageSize, page * pageSize + pageSize);
    const ids = pageSummaries.map((inv) => inv.id);

    let items = pageSummaries;
    if (ids.length > 0) {
      const fullRows = await listPageRows(base44, ids, pageSize);
      const byId = new Map(fullRows.map((row) => [row.id, row]));
      items = pageSummaries.map((row) => compactPageRow(byId.get(row.id) || row));
    }

    return Response.json({ items, total, page, pageSize, availableMonths, tomadorCounts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}