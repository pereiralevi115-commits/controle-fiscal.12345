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

  const sortedBranches = Object.keys(groupedData).sort();

  const grandTotal = invoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

  // Calcular total por filial
  const branchTotals = useMemo(() => {
    const totals = {};
    sortedBranches.forEach((branchName) => {
      totals[branchName] = Object.keys(groupedData[branchName]).reduce((sum, supplierName) => {
        return sum + groupedData[branchName][supplierName].reduce((s, inv) => s + (inv.total_value || 0), 0);
      }, 0);
    });
    return totals;
  }, [groupedData, sortedBranches]);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Relatório - Matéria Prima</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html { width: 100%; height: 100%; }
            body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif; font-size: 11px; color: #1e293b; line-height: 1.6; background: #fff; }
            .container { width: 210mm; height: 297mm; margin: 0 auto; padding: 15mm; background: white; }
            .header { border-bottom: 3px solid #1e293b; padding-bottom: 10px; margin-bottom: 15px; }
            .header h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 5px; letter-spacing: -0.5px; }
            .subtitle { font-size: 9px; color: #64748b; font-weight: 500; }
            .info-bar { background: linear-gradient(to right, #f1f5f9, #ffffff); border-left: 5px solid #1e293b; padding: 10px 14px; margin-bottom: 15px; font-size: 10px; color: #334155; font-weight: 500; }
            .branch-section { margin-bottom: 18px; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; }
            .branch-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 12px 14px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .supplier-name { background: #f8fafc; padding: 9px 14px; font-size: 11px; font-weight: 600; color: #1e293b; border-left: 4px solid #64748b; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            thead tr { background: #f1f5f9; border-bottom: 2px solid #cbd5e1; }
            th { padding: 7px 10px; text-align: left; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
            td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
            tbody tr { background: white; }
            tbody tr:hover { background: #f8fafc; }
            tbody tr:last-child td { border-bottom: none; }
            .text-right { text-align: right; }
            .nf-link { color: #0369a1; font-weight: 600; text-decoration: none; }
            .value-col { font-weight: 700; color: #0f172a; }
            .supplier-total { background: #f1f5f9; padding: 8px 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: flex-end; font-weight: 700; font-size: 10px; }
            .supplier-total .label { color: #334155; margin-right: 16px; }
            .supplier-total .value { color: #0f172a; font-size: 11px; font-weight: 800; }
            .branch-total { background: linear-gradient(135deg, #334155 0%, #1e293b 100%); color: white; padding: 12px 16px; text-align: center; font-weight: 800; font-size: 13px; border-top: 2px solid #cbd5e1; letter-spacing: 0.5px; }
            .grand-total { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 16px 18px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; font-weight: 800; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .grand-total .label { font-size: 13px; letter-spacing: 0.5px; font-weight: 700; }
            .grand-total .value { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
            @page { size: A4; margin: 10mm; }
            @media print { 
              html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
              .container { width: 100%; height: auto; margin: 0; padding: 10mm; }
              body { font-size: 10px; }
            }
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

        <div ref={printRef} className="p-6 space-y-4 text-sm">
          {/* Cabeçalho com Logo */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-2 gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Relatório — Matéria Prima</h1>
              <p className="text-xs text-slate-500 mt-2">
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex-shrink-0">
              <img src="https://media.base44.com/images/public/69fa46185be2e7353b027550/e295bd950_MotorVlog13.png" alt="Concretar" className="h-16 w-auto" />
            </div>
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
                <div className="bg-slate-800 text-white px-4 py-4 font-bold text-lg uppercase tracking-widest shadow-md">
                  {branchName}
                </div>

                {/* Fornecedores */}
                <div>
                  {sortedSuppliers.map((supplierName, supplierIndex) => {
                    const invList = supplierMap[supplierName];
                    const supplierTotal = invList.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

                    return (
                      <div key={supplierName} className={supplierIndex > 0 ? "border-t border-slate-200" : ""}>
                        {/* Nome do Fornecedor */}
                        <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 border-l-4 border-slate-700 font-black text-base text-slate-900 shadow-sm">
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

                        {/* Subtotal do Fornecedor */}
                        <div className="bg-slate-100 px-4 py-2.5 flex justify-end items-center border-t border-slate-200 font-bold text-xs">
                          <span className="text-slate-700 mr-4">Subtotal:</span>
                          <span className="text-slate-900 font-bold text-sm">{formatCurrency(supplierTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total da Filial */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-4 text-center font-bold text-lg border-t border-slate-300">
                  TOTAL {branchName.toUpperCase()} — {formatCurrency(branchTotals[branchName])}
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