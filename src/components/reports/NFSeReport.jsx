import React, { useMemo, useState } from "react";
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

export default function NFSeReport({ open, onClose, invoices, branches }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const branchMap = {};
  branches.forEach((b) => { branchMap[b.cnpj] = b.name; });

  const branchName = (inv) => branchMap[inv.branch_cnpj] || inv.branch_cnpj || "Sem Filial";

  const periodInvoices = useMemo(() => {
    const filtered = invoices.filter((inv) => {
      if (inv.document_type !== "nfse") return false;
      if (!inv.due_date) return !startDate;
      if (startDate && inv.due_date < startDate) return false;
      if (endDate && inv.due_date > endDate) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const an = branchName(a).toUpperCase();
      const bn = branchName(b).toUpperCase();
      const ai = BRANCH_ORDER.findIndex(n => an.includes(n));
      const bi = BRANCH_ORDER.findIndex(n => bn.includes(n));
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;
      if (aIdx !== bIdx) return aIdx - bIdx;
      if (an !== bn) return an.localeCompare(bn);
      return new Date(a.due_date || 0) - new Date(b.due_date || 0);
    });
  }, [invoices, startDate, endDate]);

  const grandTotal = periodInvoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

  const periodLabel = (startDate || endDate)
    ? `Período (vencimento): ${startDate ? format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy") : "início"} até ${endDate ? format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy") : "hoje"}`
    : "Período: todas as datas";

  const serviceText = (inv) => (inv.service_description || "—").replace(/\\n|\n/g, " ");

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const cols = [
        { key: "branch", label: "Filial", w: 26 },
        { key: "supplier", label: "Fornecedor", w: 45 },
        { key: "nf", label: "NFS-e", w: 18 },
        { key: "issue", label: "Emissão", w: 18 },
        { key: "service", label: "Serviço", w: 92 },
        { key: "value", label: "Valor", w: 22, align: "right" },
        { key: "sigv", label: "SIGV", w: 11, align: "center" },
        { key: "topcon", label: "TOPCON", w: 15, align: "center" },
        { key: "boleto", label: "BOLETO", w: 17, align: "center" },
      ];

      const truncate = (text, maxChars) => {
        const t = String(text || "");
        return t.length > maxChars ? t.substring(0, maxChars - 1) + "…" : t;
      };

      const drawTableHeader = () => {
        pdf.setFillColor(30, 41, 59);
        pdf.rect(margin, y, contentWidth, 7, "F");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, "bold");
        let x = margin;
        cols.forEach((c) => {
          const tx = c.align === "right" ? x + c.w - 2 : c.align === "center" ? x + c.w / 2 : x + 2;
          pdf.text(c.label, tx, y + 4.7, { align: c.align || "left" });
          x += c.w;
        });
        y += 7;
      };

      const drawHeader = () => {
        try {
          pdf.addImage("https://media.base44.com/images/public/69fa46185be2e7353b027550/1b30abd51_MotorVlog13.png", "PNG", pageWidth - margin - 25, y, 25, 15);
        } catch (e) { /* logo opcional */ }

        pdf.setFontSize(16);
        pdf.setTextColor(15, 23, 42);
        pdf.setFont(undefined, "bold");
        pdf.text("Relatório NFS-e", margin, y + 5);

        pdf.setFontSize(8);
        pdf.setTextColor(100, 110, 120);
        pdf.setFont(undefined, "normal");
        pdf.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}  ·  ${periodLabel}  ·  ${periodInvoices.length} nota(s)`, margin, y + 11);
        y += 16;

        drawTableHeader();
      };

      drawHeader();

      pdf.setFontSize(7.5);
      pdf.setFont(undefined, "normal");

      periodInvoices.forEach((inv, idx) => {
        if (y > pageHeight - margin - 12) {
          pdf.addPage();
          y = margin;
          drawTableHeader();
          pdf.setFontSize(7);
          pdf.setFont(undefined, "normal");
          }

          pdf.setTextColor(15, 23, 42);
          const nf = inv.series ? `${inv.series}/${inv.number}` : inv.number;
          const serviceLines = pdf.splitTextToSize(serviceText(inv), 88).slice(0, 3);
          const rowHeight = Math.max(7, serviceLines.length * 3.4 + 3);

          if (y + rowHeight > pageHeight - margin - 12) {
            pdf.addPage();
            y = margin;
            drawTableHeader();
            pdf.setFontSize(7);
            pdf.setFont(undefined, "normal");
          }

          if (idx % 2 === 0) {
            pdf.setFillColor(245, 247, 250);
            pdf.rect(margin, y, contentWidth, rowHeight, "F");
          }

          const values = {
            branch: truncate(branchName(inv), 18),
            supplier: truncate(inv.supplier_name, 32),
            nf: truncate(nf, 12),
            issue: formatDate(inv.issue_date),
            service: serviceLines,
            value: formatCurrency(inv.total_value),
            sigv: inv.sigv_recorded ? "Sim" : "—",
            topcon: inv.topcon_recorded ? "Sim" : "—",
            boleto: inv.boleto_recorded ? "Sim" : "—",
          };

          let x = margin;
          cols.forEach((c) => {
            const tx = c.align === "right" ? x + c.w - 2 : c.align === "center" ? x + c.w / 2 : x + 2;
            const isStatusSim = ["sigv", "topcon", "boleto"].includes(c.key) && values[c.key] === "Sim";
            if (isStatusSim) {
              if (c.key === "topcon") {
                pdf.setTextColor(147, 51, 234);
              } else if (c.key === "boleto") {
                pdf.setTextColor(234, 88, 12);
              } else {
                pdf.setTextColor(22, 163, 74);
              }
              pdf.setFont(undefined, "bold");
            }
            if (c.key === "service") {
              pdf.text(values.service, tx, y + 4, { align: "left", maxWidth: c.w - 4 });
            } else {
              pdf.text(values[c.key], tx, y + 4, { align: c.align || "left" });
            }
            if (isStatusSim) {
              pdf.setTextColor(15, 23, 42);
              pdf.setFont(undefined, "normal");
            }
            x += c.w;
          });
          y += rowHeight;
          });

      if (y > pageHeight - margin - 10) { pdf.addPage(); y = margin; }
      pdf.setFillColor(30, 41, 59);
      pdf.rect(margin, y, contentWidth, 8, "F");
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, "bold");
      pdf.text(`TOTAL GERAL — ${periodInvoices.length} nota(s)`, margin + 2, y + 5.5);
      pdf.text(formatCurrency(grandTotal), pageWidth - margin - 2, y + 5.5, { align: "right" });

      pdf.save("Relatorio-NFSe.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[96vw] max-h-[92vh] overflow-hidden p-0">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between gap-4 flex-wrap z-10">
          <DialogTitle className="text-xl">Relatório NFS-e</DialogTitle>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">De (vencimento)</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Até (vencimento)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[150px]" />
            </div>
            <Button onClick={handleGeneratePDF} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isGenerating ? "Gerando..." : "Gerar PDF"}
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4 text-sm max-h-[calc(92vh-92px)] overflow-auto">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-2 gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Relatório NFS-e</h1>
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
            <strong>{periodInvoices.length}</strong> nota(s)
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full min-w-[1120px] text-[11px] table-fixed">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[20%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[24%]" />
                <col className="w-[8%]" />
                <col className="w-[4%]" />
                <col className="w-[4%]" />
                <col className="w-[4%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-2 text-left font-semibold">Filial</th>
                  <th className="px-3 py-2 text-left font-semibold">Fornecedor</th>
                  <th className="px-3 py-2 text-left font-semibold">NFS-e</th>
                  <th className="px-3 py-2 text-left font-semibold">Emissão</th>
                  <th className="px-3 py-2 text-left font-semibold">Vencimento</th>
                  <th className="px-3 py-2 text-left font-semibold">Serviço</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2 text-center font-semibold">SIGV</th>
                  <th className="px-3 py-2 text-center font-semibold">TOPCON</th>
                  <th className="px-3 py-2 text-center font-semibold">BOLETO</th>
                </tr>
              </thead>
              <tbody>
                {periodInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 even:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{branchName(inv)}</td>
                    <td className="px-3 py-2 text-slate-700">{inv.supplier_name}</td>
                    <td className="px-3 py-2 font-medium text-blue-600 whitespace-nowrap">
                      {inv.series ? `${inv.series}/${inv.number}` : inv.number}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDate(inv.issue_date)}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      <div className="max-h-10 overflow-hidden leading-snug" title={serviceText(inv)}>{serviceText(inv)}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700 whitespace-nowrap">{formatCurrency(inv.total_value)}</td>
                    <td className="px-3 py-2 text-center">
                      {inv.sigv_recorded ? <span className="text-green-600 font-semibold">Sim</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {inv.topcon_recorded ? <span className="text-purple-600 font-semibold">Sim</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {inv.boleto_recorded ? <span className="text-orange-600 font-semibold">Sim</span> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-800 text-white px-6 py-4 rounded flex justify-between items-center font-semibold text-sm">
            <span>TOTAL GERAL — {periodInvoices.length} nota(s)</span>
            <span className="text-lg">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}