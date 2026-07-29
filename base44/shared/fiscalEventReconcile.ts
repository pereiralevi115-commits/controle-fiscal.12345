export async function applyPendingFiscalEventToInvoice(base44, invoice, pendingEvent) {
  const events = Array.isArray(invoice.fiscal_events) ? invoice.fiscal_events : [];
  const already = events.some((event) =>
    event.type === pendingEvent.event_type &&
    event.date === pendingEvent.event_date &&
    (event.protocol || "") === (pendingEvent.protocol || "")
  );

  if (!already) {
    events.push({
      type: pendingEvent.event_type,
      label: pendingEvent.event_label,
      description: pendingEvent.description,
      date: pendingEvent.event_date,
      protocol: pendingEvent.protocol,
    });

    const updateData = { fiscal_events: events };
    if (pendingEvent.is_cancellation) {
      updateData.cancelled = true;
      updateData.cancellation_date = pendingEvent.event_date || new Date().toISOString().split("T")[0];
      updateData.cancellation_reason = pendingEvent.description || pendingEvent.event_label;
    }

    await base44.asServiceRole.entities.Invoice.update(invoice.id, updateData);
  }

  await base44.asServiceRole.entities.PendingFiscalEvent.update(pendingEvent.id, {
    status: "aprovado",
    document_exists: true,
    document_number: invoice.number || pendingEvent.document_number || "",
    supplier_name: invoice.supplier_name || pendingEvent.supplier_name || "",
  });

  return already ? "already_registered" : "applied";
}

export async function reconcilePendingEventsForInvoice(base44, invoice) {
  if (!invoice?.access_key) return { checked: 0, applied: 0, alreadyRegistered: 0 };

  const pendingEvents = await base44.asServiceRole.entities.PendingFiscalEvent.filter({
    access_key: invoice.access_key,
    status: "pendente",
  });

  let applied = 0;
  let alreadyRegistered = 0;
  for (const pendingEvent of pendingEvents) {
    const result = await applyPendingFiscalEventToInvoice(base44, invoice, pendingEvent);
    if (result === "applied") applied++;
    else alreadyRegistered++;
  }

  return { checked: pendingEvents.length, applied, alreadyRegistered };
}

export async function reconcileExistingPendingFiscalEvents(base44, limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 300);
  const pendingEvents = await base44.asServiceRole.entities.PendingFiscalEvent.filter(
    { status: "pendente" },
    "-event_date",
    safeLimit
  );

  let checked = 0;
  let matched = 0;
  let applied = 0;
  let alreadyRegistered = 0;
  let stillWithoutInvoice = 0;

  for (const pendingEvent of pendingEvents) {
    checked++;
    if (!pendingEvent.access_key) {
      stillWithoutInvoice++;
      continue;
    }

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ access_key: pendingEvent.access_key });
    const invoice = invoices[0];
    if (!invoice) {
      stillWithoutInvoice++;
      continue;
    }

    matched++;
    const result = await applyPendingFiscalEventToInvoice(base44, invoice, pendingEvent);
    if (result === "applied") applied++;
    else alreadyRegistered++;
  }

  return { checked, matched, applied, alreadyRegistered, stillWithoutInvoice };
}