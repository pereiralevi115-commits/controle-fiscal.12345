import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const branches = await base44.asServiceRole.entities.Branch.list();
        return Response.json({ ok: true, count: branches.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});