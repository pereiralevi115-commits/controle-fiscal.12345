import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: "Não autorizado" }, { status: 401 });

        const branches = await base44.asServiceRole.entities.Branch.list();
        const branch = branches.find(b =>
            b.name?.toUpperCase().includes("CRICIUMA") ||
            b.name?.toUpperCase().includes("CRICIÚMA")
        );

        if (!branch) {
            return Response.json({ error: "Filial Criciúma não encontrada" }, { status: 404 });
        }

        const profiles = user.profile_id
            ? await base44.asServiceRole.entities.UserProfile.filter({ id: user.profile_id })
            : [];
        const profile = profiles?.[0] || null;
        const isLider = profile?.name?.toLowerCase() === "líder" || profile?.name?.toLowerCase() === "lider";
        const allowedBranchIds = Array.isArray(user.branch_ids) ? user.branch_ids : [];

        if (user.role !== "admin" && isLider && !allowedBranchIds.includes(branch.id)) {
            return Response.json({ error: "Você não tem acesso à filial Criciúma" }, { status: 403 });
        }

        const allInvoices = await base44.asServiceRole.entities.Invoice.list("-issue_date", 5000);
        const invoices = allInvoices
            .filter(inv => inv.branch_cnpj === branch.cnpj && !inv.cancelled)
            .map(inv => ({
                id: inv.id,
                number: inv.number,
                series: inv.series,
                issue_date: inv.issue_date,
                total_value: inv.total_value,
                supplier_name: inv.supplier_name,
                status: inv.status,
                additional_info: inv.additional_info,
                sigv_recorded: !!inv.sigv_recorded,
                topcon_recorded: !!inv.topcon_recorded,
                boleto_recorded: !!inv.boleto_recorded,
                archived: !!inv.archived,
                items: inv.items || [],
                installments: inv.installments || [],
            }));

        return Response.json({ branch: { name: branch.name, cnpj: branch.cnpj }, total: invoices.length, invoices });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}