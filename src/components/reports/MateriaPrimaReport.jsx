import React, { useRef, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date) =>
  date ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) : "—";

export default function MateriaPrimaReport({ open, onClose, invoices, branches }) {
  const printRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save("Relatorio-Materia-Prima.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <DialogTitle className="text-xl">Relatório — Matéria Prima</DialogTitle>
          <Button onClick={handleGeneratePDF} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGenerating ? "Gerando..." : "Gerar PDF"}
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