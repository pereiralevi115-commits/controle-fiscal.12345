import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem excluir notas.' }, { status: 403 });

    const { invoiceId } = await req.json();
    if (!invoiceId) return Response.json({ error: 'invoiceId é obrigatório.' }, { status: 400 });

    let invoice;
    try {
      invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    } catch {
      invoice = null;
    }
    if (!invoice) return Response.json({ error: 'Nota não encontrada.' }, { status: 404 });

    // Registra a chave bloqueada para que a nota não volte em importações futuras.
    await base44.asServiceRole.entities.DeletedInvoiceKey.create({
      access_key: invoice.access_key || '',
      number: invoice.number || '',
      supplier_cnpj: invoice.supplier_cnpj || '',
    });

    await base44.asServiceRole.entities.Invoice.delete(invoiceId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});