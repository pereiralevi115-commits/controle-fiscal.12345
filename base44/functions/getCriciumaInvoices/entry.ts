Deno.serve(async (req) => {
    try {
        let body = {};
        try { body = await req.json(); } catch (_) {}

        const senha = body.senha || req.headers.get("x-api-password");
        if (senha !== "123456") {
            return Response.json({ error: "Senha inválida" }, { status: 401 });
        }

        const appId = Deno.env.get("BASE44_APP_ID");
        const baseUrl = `https://api.base44.com/api/apps/${appId}`;
        const headers = {
            "Content-Type": "application/json",
            "x-api-key": req.headers.get("x-api-key") || "",
            "authorization": req.headers.get("authorization") || "",
        };

        // Buscar filiais
        const branchRes = await fetch(`${baseUrl}/entities/Branch`, { headers });
        const branches = await branchRes.json();
        const branch = branches.find(b =>
            b.name?.toUpperCase().includes("CRICIUMA") ||
            b.name?.toUpperCase().includes("CRICIÚMA")
        );

        if (!branch) {
            return Response.json({ error: "Filial Criciúma não encontrada" }, { status: 404 });
        }

        // Buscar notas
        const invRes = await fetch(`${baseUrl}/entities/Invoice?sort=-issue_date&limit=5000`, { headers });
        const allInvoices = await invRes.json();

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
});