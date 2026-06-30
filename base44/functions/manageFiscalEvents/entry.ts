import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Aplica um evento aprovado ao documento (grava no histórico, sem duplicar).
async function applyEvent(base44, invoice, p) {
  const events = Array.isArray(invoice.fiscal_events) ? invoice.fiscal_events : [];
  const already = events.some((e) =>
    e.type === p.event_type &&
    e.date === p.event_date &&
    (e.protocol || "") === (p.protocol || "")
  );
  if (!already) {
    events.push({
      type: p.event_type,
      label: p.event_label,
      description: p.description,
      date: p.event_date,
      protocol: p.protocol,
    });
    const updateData = { fiscal_events: events };
    if (p.is_cancellation) {
      updateData.cancelled = true;
      updateData.cancellation_date = p.event_date || new Date().toISOString().split("T")[0];
      updateData.cancellation_reason = p.description || p.event_label;
    }
    await base44.asServiceRole.entities.Invoice.update(invoice.id, updateData);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, eventId } = await req.json();

    if (action === 'approve') {
      const events = await base44.asServiceRole.entities.PendingFiscalEvent.filter({ id: eventId });
      const p = events[0];
      if (!p) return Response.json({ error: 'Evento não encontrado.' }, { status: 404 });

      const docs = await base44.asServiceRole.entities.Invoice.filter({ access_key: p.access_key });
      const invoice = docs[0];
      if (!invoice) {
        return Response.json({ error: 'A nota referenciada ainda não existe no sistema. Importe a nota antes de aprovar o evento.' }, { status: 400 });
      }

      await applyEvent(base44, invoice, p);
      await base44.asServiceRole.entities.PendingFiscalEvent.update(p.id, { status: 'aprovado' });
      return Response.json({ ok: true });
    }

    if (action === 'reject') {
      await base44.asServiceRole.entities.PendingFiscalEvent.update(eventId, { status: 'rejeitado' });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});