import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem excluir notas.' }, { status: 403 });

    const { invoiceIds } = await req.json();
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return Response.json({ error: 'invoiceIds é obrigatório.' }, { status: 400 });
    }

    // Busca as notas em paralelo para obter as chaves a bloquear.
    const invoices = await Promise.all(
      invoiceIds.map((id) =>
        base44.asServiceRole.entities.Invoice.get(id).catch(() => null)
      )
    );
    const found = invoices.filter(Boolean);

    // Registra as chaves bloqueadas de uma só vez (evita reimportação).
    const blockedKeys = found.map((inv) => ({
      access_key: inv.access_key || '',
      number: inv.number || '',
      supplier_cnpj: inv.supplier_cnpj || '',
    }));
    if (blockedKeys.length > 0) {
      await base44.asServiceRole.entities.DeletedInvoiceKey.bulkCreate(blockedKeys);
    }

    // Exclui todas as notas em paralelo.
    await Promise.all(
      found.map((inv) => base44.asServiceRole.entities.Invoice.delete(inv.id).catch(() => null))
    );

    return Response.json({ success: true, deleted: found.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});