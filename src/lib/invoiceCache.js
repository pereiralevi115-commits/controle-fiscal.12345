const monthYearOf = (value) => {
  if (!value) return "";
  const date = new Date(`${String(value).substring(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
};

const matchesPageFilters = (item, queryKey) => {
  const [, documentType, filters] = queryKey || [];
  if (!documentType || !filters) return true;

  const docType = item.document_type || "nfe";
  if (docType !== documentType) return false;
  if (filters.branch && filters.branch !== "all" && item.branch_cnpj !== filters.branch) return false;
  if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.cancelled === "ativas" && item.cancelled) return false;
  if (filters.cancelled === "canceladas" && !item.cancelled) return false;
  if (filters.sigv && filters.sigv !== "all" && (filters.sigv === "sim") !== !!item.sigv_recorded) return false;
  if (filters.topcon && filters.topcon !== "all" && (filters.topcon === "sim") !== !!item.topcon_recorded) return false;
  if (filters.boleto && filters.boleto !== "all" && (filters.boleto === "sim") !== !!item.boleto_recorded) return false;
  if (filters.monthYear && filters.monthYear !== "all" && monthYearOf(item.issue_date) !== filters.monthYear) return false;

  const allRecorded = item.sigv_recorded && item.topcon_recorded && item.boleto_recorded;
  if (filters.archivedMode === "archived") {
    if (!item.archived && !allRecorded) return false;
    if (item.cancelled) return false;
  } else if (filters.cancelled !== "canceladas") {
    if (item.archived || allRecorded) return false;
  }

  return true;
};

export function updateInvoiceInCaches(queryClient, invoiceId, data) {
  queryClient.getQueriesData({ queryKey: ["invoicePage"] }).forEach(([queryKey, old]) => {
    if (!old || !Array.isArray(old.items)) return;
    const previousItem = old.items.find((item) => item.id === invoiceId);
    if (!previousItem) return;

    const updatedItem = { ...previousItem, ...data };
    const shouldKeep = matchesPageFilters(updatedItem, queryKey);
    queryClient.setQueryData(queryKey, {
      ...old,
      total: shouldKeep ? old.total : Math.max(0, (old.total || 0) - 1),
      items: shouldKeep
        ? old.items.map((item) => item.id === invoiceId ? updatedItem : item)
        : old.items.filter((item) => item.id !== invoiceId),
    });
  });

  queryClient.setQueriesData({ queryKey: ["invoices"] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((item) => item.id === invoiceId ? { ...item, ...data } : item);
  });
}

export function removeInvoiceFromCaches(queryClient, invoiceId) {
  queryClient.setQueriesData({ queryKey: ["invoicePage"] }, (old) => {
    if (!old || !Array.isArray(old.items)) return old;
    return {
      ...old,
      total: Math.max(0, (old.total || 0) - 1),
      items: old.items.filter((item) => item.id !== invoiceId),
    };
  });

  queryClient.setQueriesData({ queryKey: ["invoices"] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.filter((item) => item.id !== invoiceId);
  });
}