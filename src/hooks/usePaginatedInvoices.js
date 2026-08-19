import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const INVOICE_PAGE_SIZE = 25;

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export function usePaginatedInvoices({ documentType, filters, sortConfig, page, enabled = true }) {
  const debouncedFilters = useDebouncedValue(filters);

  return useQuery({
    queryKey: ["invoicePage", documentType, debouncedFilters, sortConfig, page],
    queryFn: async () => {
      const response = await base44.functions.invoke("listInvoicesPage", {
        documentType,
        filters: debouncedFilters,
        sortConfig,
        page,
        pageSize: INVOICE_PAGE_SIZE,
      });
      return response.data;
    },
    enabled,
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
  });
}