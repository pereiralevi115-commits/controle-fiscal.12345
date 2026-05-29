import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_PASSWORD = "123456";

Deno.serve(async (req) => {
    try {
        // Verificar senha
        const body = await req.json().catch(() => ({}));
        const senha = body.senha || req.headers.get("x-api-password");

        if (senha !== API_PASSWORD) {
            return Response.json({ error: "Senha inválida" }, { status: 401 });
        }

        const base44 = createClientFromRequest(req);

        // Buscar filiais
        const branches = await base44.asServiceRole.entities.Branch.list();
        const criciumaBranch = branches.find(b =>
            b.name?.toUpperCase().includes("CRICIUMA") ||
            b.name?.toUpperCase().includes("CRICIÚMA")
        );

        if (!criciumaBranch) {
            return Response.json({ error: "Filial Criciúma não encontrada" }, { status: 404 });
        }

        // Buscar todas as notas
        const allInvoices = await base44.asServiceRole.entities.Invoice.list("-issue_date", 250000);

        // Filtrar as de Criciúma (não canceladas)
        const invoices = allInvoices
            .filter(inv => inv.branch_cnpj === criciumaBranch.cnpj && !inv.cancelled)
            .map(inv => ({
                id: inv.id,
                number: inv.number,
                series: inv.series,
                issue_date: inv.issue_date,
                due_date: inv.due_date,
                total_value: inv.total_value,
                total_products: inv.total_products,
                total_freight: inv.total_freight,
                total_discount: inv.total_discount,
                supplier_name: inv.supplier_name,
                supplier_cnpj: inv.supplier_cnpj,
                recipient_name: inv.recipient_name,
                recipient_cnpj: inv.recipient_cnpj,
                operation_nature: inv.operation_nature,
                status: inv.status,
                additional_info: inv.additional_info,
                access_key: inv.access_key,
                sigv_recorded: inv.sigv_recorded || false,
                topcon_recorded: inv.topcon_recorded || false,
                boleto_recorded: inv.boleto_recorded || false,
                archived: inv.archived || false,
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
                installments: (inv.installments || []).map(p => ({
                    number: p.number,
                    due_date: p.due_date,
                    value: p.value,
                })),
                tax_icms: inv.tax_icms,
                tax_ipi: inv.tax_ipi,
                tax_pis: inv.tax_pis,
                tax_cofins: inv.tax_cofins,
            }));

        return Response.json({
            branch: { name: criciumaBranch.name, cnpj: criciumaBranch.cnpj },
            total: invoices.length,
            invoices,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});