import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar filiais e encontrar Criciúma
    const branches = await base44.asServiceRole.entities.Branch.list();
    const criciumaBranch = branches.find(b =>
      b.name?.toUpperCase().includes('CRICIUMA') ||
      b.name?.toUpperCase().includes('CRICIÚMA')
    );

    if (!criciumaBranch) {
      return Response.json({ error: 'Filial Criciúma não encontrada' }, { status: 404 });
    }

    // Buscar todas as notas da filial Criciúma
    const allInvoices = await base44.asServiceRole.entities.Invoice.list('-issue_date', 100000);
    const invoices = allInvoices.filter(inv =>
      inv.branch_cnpj === criciumaBranch.cnpj && !inv.cancelled
    );

    // Formatar retorno com todos os campos relevantes
    const result = invoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      series: inv.series,
      access_key: inv.access_key,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      status: inv.status,
      supplier_name: inv.supplier_name,
      supplier_cnpj: inv.supplier_cnpj,
      recipient_name: inv.recipient_name,
      recipient_cnpj: inv.recipient_cnpj,
      operation_nature: inv.operation_nature,
      total_value: inv.total_value,
      total_products: inv.total_products,
      total_freight: inv.total_freight,
      total_discount: inv.total_discount,
      tax_icms: inv.tax_icms,
      tax_ipi: inv.tax_ipi,
      tax_pis: inv.tax_pis,
      tax_cofins: inv.tax_cofins,
      additional_info: inv.additional_info,
      sigv_recorded: inv.sigv_recorded,
      topcon_recorded: inv.topcon_recorded,
      boleto_recorded: inv.boleto_recorded,
      archived: inv.archived,
      items: (inv.items || []).map(item => ({
        code: item.code,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_value: item.unit_value,
        total: item.total,
        ncm: item.ncm,
        cfop: item.cfop,
      })),
      installments: inv.installments || [],
    }));

    return Response.json({
      branch: criciumaBranch,
      total: result.length,
      invoices: result,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});