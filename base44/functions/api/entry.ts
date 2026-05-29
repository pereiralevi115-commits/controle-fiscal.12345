import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EXTRA_CNPJ = '01273320000420';

Deno.serve(async (req) => {
    try {
        let body = {};
        try { body = await req.json(); } catch (_) {}

        const action = body.action;

        if (!action) {
            return Response.json({
                available_actions: [
                    { action: "criciumaInvoices", description: "Retorna notas fiscais da filial Criciúma", params: { senha: "string (obrigatório)" } },
                    { action: "parseXml", description: "Processa um XML de NF-e", params: { xml: "string (obrigatório)" } },
                    { action: "generateInvoicePDF", description: "Gera o PDF de uma nota fiscal", params: { invoice_id: "string (obrigatório)" } },
                    { action: "deleteAllInvoices", description: "Apaga todas as notas fiscais (apenas admin)", params: {} },
                ]
            });
        }

        const base44 = createClientFromRequest(req);

        // ── criciumaInvoices ──────────────────────────────────────────────────
        if (action === "criciumaInvoices") {
            const senha = body.senha;
            if (senha !== "123456") {
                return Response.json({ error: "Senha inválida" }, { status: 401 });
            }

            const branches = await base44.asServiceRole.entities.Branch.list();
            const branch = branches.find(b =>
                b.name?.toUpperCase().includes("CRICIUMA") ||
                b.name?.toUpperCase().includes("CRICIÚMA")
            );

            if (!branch) {
                return Response.json({ error: "Filial Criciúma não encontrada" }, { status: 404 });
            }

            const allInvoices = await base44.asServiceRole.entities.Invoice.list("-issue_date", 250000);

            const invoices = allInvoices
                .filter(inv => {
                    if (inv.cancelled) return false;
                    return (
                        inv.branch_cnpj === branch.cnpj ||
                        inv.branch_cnpj === EXTRA_CNPJ ||
                        inv.supplier_cnpj === EXTRA_CNPJ ||
                        inv.recipient_cnpj === EXTRA_CNPJ
                    );
                })
                .map(inv => ({
                    id: inv.id,
                    number: inv.number,
                    series: inv.series,
                    issue_date: inv.issue_date,
                    due_date: inv.due_date,
                    total_value: inv.total_value,
                    supplier_name: inv.supplier_name,
                    supplier_cnpj: inv.supplier_cnpj,
                    recipient_name: inv.recipient_name,
                    recipient_cnpj: inv.recipient_cnpj,
                    branch_cnpj: inv.branch_cnpj,
                    operation_nature: inv.operation_nature,
                    status: inv.status,
                    additional_info: inv.additional_info,
                    access_key: inv.access_key,
                    sigv_recorded: !!inv.sigv_recorded,
                    topcon_recorded: !!inv.topcon_recorded,
                    boleto_recorded: !!inv.boleto_recorded,
                    archived: !!inv.archived,
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
                branch: { name: branch.name, cnpj: branch.cnpj },
                total: invoices.length,
                invoices,
            });
        }

        // ── parseXml ─────────────────────────────────────────────────────────
        if (action === "parseXml") {
            const result = await base44.functions.invoke("parseXml", { xml: body.xml });
            return Response.json(result.data ?? result);
        }

        // ── generateInvoicePDF ───────────────────────────────────────────────
        if (action === "generateInvoicePDF") {
            const result = await base44.functions.invoke("generateInvoicePDF", { invoice_id: body.invoice_id });
            return Response.json(result.data ?? result);
        }

        // ── deleteAllInvoices ────────────────────────────────────────────────
        if (action === "deleteAllInvoices") {
            const user = await base44.auth.me();
            if (user?.role !== 'admin') {
                return Response.json({ error: "Acesso negado. Apenas administradores." }, { status: 403 });
            }
            const result = await base44.functions.invoke("deleteAllInvoices", {});
            return Response.json(result.data ?? result);
        }

        return Response.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});