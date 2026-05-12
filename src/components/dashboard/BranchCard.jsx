import React from "react";
import { FileText, CheckSquare, Receipt, BookOpen, DollarSign, ShoppingCart, Truck, BarChart2, Leaf } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function BranchCard({ name, total, sigv, topcon, boleto, value, screens, highlight }) {
  const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

  const stats = [
    {
      icon: FileText,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
      value: total,
      label: "Total de Notas",
      sub: null,
    },
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

  const screenStats = screens ? [
    { icon: FileText,    iconBg: "bg-slate-100",  iconColor: "text-slate-600",  value: screens.nf,          label: "NF" },
    { icon: ShoppingCart, iconBg: "bg-blue-50",   iconColor: "text-blue-600",   value: screens.compras,     label: "Gest. Compras" },
    { icon: Truck,       iconBg: "bg-cyan-50",    iconColor: "text-cyan-600",   value: screens.frota,       label: "Gest. Frota" },
    { icon: BarChart2,   iconBg: "bg-indigo-50",  iconColor: "text-indigo-600", value: screens.controladoria, label: "Controladoria" },
    { icon: Leaf,        iconBg: "bg-lime-50",    iconColor: "text-lime-600",   value: screens.materia,     label: "Mat. Prima" },
  ] : null;

  return (
    <div className={`bg-white rounded-xl shadow border ${highlight ? "border-slate-300" : "border-slate-100"}`}>
      <div className={`px-5 py-3 border-b ${highlight ? "border-slate-200 bg-slate-50 rounded-t-xl" : "border-slate-100"}`}>
        <h2 className="font-bold text-slate-800 text-base">{name}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100">
        {stats.map((s, i) => (
          <div key={i} className="flex items-center gap-4 p-5">
            <div className={`w-10 h-10 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
            <div>
              <p className={`font-bold text-slate-800 ${s.wide ? "text-base" : "text-2xl"}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              {s.sub && <p className="text-xs text-slate-400">{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>
      {screenStats && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Registros por tela</p>
          <div className="flex flex-wrap gap-4">
            {screenStats.map((s, i) => (
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
        </div>
      )}
    </div>
  );
}