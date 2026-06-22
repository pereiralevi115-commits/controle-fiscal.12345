import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Carregador central de notas fiscais para as LISTAS.
 *
 * Para deixar o sistema rápido com muitas notas, buscamos do servidor apenas
 * os campos que as telas de listagem (tabelas, filtros e tooltips) realmente
 * usam, omitindo os campos mais pesados que só aparecem ao abrir uma nota:
 *   - additional_info (texto longo de informações complementares)
 *   - xml_url, access_key, protocol_*, dados de endereço completos, etc.
 *
 * Os detalhes completos são recarregados sob demanda quando o usuário
 * abre uma nota específica (ver InvoiceDetailDialog).
 *
 * Todas as telas compartilham a mesma queryKey (["invoices"]), então o
 * React Query carrega os dados uma única vez e reaproveita entre as páginas.
 */

// Campos necessários para as listas, filtros, tooltips e ações.
const LIST_FIELDS = [
  "id",
  "branch_cnpj",
  "supplier_name",
  "supplier_cnpj",
  "recipient_name",
  "recipient_cnpj",
  "series",
  "number",
  "issue_date",
  "due_date",
  "due_date_edited",
  "total_value",
  "total_products",
  "tax_icms",
  "tax_ipi",
  "tax_pis",
  "status",
  "cancelled",
  "cancellation_date",
  "archived",
  "archive_notes",
  "sigv_recorded",
  "topcon_recorded",
  "boleto_recorded",
  "internal_notes",
  "internal_notes_list",
  "additional_info",
  "items",
  "installments",
  "payments",
];

const PAGE_SIZE = 5000; // limite máximo por requisição do servidor

async function fetchAllInvoices() {
  const all = [];
  let skip = 0;
  while (true) {
    const page = await base44.entities.Invoice.list("-issue_date", PAGE_SIZE, skip, LIST_FIELDS);
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: fetchAllInvoices,
  });
}