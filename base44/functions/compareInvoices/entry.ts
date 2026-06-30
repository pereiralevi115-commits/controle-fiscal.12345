import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Normaliza número de nota: remove zeros à esquerda e não-dígitos para casar "0004895" com "4895"
function normNumber(v) {
  if (v === null || v === undefined) return "";
  const digits = String(v).replace(/\D/g, "");
  return digits.replace(/^0+/, "") || (digits ? "0" : "");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // externalList: [{ number, value, date }]
    const externalList = Array.isArray(body.externalList) ? body.externalList : [];
    // Tipos de documento a considerar no seu sistema (padrão: nfe + nfse)
    const docTypes = Array.isArray(body.docTypes) && body.docTypes.length ? body.docTypes : ['nfe', 'nfse'];
    const includeCancelled = !!body.includeCancelled;

    // Carrega todas as notas do seu sistema (service role)
    const all = await base44.asServiceRole.entities.Invoice.list('-issue_date', 250000);

    // Índice do seu banco por número normalizado
    const sysByNum = new Map();
    for (const inv of all) {
      const t = inv.document_type || 'nfe';
      if (!docTypes.includes(t)) continue;
      if (!includeCancelled && inv.cancelled) continue;
      const key = normNumber(inv.number);
      if (!key) continue;
      if (!sysByNum.has(key)) sysByNum.set(key, []);
      sysByNum.get(key).push({
        number: inv.number,
        document_type: t,
        supplier_name: inv.supplier_name,
        total_value: inv.total_value || 0,
        issue_date: inv.issue_date,
        cancelled: !!inv.cancelled,
        archived: !!inv.archived,
      });
    }

    // Índice da lista externa por número normalizado
    const extByNum = new Map();
    for (const row of externalList) {
      const key = normNumber(row.number);
      if (!key) continue;
      if (!extByNum.has(key)) extByNum.set(key, []);
      extByNum.get(key).push({
        number: row.number,
        value: typeof row.value === 'number' ? row.value : null,
        date: row.date || null,
      });
    }

    // Só no outro app (números que não existem no seu sistema)
    const onlyExternal = [];
    let onlyExternalValue = 0;
    for (const [key, rows] of extByNum.entries()) {
      if (!sysByNum.has(key)) {
        for (const r of rows) {
          onlyExternal.push(r);
          onlyExternalValue += (r.value || 0);
        }
      }
    }

    // Só no seu sistema (números que não estão na lista externa)
    const onlySystem = [];
    let onlySystemValue = 0;
    for (const [key, rows] of sysByNum.entries()) {
      if (!extByNum.has(key)) {
        for (const r of rows) {
          onlySystem.push(r);
          onlySystemValue += (r.total_value || 0);
        }
      }
    }

    // Em ambos
    let matchedCount = 0;
    for (const key of extByNum.keys()) {
      if (sysByNum.has(key)) matchedCount++;
    }

    onlyExternal.sort((a, b) => (b.value || 0) - (a.value || 0));
    onlySystem.sort((a, b) => (b.total_value || 0) - (a.total_value || 0));

    return Response.json({
      summary: {
        externalTotal: externalList.length,
        externalUniqueNumbers: extByNum.size,
        systemTotal: Array.from(sysByNum.values()).reduce((s, arr) => s + arr.length, 0),
        systemUniqueNumbers: sysByNum.size,
        matchedNumbers: matchedCount,
        onlyExternalCount: onlyExternal.length,
        onlyExternalValue: Number(onlyExternalValue.toFixed(2)),
        onlySystemCount: onlySystem.length,
        onlySystemValue: Number(onlySystemValue.toFixed(2)),
      },
      onlyExternal: onlyExternal.slice(0, 2000),
      onlySystem: onlySystem.slice(0, 2000),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});