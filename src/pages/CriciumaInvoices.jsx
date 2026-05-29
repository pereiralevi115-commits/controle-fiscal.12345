import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatDate = (d) => {
  if (!d) return "—";
  try { return format(new Date(d + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
};

export default function CriciumaInvoices() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["criciuma-invoices"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getCriciumaInvoices", {});
      return res.data;
    },
  });

  const invoices = data?.invoices || [];

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    return (
      inv.supplier_name?.toLowerCase().includes(q) ||
      inv.number?.toLowerCase().includes(q) ||
      (inv.items || []).some(item => item.description?.toLowerCase().includes(q))
    );
  });

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Notas Fiscais — Criciúma", 14, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${filtered.length} notas  |  Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

    let y = 30;
    const rowH = 7;

    // Header
    const drawHeader = () => {
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, pageWidth - 28, rowH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("NF", 16, y + 5);
      doc.text("Emissão", 30, y + 5);
      doc.text("Fornecedor", 55, y + 5);
      doc.text("Descrição dos Itens", 115, y + 5);
      doc.text("Qtd", 210, y + 5);
      doc.text("Valor Unit.", 220, y + 5);
      doc.text("Total NF", 248, y + 5);
      doc.setTextColor(0, 0, 0);
      y += rowH;
    };

    drawHeader();

    let rowIndex = 0;
    filtered.forEach((inv) => {
      const items = inv.items && inv.items.length > 0 ? inv.items : [{ description: inv.additional_info || "—", quantity: null, unit_value: null }];
      const rowsNeeded = items.length * rowH + 2;

      if (y + rowsNeeded > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 15;
        drawHeader();
        rowIndex = 0;
      }

      const bg = rowIndex % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(14, y, pageWidth - 28, rowsNeeded, "F");

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");

      const nf = inv.series ? `${inv.series}/${inv.number}` : inv.number;
      doc.text(nf || "—", 16, y + 5);
      doc.text(formatDate(inv.issue_date), 30, y + 5);

      const supplierText = doc.splitTextToSize(inv.supplier_name || "—", 57);
      doc.text(supplierText, 55, y + 5);

      items.forEach((item, ii) => {
        const iy = y + 5 + ii * rowH;
        const descText = doc.splitTextToSize(item.description || "—", 90);
        doc.text(descText, 115, iy);
        if (item.quantity != null) doc.text(String(item.quantity), 210, iy);
        if (item.unit_value != null) doc.text(formatCurrency(item.unit_value), 220, iy);
      });

      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(inv.total_value), 248, y + 5);
      doc.setFont("helvetica", "normal");

      y += rowsNeeded;
      rowIndex++;
    });

    doc.save("notas_criciuma.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Notas Fiscais — Criciúma</h1>
            <p className="text-slate-500 mt-1">
              {isLoading ? "Carregando..." : `${filtered.length} notas encontradas`}
            </p>
          </div>
          <Button onClick={exportPDF} disabled={isLoading || filtered.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor, NF, produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            Erro ao carregar notas: {error.message}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma nota encontrada</p>
          </div>
        )}

        {!isLoading && filtered.map(inv => (
          <div key={inv.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Invoice header */}
            <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="font-bold text-slate-800">
                NF {inv.series ? `${inv.series}/${inv.number}` : inv.number}
              </div>
              <div className="text-sm text-slate-500">{formatDate(inv.issue_date)}</div>
              <div className="flex-1 text-sm font-medium text-slate-700">{inv.supplier_name}</div>
              <div className="text-sm font-semibold text-emerald-700">{formatCurrency(inv.total_value)}</div>
              <div className="flex gap-1.5">
                {inv.sigv_recorded && <Badge className="bg-green-100 text-green-700 text-[10px]">SIGV</Badge>}
                {inv.topcon_recorded && <Badge className="bg-purple-100 text-purple-700 text-[10px]">TOPCON</Badge>}
                {inv.boleto_recorded && <Badge className="bg-orange-100 text-orange-700 text-[10px]">BOLETO</Badge>}
              </div>
            </div>

            {/* Items */}
            {inv.items && inv.items.length > 0 && (
              <div className="px-5 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Itens</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                        <th className="pb-1 font-medium">Código</th>
                        <th className="pb-1 font-medium">Descrição</th>
                        <th className="pb-1 font-medium text-center">Unid.</th>
                        <th className="pb-1 font-medium text-right">Qtd</th>
                        <th className="pb-1 font-medium text-right">Vl. Unit.</th>
                        <th className="pb-1 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0">
                          <td className="py-1 text-slate-500">{item.code || "—"}</td>
                          <td className="py-1 text-slate-800">{item.description || "—"}</td>
                          <td className="py-1 text-center text-slate-500">{item.unit || "—"}</td>
                          <td className="py-1 text-right text-slate-700">{item.quantity ?? "—"}</td>
                          <td className="py-1 text-right text-slate-700">{formatCurrency(item.unit_value)}</td>
                          <td className="py-1 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Additional info */}
            {inv.additional_info && (
              <div className="px-5 pb-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Obs.: </span>{inv.additional_info}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}