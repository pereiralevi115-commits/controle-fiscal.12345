import React, { useRef, useMemo } from "react";
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

  const branchMap = {};
  branches.forEach((b) => { branchMap[b.cnpj] = b.name; });

  // Organizar por filial e depois por fornecedor + data
  const groupedData = useMemo(() => {
    const byBranch = {};
    
    invoices.forEach((inv) => {
      const branchName = branchMap[inv.branch_cnpj] || inv.branch_cnpj || "Sem Filial";
      if (!byBranch[branchName]) byBranch[branchName] = {};
      
      const supplierName = inv.supplier_name;
      if (!byBranch[branchName][supplierName]) byBranch[branchName][supplierName] = [];
      
      byBranch[branchName][supplierName].push(inv);
    });

    // Ordenar fornecedores e notas por data
    Object.keys(byBranch).forEach((branch) => {
      Object.keys(byBranch[branch]).forEach((supplier) => {
        byBranch[branch][supplier].sort((a, b) => {
          const dateA = new Date(a.issue_date || 0);
          const dateB = new Date(b.issue_date || 0);
          return dateA - dateB;
        });
      });
    });

    return byBranch;
  }, [invoices]);

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
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }
            .container { max-width: 900px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; }
            .header h1 { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
            .subtitle { font-size: 10px; color: #64748b; }
            .info-bar { background: #f1f5f9; border-left: 4px solid #1e293b; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #475569; }
            .branch-section { margin-bottom: 20px; page-break-inside: avoid; }
            .branch-header { background: #1e293b; color: white; padding: 10px 12px; font-size: 12px; font-weight: 600; margin-bottom: 0; }
            .supplier-group { background: white; }
            .supplier-name { background: #f8fafc; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #1e293b; border-left: 3px solid #cbd5e1; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            thead tr { background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
            th { padding: 6px 10px; text-align: left; font-weight: 600; color: #475569; font-size: 10px; }
            td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
            tbody tr:last-child td { border-bottom: none; }
            .text-right { text-align: right; }
            .nf-col { font-weight: 500; color: #1e293b; }
            .value-col { font-weight: 600; color: #1e293b; }
            .grand-total { background: #1e293b; color: white; padding: 12px 16px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
            .grand-total .label { font-size: 12px; }
            .grand-total .value { font-size: 14px; font-weight: 700; }
            @media print { body { padding: 0; font-size: 10px; } .container { padding: 15px; } }
          </style>
        </head>
        <body>
          <div class="container">${content}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const sortedBranches = Object.keys(groupedData).sort();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <DialogTitle className="text-xl">Relatório — Matéria Prima</DialogTitle>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir / Exportar PDF
          </Button>
        </div>

        <div ref={printRef} className="p-6 space-y-4">
          {/* Cabeçalho */}
          <div className="border-b-2 border-slate-800 pb-3">
            <h1 className="text-2xl font-semibold text-slate-800">Relatório — Matéria Prima</h1>
            <p className="text-xs text-slate-500 mt-2">
              Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          {/* Resumo */}
          <div className="bg-slate-50 border-l-4 border-slate-800 px-4 py-3 text-sm text-slate-700">
            <strong>{invoices.length}</strong> nota(s) · <strong>{sortedBranches.length}</strong> filial(is)
          </div>

          {/* Seções por Filial */}
          {sortedBranches.map((branchName) => {
            const supplierMap = groupedData[branchName];
            const sortedSuppliers = Object.keys(supplierMap).sort();

            return (
              <div key={branchName} className="bg-white border border-slate-200 rounded overflow-hidden">
                {/* Cabeçalho da Filial */}
                <div className="bg-slate-800 text-white px-4 py-3 font-semibold text-sm uppercase tracking-wide">
                  {branchName}
                </div>

                {/* Fornecedores */}
                <div>
                  {sortedSuppliers.map((supplierName, supplierIndex) => {
                    const invList = supplierMap[supplierName];

                    return (
                      <div key={supplierName} className={supplierIndex > 0 ? "border-t border-slate-200" : ""}>
                        {/* Nome do Fornecedor */}
                        <div className="bg-slate-50 px-4 py-2.5 border-l-4 border-slate-300 font-semibold text-xs text-slate-800">
                          {supplierName}
                        </div>

                        {/* Tabela de Notas */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">NF</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Emissão</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Vencimento</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-700">Produtos</th>
                                <th className="px-3 py-2 text-right font-semibold text-slate-700">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invList.map((inv) => (
                                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium text-blue-600">
                                    {inv.series ? `${inv.series}/${inv.number}` : inv.number}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {formatDate(inv.issue_date)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {formatDate(inv.due_date)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {inv.items && inv.items.length > 0
                                      ? inv.items.map(item => item.description).join(", ")
                                      : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-slate-700">
                                    {formatCurrency(inv.total_value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Total Geral */}
          <div className="bg-slate-800 text-white px-6 py-4 rounded flex justify-between items-center font-semibold text-sm">
            <span>TOTAL GERAL — {invoices.length} nota(s)</span>
            <span className="text-lg">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}