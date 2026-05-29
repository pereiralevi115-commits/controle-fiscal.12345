import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CRICIUMA_EXTRA_CNPJ = '01273320000420';

Deno.serve(async (req) => {
    try {
        let body = {};
        try { body = await req.json(); } catch (_) {}

        const senha = body.senha || req.headers.get("x-api-password");
        if (senha !== "123456") {
            return Response.json({ error: "Senha inválida" }, { status: 401 });
        }

        const base44 = createClientFromRequest(req);
        const branches = await base44.asServiceRole.entities.Branch.list();
        const branch = branches.find(b => {
            const n = (b.name || "").toUpperCase();
            return n.includes("CRICIUMA") || n.includes("CRICIÚMA");
        });

        if (!branch) {
            return Response.json({ error: "Filial Criciúma não encontrada" }, { status: 404 });
        }

        const allInvoices = await base44.asServiceRole.entities.Invoice.list("-issue_date", 250000);

        const invoices = allInvoices
            .filter(inv => {
                if (inv.cancelled) return false;
                return (
                    inv.branch_cnpj === branch.cnpj ||
                    inv.branch_cnpj === CRICIUMA_EXTRA_CNPJ ||
                    inv.supplier_cnpj === CRICIUMA_EXTRA_CNPJ ||
                    inv.recipient_cnpj === CRICIUMA_EXTRA_CNPJ
                );
            })
            .map(inv => ({
                id: inv.id,
                number: inv.number,
                series: inv.series,
                access_key: inv.access_key,
                issue_date: inv.issue_date,
                due_date: inv.due_date,
                operation_nature: inv.operation_nature,
                total_value: inv.total_value,
                total_products: inv.total_products,
                total_freight: inv.total_freight,
                total_discount: inv.total_discount,
                supplier_name: inv.supplier_name,
                supplier_cnpj: inv.supplier_cnpj,
                supplier_ie: inv.supplier_ie,
                supplier_city: inv.supplier_city,
                supplier_state: inv.supplier_state,
                recipient_name: inv.recipient_name,
                recipient_cnpj: inv.recipient_cnpj,
                recipient_ie: inv.recipient_ie,
                branch_cnpj: inv.branch_cnpj,
                status: inv.status,
                received_date: inv.received_date,
                additional_info: inv.additional_info,
                sigv_recorded: !!inv.sigv_recorded,
                topcon_recorded: !!inv.topcon_recorded,
                boleto_recorded: !!inv.boleto_recorded,
                archived: !!inv.archived,
                archive_notes: inv.archive_notes || null,
                protocol_number: inv.protocol_number,
                protocol_date: inv.protocol_date,
                tax_icms: inv.tax_icms,
                tax_ipi: inv.tax_ipi,
                tax_pis: inv.tax_pis,
                tax_cofins: inv.tax_cofins,
                tax_icms_base: inv.tax_icms_base,
                items: (inv.items || []).map(item => ({
                    code: item.code,
                    description: item.description,
                    unit: item.unit,
                    quantity: item.quantity,
                    unit_value: item.unit_value,
                    total: item.total,
                    ncm: item.ncm,
                    cfop: item.cfop,
                    icms_origin: item.icms_origin,
                    icms_situation: item.icms_situation,
                })),
                installments: (inv.installments || []).map(p => ({
                    number: p.number,
                    due_date: p.due_date,
                    value: p.value,
                })),
                payments: (inv.payments || []).map(p => ({
                    payment_type: p.payment_type,
                    value: p.value,
                    card_type: p.card_type,
                    installments: p.installments,
                })),
            }));

        return Response.json({
            branch: { name: branch.name, cnpj: branch.cnpj },
            total: invoices.length,
            invoices,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});