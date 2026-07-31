export function updateInvoiceInCaches(queryClient, invoiceId, data) {
  queryClient.setQueriesData({ queryKey: ["invoicePage"] }, (old) => {
    if (!old || !Array.isArray(old.items)) return old;
    return {
      ...old,
      items: old.items.map((item) => item.id === invoiceId ? { ...item, ...data } : item),
    };
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