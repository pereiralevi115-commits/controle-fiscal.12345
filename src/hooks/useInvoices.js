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
  "document_type",
  "branch_cnpj",
  "supplier_name",
  "supplier_cnpj",
  "recipient_name",
  "recipient_cnpj",
  "tomador_name",
  "tomador_cnpj",
  "tomador_type",
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
  "sigv_recorded_by_id",
  "sigv_recorded_by_name",
  "sigv_recorded_at",
  "sigv_updated_by_id",
  "sigv_updated_by_name",
  "sigv_updated_at",
  "topcon_recorded",
  "topcon_recorded_by_id",
  "topcon_recorded_by_name",
  "topcon_recorded_at",
  "topcon_updated_by_id",
  "topcon_updated_by_name",
  "topcon_updated_at",
  "boleto_recorded",
  "boleto_recorded_by_id",
  "boleto_recorded_by_name",
  "boleto_recorded_at",
  "boleto_updated_by_id",
  "boleto_updated_by_name",
  "boleto_updated_at",
  "internal_notes",
  "internal_notes_list",
  "additional_info",
  "service_description",
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

// As listagens de NF-e (NFe, MatériaPrima, Gestão de Compras, Frota, Controladoria,
// Arquivadas, Canceladas, Dashboard, etc.) só lidam com NF-e. CT-e e NFS-e têm telas
// próprias, então filtramos aqui para preservar o comportamento das telas existentes.
function filterByType(invoices, type) {
  if (!type) return invoices;
  const types = Array.isArray(type) ? type : [type];
  return invoices.filter((inv) => {
    const docType = inv.document_type || "nfe"; // legado: notas antigas sem o campo são NF-e
    return types.includes(docType);
  });
}

export function useInvoices(documentType = "nfe") {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: fetchAllInvoices,
    select: (data) => filterByType(data, documentType),
  });
}