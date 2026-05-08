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
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; line-height: 1.4; }
            .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 3px solid #1e293b; padding-bottom: 15px; }
            .header-left h1 { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
            .header-right { text-align: right; font-size: 10px; color: #64748b; }
            .info-bar { background: #f8fafc; border-left: 4px solid #1e293b; padding: 10px 12px; margin-bottom: 20px; font-size: 10px; color: #475569; }
            .branch-section { margin-bottom: 30px; page-break-inside: avoid; }
            .branch-header { background: #1e293b; color: white; padding: 8px 12px; font-size: 11px; font-weight: 700; margin-bottom: 12px; border-radius: 4px; }
            .supplier-group { margin-bottom: 14px; }
            .supplier-name { background: #e2e8f0; padding: 6px 10px; font-size: 10px; font-weight: 600; color: #1e293b; border-left: 3px solid #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 9px; }
            th { background: #f1f5f9; padding: 5px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; color: #475569; }
            td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
            tr:last-child td { border-bottom: none; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .supplier-total { background: #fef9c3; padding: 6px 8px; font-weight: 600; font-size: 10px; display: flex; justify-content: space-between; border-top: 1px solid #fde047; }
            .branch-total { background: #dbeafe; padding: 8px 10px; font-weight: 700; font-size: 10px; display: flex; justify-content: space-between; margin-top: 8px; border-radius: 3px; }
            .grand-total { background: #1e293b; color: white; padding: 12px 16px; margin-top: 30px; display: flex; justify-content: space-between; align-items: center; font-weight: 700; border-radius: 4px; }
            .grand-total .label { font-size: 11px; }
            .grand-total .value { font-size: 16px; }
            @media print { body { padding: 5px; } .container { padding: 10px; } }
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between w-full">
            <DialogTitle>Relatório — Matéria Prima</DialogTitle>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir / Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className="space-y-6">
          {/* Cabeçalho */}
          <div className="border-b-4 border-slate-800 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Relatório — Matéria Prima</h1>
              </div>
              <div className="text-right text-sm text-slate-500">
                <p>Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </div>
          </div>

          {/* Resumo Geral */}
          <div className="bg-slate-50 border-l-4 border-slate-800 px-4 py-3 text-sm text-slate-600">
            <strong>{invoices.length}</strong> nota(s) · <strong>{sortedBranches.length}</strong> filial(is)
          </div>

          {/* Seções por Filial */}
          {sortedBranches.map((branchName) => {
            const supplierMap = groupedData[branchName];
            const sortedSuppliers = Object.keys(supplierMap).sort();
            const branchTotal = Object.values(supplierMap).flat().reduce((s, i) => s + (i.total_value || 0), 0);

            return (
              <div key={branchName} className="border rounded-lg overflow-hidden bg-white">
                {/* Cabeçalho da Filial */}
                <div className="bg-slate-800 text-white px-4 py-3 font-bold text-sm">
                  {branchName}
                </div>

                {/* Fornecedores */}
                <div className="divide-y">
                  {sortedSuppliers.map((supplierName) => {
                    const invList = supplierMap[supplierName];
                    const supplierTotal = invList.reduce((s, i) => s + (i.total_value || 0), 0);

                    return (
                      <div key={supplierName}>
                        {/* Nome do Fornecedor */}
                        <div className="bg-slate-100 px-4 py-2 border-l-4 border-slate-400 font-semibold text-sm text-slate-800">
                          {supplierName}
                        </div>

                        {/* Tabela de Notas */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-3 py-2 text-left font-semibold">NF</th>
                                <th className="px-3 py-2 text-left font-semibold">Emissão</th>
                                <th className="px-3 py-2 text-left font-semibold">Vencimento</th>
                                <th className="px-3 py-2 text-left font-semibold">Produtos</th>
                                <th className="px-3 py-2 text-right font-semibold">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invList.map((inv) => (
                                <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium text-slate-700">
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
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700">
                                    {formatCurrency(inv.total_value)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Subtotal do Fornecedor */}
                        <div className="bg-yellow-50 px-4 py-2 flex justify-between items-center border-t border-yellow-200 text-sm font-semibold">
                          <span>Subtotal {supplierName}</span>
                          <span className="text-slate-800">{formatCurrency(supplierTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total da Filial */}
                <div className="bg-blue-50 px-4 py-3 flex justify-between items-center font-bold text-sm border-t-2 border-blue-200">
                  <span className="text-slate-800">Total {branchName}</span>
                  <span className="text-blue-900">{formatCurrency(branchTotal)}</span>
                </div>
              </div>
            );
          })}

          {/* Total Geral */}
          <div className="bg-slate-800 text-white px-6 py-4 rounded-lg flex justify-between items-center font-bold text-lg">
            <span>TOTAL GERAL — {invoices.length} nota(s)</span>
            <span className="text-2xl">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}