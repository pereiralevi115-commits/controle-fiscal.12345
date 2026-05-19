import React from "react";
import { FileText, CheckSquare, Receipt, BookOpen, DollarSign, ShoppingCart, Truck, BarChart2 } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatCurrencyShort = (value) => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
};

const ScreenSummaryRow = ({ label, data }) => {
  if (!data || data.count === 0) return null;
  const pct = (n) => data.count > 0 ? Math.round(n / data.count * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-b-0">
      <span className="text-xs font-semibold text-slate-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex flex-1 justify-between">
        <div className="text-center">
          <p className="text-sm font-bold text-green-700">{data.sigv}</p>
          <p className="text-xs text-slate-400">SIGV ({pct(data.sigv)}%)</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-purple-700">{data.topcon}</p>
          <p className="text-xs text-slate-400">TOPCON ({pct(data.topcon)}%)</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-orange-600">{data.boleto}</p>
          <p className="text-xs text-slate-400">Boleto ({pct(data.boleto)}%)</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-700">{formatCurrency(data.value)}</p>
          <p className="text-xs text-slate-400">Valor</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-500">{data.count}</p>
          <p className="text-xs text-slate-400">Notas</p>
        </div>
      </div>
    </div>
  );
};

export default function BranchCard({ name, total, sigv, topcon, boleto, value, screens, screenStats, highlight }) {
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  const stats = [
    {
      icon: CheckSquare,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      value: sigv,
      label: "Lançado SIGV",
      sub: `${pct(sigv)}% do total`,
    },
    {
      icon: BookOpen,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      value: topcon,
      label: "Lançado TOPCON",
      sub: `${pct(topcon)}% do total`,
    },
    {
      icon: Receipt,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      value: boleto,
      label: "Boleto em Mãos",
      sub: `${pct(boleto)}% do total`,
    },
    {
      icon: DollarSign,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      value: formatCurrency(value),
      label: "Valor Total NF",
      sub: null,
      wide: true,
    },
  ];

  const screenTotal = screens ? (screens.notas + screens.compras + screens.frota + screens.controladoria + screens.arquivadas) : 0;

  const screenList = screens ? [
    { icon: FileText,    iconBg: "bg-gray-800",   iconColor: "text-white",      value: screenTotal,           label: "Total" },
    { icon: FileText,    iconBg: "bg-slate-100",  iconColor: "text-slate-600",  value: screens.notas,         label: "Notas Fiscais" },
    { icon: ShoppingCart, iconBg: "bg-blue-50",   iconColor: "text-blue-600",   value: screens.compras,       label: "Gest. Compras" },
    { icon: Truck,       iconBg: "bg-cyan-50",    iconColor: "text-cyan-600",   value: screens.frota,         label: "Gest. Frota" },
    { icon: BarChart2,   iconBg: "bg-indigo-50",  iconColor: "text-indigo-600", value: screens.controladoria, label: "Controladoria" },
    { icon: Receipt,     iconBg: "bg-amber-50",   iconColor: "text-amber-600",  value: screens.arquivadas,    label: "Arquivadas" },
  ] : null;

  return (
    <div className={`bg-white rounded-xl shadow border ${highlight ? "border-slate-300" : "border-slate-100"}`}>
      <div className={`px-5 py-3 border-b ${highlight ? "border-slate-200 bg-slate-50 rounded-t-xl" : "border-slate-100"}`}>
        <h2 className="font-bold text-slate-800 text-base">{name}</h2>
      </div>

      {screenList && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Registros por tela</p>
          <div className="flex flex-wrap gap-4 mb-3">
            {screenList.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm">{s.value}</span>
                  <span className="text-xs text-slate-400 ml-1">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resumo por tela</p>
            <ScreenSummaryRow label="Notas Fiscais" data={screenStats.notas} />
            <ScreenSummaryRow label="Gest. Compras" data={screenStats.compras} />
            <ScreenSummaryRow label="Gest. Frota" data={screenStats.frota} />
            <ScreenSummaryRow label="Controladoria" data={screenStats.controladoria} />
          </div>
        </div>
      )}
    </div>
  );
}