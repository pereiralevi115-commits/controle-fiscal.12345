import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import VotorantimMonthlySvg from "@/components/reports/VotorantimMonthlySvg";

const TARGET_CNPJS = ["01637895010600", "01637895018503"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const digits = (value) => String(value || "").replace(/\D/g, "");

const monthKeyOf = (value) => {
  if (!value) return "";
  const [year, month] = String(value).substring(0, 10).split("-");
  return year && month ? `${month}-${year}` : "";
};

const monthLabelOf = (monthKey) => {
  const [month, year] = String(monthKey || "").split("-");
  const index = Number(month) - 1;
  if (!year || index < 0 || index > 11) return "Mês não selecionado";
  return `${MONTH_NAMES[index]}/${year}`;
};

const sortMonths = (months) => months.sort((a, b) => {
  const [am, ay] = a.split("-").map(Number);
  const [bm, by] = b.split("-").map(Number);
  return new Date(by, bm - 1, 1) - new Date(ay, am - 1, 1);
});

const classify = (invoice) => {
  const cfops = Array.isArray(invoice.items) ? invoice.items.map((item) => digits(item.cfop)).filter(Boolean) : [];
  return cfops.some((cfop) => ["5910", "6910"].includes(cfop)) ? "bonificacao" : "venda";
};

async function listAllInvoices() {
  const rows = [];
  let skip = 0;
  while (true) {
    const page = await base44.entities.Invoice.filter({ supplier_cnpj: { $in: TARGET_CNPJS } }, "-issue_date", 1000, skip);
    rows.push(...page);
    if (page.length < 1000) break;
    skip += 1000;
  }
  return rows;
}

export default function RelatorioVotorantimAgosto() {
  const svgRef = useRef(null);
  const [invoices, setInvoices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([listAllInvoices(), base44.entities.Branch.list()]).then(([invoiceRows, branchRows]) => {
      if (!active) return;
      setInvoices(invoiceRows);
      setBranches(branchRows);
      const latestMonth = sortMonths(Array.from(new Set(invoiceRows.map((invoice) => monthKeyOf(invoice.issue_date)).filter(Boolean))))[0] || "";
      setSelectedMonth((current) => current || latestMonth);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const availableMonths = useMemo(() => sortMonths(Array.from(new Set(invoices.map((invoice) => monthKeyOf(invoice.issue_date)).filter(Boolean)))), [invoices]);

  const { rows, totals } = useMemo(() => {
    const branchByCnpj = new Map(branches.map((branch) => [digits(branch.cnpj), branch.name]));
    const grouped = new Map();

    invoices.filter((invoice) => monthKeyOf(invoice.issue_date) === selectedMonth).forEach((invoice) => {
      const unidade = branchByCnpj.get(digits(invoice.branch_cnpj || invoice.recipient_cnpj)) || digits(invoice.branch_cnpj || invoice.recipient_cnpj) || "SEM FILIAL";
      if (!grouped.has(unidade)) grouped.set(unidade, { unidade, vendaNotas: 0, vendaValor: 0, bonNotas: 0, bonValor: 0, cfopsVenda: new Set(), cfopsBon: new Set() });
      const row = grouped.get(unidade);
      const cfops = Array.isArray(invoice.items) ? invoice.items.map((item) => digits(item.cfop)).filter(Boolean) : [];
      if (classify(invoice) === "bonificacao") {
        row.bonNotas += 1;
        row.bonValor += Number(invoice.total_value) || 0;
        cfops.forEach((cfop) => row.cfopsBon.add(cfop));
      } else {
        row.vendaNotas += 1;
        row.vendaValor += Number(invoice.total_value) || 0;
        cfops.forEach((cfop) => row.cfopsVenda.add(cfop));
      }
    });

    const reportRows = Array.from(grouped.values()).map((row) => ({
      ...row,
      cfopVenda: Array.from(row.cfopsVenda).sort().join(", ") || "-",
      cfopBon: Array.from(row.cfopsBon).sort().join(", ") || "-",
    })).sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR"));

    const reportTotals = reportRows.reduce((acc, row) => ({
      vendaNotas: acc.vendaNotas + row.vendaNotas,
      vendaValor: acc.vendaValor + row.vendaValor,
      bonNotas: acc.bonNotas + row.bonNotas,
      bonValor: acc.bonValor + row.bonValor,
    }), { vendaNotas: 0, vendaValor: 0, bonNotas: 0, bonValor: 0 });

    return { rows: reportRows, totals: reportTotals };
  }, [branches, invoices, selectedMonth]);

  const monthLabel = monthLabelOf(selectedMonth);
  const safeFileName = monthLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W+/g, "-");

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-votorantim-${safeFileName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const width = Number(svg.getAttribute("width")) || 1600;
    const height = Number(svg.getAttribute("height")) || 1000;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `relatorio-votorantim-${safeFileName}.png`;
      link.click();
    };
    image.src = url;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3" data-print-hidden="true">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Imagem do relatório — {monthLabel}</h1>
            <p className="text-slate-600">Votorantim Cimentos S/A: venda x bonificação por unidade.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm"
            >
              {availableMonths.map((month) => <option key={month} value={month}>{monthLabelOf(month)}</option>)}
            </select>
            <Button onClick={downloadPng} className="gap-2" disabled={isLoading}><Download className="w-4 h-4" />Baixar PNG</Button>
            <Button onClick={downloadSvg} variant="outline" className="gap-2" disabled={isLoading}><Download className="w-4 h-4" />Baixar SVG</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[60vh] flex items-center justify-center rounded-2xl bg-white shadow-xl">
            <div className="w-9 h-9 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl shadow-xl bg-white p-2">
            <VotorantimMonthlySvg svgRef={svgRef} monthLabel={monthLabel} rows={rows} totals={totals} />
          </div>
        )}
      </div>
    </div>
  );
}