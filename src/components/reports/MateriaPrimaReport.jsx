import React, { useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date) =>
  date ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) : "—";

export default function MateriaPrimaReport({ open, onClose, invoices, branches }) {
  const printRef = useRef();

  // Agrupar por filial
  const branchMap = {};
  branches.forEach((b) => { branchMap[b.cnpj] = b.name; });

  const byBranch = {};
  invoices.forEach((inv) => {
    const branchName = branchMap[inv.branch_cnpj] || inv.branch_cnpj || "Sem Filial";
    if (!byBranch[branchName]) byBranch[branchName] = [];
    byBranch[branchName].push(inv);
  });

  // Resumo por fornecedor dentro de cada filial
  const supplierSummary = (invList) => {
    const map = {};
    invList.forEach((inv) => {
      const key = inv.supplier_name;
      if (!map[key]) map[key] = { name: key, count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += inv.total_value || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  };

  const grandTotal = invoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Relatório - Matéria Prima</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
            h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 11px; color: #64748b; margin-bottom: 20px; }
            .branch-section { margin-bottom: 28px; }
            .branch-title { font-size: 14px; font-weight: bold; background: #1e293b; color: white; padding: 6px 10px; margin-bottom: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
            th { background: #f1f5f9; font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 5px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10px; }
            tr:last-child td { border-bottom: none; }
            .text-right { text-align: right; }
            .summary-section { margin-top: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
            .summary-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; padding: 5px 10px; background: #e2e8f0; }
            .summary-row { display: flex; justify-content: space-between; padding: 3px 10px; font-size: 10px; border-bottom: 1px solid #f1f5f9; }
            .summary-row:last-child { border-bottom: none; }
            .summary-row .sup-name { flex: 1; }
            .summary-row .sup-count { width: 60px; text-align: center; color: #64748b; }
            .summary-row .sup-total { width: 110px; text-align: right; font-weight: 600; }
            .branch-subtotal { display: flex; justify-content: space-between; padding: 6px 10px; background: #fef9c3; font-size: 11px; font-weight: 700; border-top: 2px solid #fde047; }
            .grand-total { margin-top: 20px; background: #1e293b; color: white; border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
            .grand-total .label { font-size: 12px; font-weight: 600; }
            .grand-total .value { font-size: 16px; font-weight: 800; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const sortedBranches = Object.keys(byBranch).sort();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Relatório — Matéria Prima</DialogTitle>
            <Button onClick={handlePrint} className="gap-2 mr-6">
              <Printer className="w-4 h-4" />
              Imprimir / Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef}>
          <h1>Relatório — Matéria Prima</h1>
          <p className="subtitle">
            Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · {invoices.length} nota(s)
          </p>

          {sortedBranches.map((branchName) => {
            const invList = byBranch[branchName];
            const branchTotal = invList.reduce((s, i) => s + (i.total_value || 0), 0);
            const suppliers = supplierSummary(invList);

            return (
              <div key={branchName} className="branch-section">
                {/* Título da filial */}
                <div className="branch-title">{branchName}</div>

                {/* Tabela de notas */}
                <table>
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>NF</th>
                      <th>Emissão</th>
                      <th>Vencimento</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invList.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.supplier_name}</td>
                        <td>{inv.series ? `${inv.series}/${inv.number}` : inv.number}</td>
                        <td>{formatDate(inv.issue_date)}</td>
                        <td>{formatDate(inv.due_date)}</td>
                        <td className="text-right">{formatCurrency(inv.total_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Resumo por fornecedor */}
                <div className="summary-section">
                  <div className="summary-title">Resumo por Fornecedor</div>
                  {suppliers.map((sup) => (
                    <div key={sup.name} className="summary-row">
                      <span className="sup-name">{sup.name}</span>
                      <span className="sup-count">{sup.count} NF{sup.count !== 1 ? "s" : ""}</span>
                      <span className="sup-total">{formatCurrency(sup.total)}</span>
                    </div>
                  ))}
                  <div className="branch-subtotal">
                    <span>Total {branchName}</span>
                    <span>{formatCurrency(branchTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total Geral */}
          <div className="grand-total">
            <span className="label">TOTAL GERAL — {invoices.length} nota(s) em {sortedBranches.length} unidade(s)</span>
            <span className="value">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}