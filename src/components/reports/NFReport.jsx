import React, { useRef, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date) =>
  date ? format(new Date(date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "—";

const BRANCH_ORDER = [
  "ARARANGUA", "ORLEANS", "CAPIVARI DE BAIXO", "CRICIUMA", "PASSO DE TORRES",
  "BRAÇO DO NORTE", "MAQUINE", "CASEIROS", "LAGES",
  "SANTO ANTONIO DA PATRULHA", "VILA FLORES"
];

export default function NFReport({ open, onClose, invoices, branches }) {
  const printRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const branchMap = {};
  branches.forEach((b) => { branchMap[b.cnpj] = b.name; });

  // Filtrar por período (data de vencimento)
  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!inv.due_date) return !startDate && !endDate;
      if (startDate && inv.due_date < startDate) return false;
      if (endDate && inv.due_date > endDate) return false;
      return true;
    });
  }, [invoices, startDate, endDate]);

  // Organizar por filial e depois por fornecedor + data
  const groupedData = useMemo(() => {
    const byBranch = {};
    periodInvoices.forEach((inv) => {
      const branchName = branchMap[inv.branch_cnpj] || inv.branch_cnpj || "Sem Filial";
      if (!byBranch[branchName]) byBranch[branchName] = {};
      const supplierName = inv.supplier_name;
      if (!byBranch[branchName][supplierName]) byBranch[branchName][supplierName] = [];
      byBranch[branchName][supplierName].push(inv);
    });
    Object.keys(byBranch).forEach((branch) => {
      Object.keys(byBranch[branch]).forEach((supplier) => {
        byBranch[branch][supplier].sort((a, b) => new Date(a.issue_date || 0) - new Date(b.issue_date || 0));
      });
    });
    return byBranch;
  }, [periodInvoices]);

  const sortedBranches = Object.keys(groupedData).sort((a, b) => {
    const ai = BRANCH_ORDER.findIndex(n => a.toUpperCase().includes(n));
    const bi = BRANCH_ORDER.findIndex(n => b.toUpperCase().includes(n));
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const grandTotal = periodInvoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

  const branchTotals = useMemo(() => {
    const totals = {};
    sortedBranches.forEach((branchName) => {
      totals[branchName] = Object.keys(groupedData[branchName]).reduce((sum, supplierName) => {
        return sum + groupedData[branchName][supplierName].reduce((s, inv) => s + (inv.total_value || 0), 0);
      }, 0);
    });
    return totals;
  }, [groupedData, sortedBranches]);

  const periodLabel = (startDate || endDate)
    ? `Período: ${startDate ? format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy") : "início"} até ${endDate ? format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy") : "hoje"}`
    : "Período: todas as datas";

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 6;
      let yPosition = margin;

      try {
        pdf.addImage("https://media.base44.com/images/public/69fa46185be2e7353b027550/1b30abd51_MotorVlog13.png", "PNG", pageWidth - margin - 25, yPosition, 25, 15);
      } catch (e) {
        console.log("Logo não disponível");
      }

      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont(undefined, "bold");
      pdf.text("Relatório NF", margin, yPosition + 5);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 110, 120);
      pdf.setFont(undefined, "normal");
      pdf.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPosition + 11);
      pdf.text(periodLabel, margin, yPosition + 16);

      yPosition += 20;

      pdf.setDrawColor(30, 41, 59);
      pdf.setLineWidth(0.8);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      pdf.setFillColor(240, 244, 248);
      pdf.rect(margin, yPosition, contentWidth, 8, "F");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont(undefined, "normal");
      pdf.text(`${periodInvoices.length} nota(s) · ${sortedBranches.length} filial(is)`, margin + 3, yPosition + 5);
      yPosition += 9;

      sortedBranches.forEach((branchName, branchIndex) => {
        if (branchIndex > 0) {
          pdf.addPage();
          yPosition = margin;
        }

        const supplierMap = groupedData[branchName];
        const sortedSuppliers = Object.keys(supplierMap).sort();

        pdf.setFillColor(30, 41, 59);
        pdf.rect(margin, yPosition, contentWidth, 10, "F");
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, "bold");
        pdf.text(branchName, margin + 3, yPosition + 7);
        yPosition += 11;

        sortedSuppliers.forEach((supplierName) => {
          const invList = supplierMap[supplierName];
          const supplierTotal = invList.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

          if (yPosition > pageHeight - margin - 50) {
            pdf.addPage();
            yPosition = margin;
          }

          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, yPosition, contentWidth, 8, "F");
          pdf.setFontSize(10);
          pdf.setTextColor(15, 23, 42);
          pdf.setFont(undefined, "bold");
          pdf.text(supplierName, margin + 2, yPosition + 5.5);
          yPosition += 8;

          pdf.setFillColor(241, 245, 249);
          pdf.setFontSize(9);
          pdf.setTextColor(51, 65, 85);
          pdf.setFont(undefined, "bold");

          const tableY = yPosition;
          pdf.rect(margin, tableY, contentWidth, 6, "F");
          pdf.text("NF", margin + 2, tableY + 4);
          pdf.text("Emissão", margin + 18, tableY + 4);
          pdf.text("Vencimento", margin + 38, tableY + 4);
          pdf.text("Produtos", margin + 62, tableY + 4);
          pdf.text("Valor", pageWidth - margin - 5, tableY + 4, { align: "right" });
          yPosition += 8;

          invList.forEach((inv) => {
            if (yPosition > pageHeight - margin - 25) {
              pdf.addPage();
              yPosition = margin;
            }

            pdf.setFontSize(9);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont(undefined, "normal");

            const nf = inv.series ? `${inv.series}/${inv.number}` : inv.number;
            const products = inv.items && inv.items.length > 0
              ? inv.items.map(item => item.description).join(" | ")
              : "—";
            const productsFormatted = products.length > 45 ? products.substring(0, 42) + "..." : products;

            pdf.text(String(nf), margin + 2, yPosition + 3.5);
            pdf.text(formatDate(inv.issue_date), margin + 18, yPosition + 3.5);
            pdf.text(formatDate(inv.due_date), margin + 38, yPosition + 3.5);
            pdf.text(productsFormatted, margin + 62, yPosition + 3.5);
            pdf.text(formatCurrency(inv.total_value), pageWidth - margin - 5, yPosition + 3.5, { align: "right" });

            yPosition += lineHeight;
          });

          pdf.setFillColor(241, 245, 249);
          pdf.setFontSize(9);
          pdf.setTextColor(15, 23, 42);
          pdf.setFont(undefined, "bold");
          pdf.rect(margin, yPosition, contentWidth, 6, "F");
          pdf.text("Subtotal: ", margin + 2, yPosition + 4);
          pdf.text(formatCurrency(supplierTotal), pageWidth - margin - 5, yPosition + 4, { align: "right" });
          yPosition += 6;
        });

        pdf.setFillColor(71, 85, 105);
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, "bold");
        pdf.rect(margin, yPosition, contentWidth, 8, "F");
        pdf.text(`TOTAL ${branchName.toUpperCase()} — ${formatCurrency(branchTotals[branchName])}`, margin + 2, yPosition + 5.5);
        yPosition += 9;
      });

      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFillColor(30, 41, 59);
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, "bold");
      pdf.rect(margin, yPosition, contentWidth, 8, "F");
      pdf.text(`TOTAL GERAL — ${periodInvoices.length} nota(s)`, margin + 2, yPosition + 5.5);
      pdf.text(formatCurrency(grandTotal), pageWidth - margin - 5, yPosition + 5.5, { align: "right" });

      pdf.save("Relatorio-NF.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between gap-4 flex-wrap">
          <DialogTitle className="text-xl">Relatório NF</DialogTitle>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">De</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Até</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[150px]" />
            </div>
            <Button onClick={handleGeneratePDF} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGenerating ? "Gerando..." : "Gerar PDF"}
            </Button>
          </div>
        </div>

        <div ref={printRef} className="p-6 space-y-4 text-sm">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-2 gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Relatório NF</h1>
              <p className="text-xs text-slate-500 mt-2">
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              <p className="text-xs text-slate-500 mt-1">{periodLabel}</p>
            </div>
            <div className="flex-shrink-0">
              <img src="https://media.base44.com/images/public/69fa46185be2e7353b027550/e295bd950_MotorVlog13.png" alt="Concretar" className="h-16 w-auto" />
            </div>
          </div>

          <div className="bg-slate-50 border-l-4 border-slate-800 px-4 py-3 text-sm text-slate-700">
            <strong>{periodInvoices.length}</strong> nota(s) · <strong>{sortedBranches.length}</strong> filial(is)
          </div>

          {sortedBranches.map((branchName) => {
            const supplierMap = groupedData[branchName];
            const sortedSuppliers = Object.keys(supplierMap).sort();

            return (
              <div key={branchName} className="bg-white border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-4 font-bold text-lg uppercase tracking-widest shadow-md">
                  {branchName}
                </div>

                <div>
                  {sortedSuppliers.map((supplierName, supplierIndex) => {
                    const invList = supplierMap[supplierName];
                    const supplierTotal = invList.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

                    return (
                      <div key={supplierName} className={supplierIndex > 0 ? "border-t border-slate-200" : ""}>
                        <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 border-l-4 border-slate-700 font-black text-base text-slate-900 shadow-sm">
                          {supplierName}
                        </div>

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
                                  <td className="px-3 py-2 text-slate-600">{formatDate(inv.issue_date)}</td>
                                  <td className="px-3 py-2 text-slate-600">{formatDate(inv.due_date)}</td>
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

                        <div className="bg-slate-100 px-4 py-2.5 flex justify-end items-center border-t border-slate-200 font-bold text-xs">
                          <span className="text-slate-700 mr-4">Subtotal:</span>
                          <span className="text-slate-900 font-bold text-sm">{formatCurrency(supplierTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-4 text-center font-bold text-lg border-t border-slate-300">
                  TOTAL {branchName.toUpperCase()} — {formatCurrency(branchTotals[branchName])}
                </div>
              </div>
            );
          })}

          <div className="bg-slate-800 text-white px-6 py-4 rounded flex justify-between items-center font-semibold text-sm">
            <span>TOTAL GERAL — {periodInvoices.length} nota(s)</span>
            <span className="text-lg">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}