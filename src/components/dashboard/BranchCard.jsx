import React from "react";
import { FileText, ShoppingCart, Truck, BarChart2, Receipt, Layers } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const ScreenSummaryRow = ({ label, data, color }) => {
  if (!data || data.count === 0) return null;
  const pct = (n) => data.count > 0 ? Math.round(n / data.count * 100) : 0;
  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-slate-50 border border-slate-100">
      <span className={`text-xs font-bold w-28 flex-shrink-0 ${color}`}>{label}</span>
      <div className="flex flex-1 justify-between items-center">
        <div className="text-center min-w-[60px]">
          <p className="text-sm font-bold text-green-700">{data.sigv}</p>
          <p className="text-[11px] text-slate-400 leading-tight">SIGV<br/><span className="text-green-600 font-semibold">{pct(data.sigv)}%</span></p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center min-w-[60px]">
          <p className="text-sm font-bold text-purple-700">{data.topcon}</p>
          <p className="text-[11px] text-slate-400 leading-tight">TOPCON<br/><span className="text-purple-600 font-semibold">{pct(data.topcon)}%</span></p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center min-w-[60px]">
          <p className="text-sm font-bold text-orange-600">{data.boleto}</p>
          <p className="text-[11px] text-slate-400 leading-tight">Boleto<br/><span className="text-orange-500 font-semibold">{pct(data.boleto)}%</span></p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center min-w-[100px]">
          <p className="text-sm font-bold text-slate-700">{formatCurrency(data.value)}</p>
          <p className="text-[11px] text-slate-400 leading-tight">Valor total</p>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center min-w-[40px]">
          <p className="text-sm font-bold text-slate-500">{data.count}</p>
          <p className="text-[11px] text-slate-400 leading-tight">Notas</p>
        </div>
      </div>
    </div>
  );
};

export default function BranchCard({ name, total, sigv, topcon, boleto, value, screens, screenStats, archivedValue, highlight }) {
  const screenTotal = screens ? (screens.notas + screens.compras + screens.frota + screens.controladoria + screens.arquivadas) : 0;

  const totalValue = screenStats
    ? (screenStats.notas?.value || 0) + (screenStats.compras?.value || 0) + (screenStats.frota?.value || 0) + (screenStats.controladoria?.value || 0) + (archivedValue || 0)
    : 0;

  const screenList = screens ? [
    { icon: FileText,     iconBg: "bg-slate-800",  iconColor: "text-white",       value: screenTotal,           label: "Total",         val: totalValue },
    { icon: FileText,     iconBg: "bg-slate-100",  iconColor: "text-slate-600",   value: screens.notas,         label: "Notas Fiscais", val: screenStats?.notas?.value },
    { icon: Layers,       iconBg: "bg-green-50",   iconColor: "text-green-600",   value: screens.materia_prima,  label: "Mat. Prima",    val: screenStats?.materia_prima?.value },
    { icon: ShoppingCart, iconBg: "bg-blue-50",    iconColor: "text-blue-600",    value: screens.compras,       label: "Gest. Compras", val: screenStats?.compras?.value },
    { icon: Truck,        iconBg: "bg-cyan-50",    iconColor: "text-cyan-600",    value: screens.frota,         label: "Gest. Frota",   val: screenStats?.frota?.value },
    { icon: BarChart2,    iconBg: "bg-indigo-50",  iconColor: "text-indigo-600",  value: screens.controladoria, label: "Controladoria", val: screenStats?.controladoria?.value },
    { icon: Receipt,      iconBg: "bg-amber-50",   iconColor: "text-amber-600",   value: screens.arquivadas,    label: "Arquivadas",    val: archivedValue },
  ] : null;

  const screenRowConfig = [
    { key: "notas",         label: "Notas Fiscais", color: "text-slate-700" },
    { key: "materia_prima", label: "Mat. Prima",    color: "text-green-700" },
    { key: "compras",       label: "Gest. Compras", color: "text-blue-700" },
    { key: "frota",         label: "Gest. Frota",   color: "text-cyan-700" },
    { key: "controladoria", label: "Controladoria", color: "text-indigo-700" },
  ];

  const getBadgeClass = (i) => i === 0
    ? "flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-800 border-slate-700"
    : "flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white border-slate-200";

  const getValueClass = (i) => i === 0 ? "font-bold text-sm text-white" : "font-bold text-sm text-slate-800";
  const getLabelClass = (i) => i === 0 ? "text-xs text-slate-400" : "text-xs text-slate-500";

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${highlight ? "border-slate-300 shadow-md" : "border-slate-200"} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-3 flex items-center justify-between ${highlight ? "bg-slate-800" : "bg-slate-50 border-b border-slate-100"}`}>
        <h2 className={`font-bold text-sm tracking-wide ${highlight ? "text-white" : "text-slate-700"}`}>{name}</h2>
        {highlight && <span className="text-xs text-slate-400 font-medium">Consolidado</span>}
      </div>

      {/* Registros por tela */}
      {screenList && (
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Registros por tela</p>
          <div className="flex flex-wrap gap-3">
            {screenList.map((s, i) => (
              <div key={i} className={getBadgeClass(i)}>
                <div className={`w-5 h-5 rounded ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-3 h-3 ${s.iconColor}`} />
                </div>
                <span className={getValueClass(i)}>{s.value}</span>
                {i > 0 && screenTotal > 0 && (
                  <span className="text-[11px] font-medium text-slate-400">({Math.round(s.value / screenTotal * 100)}%)</span>
                )}
                <span className={getLabelClass(i)}>{s.label}</span>
                {s.val != null && s.val > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600 ml-1">{formatCurrency(s.val)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo por tela */}
      {screenStats && (
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Resumo por tela</p>
          <div className="space-y-2">
            {screenRowConfig.map(({ key, label, color }) => (
              <ScreenSummaryRow key={key} label={label} data={screenStats[key]} color={color} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}