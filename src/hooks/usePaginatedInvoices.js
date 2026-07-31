import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const INVOICE_PAGE_SIZE = 50;

export function usePaginatedInvoices({ documentType, filters, sortConfig, page, enabled = true }) {
  return useQuery({
    queryKey: ["invoicePage", documentType, filters, sortConfig, page],
    queryFn: async () => {
      const response = await base44.functions.invoke("listInvoicesPage", {
        documentType,
        filters,
        sortConfig,
        page,
        pageSize: INVOICE_PAGE_SIZE,
      });
      return response.data;
    },
    enabled,
    placeholderData: (previousData) => previousData,
    staleTime: 60 * 1000,
  });
}