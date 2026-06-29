// Extrai os pares "MM-AAAA" (ordenados do mais recente ao mais antigo) a partir
// de uma lista de notas. Use passando as notas que realmente aparecem na tela
// (todos os filtros aplicados EXCETO o de mês), para que o seletor de mês só
// liste meses que de fato têm registro naquele contexto.
export function getMonthsFromInvoices(invoices) {
  const monthYears = new Set();
  invoices.forEach((inv) => {
    if (!inv.issue_date) return;
    const date = new Date(inv.issue_date + "T12:00:00");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    monthYears.add(`${month}-${date.getFullYear()}`);
  });
  return Array.from(monthYears).sort().reverse();
}