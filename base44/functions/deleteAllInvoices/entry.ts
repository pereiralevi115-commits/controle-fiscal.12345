import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all invoices
    const invoices = await base44.asServiceRole.entities.Invoice.list(null, 1000);
    
    // Delete all invoices
    let deletedCount = 0;
    for (const invoice of invoices) {
      await base44.asServiceRole.entities.Invoice.delete(invoice.id);
      deletedCount++;
    }

    return Response.json({ success: true, deletedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});