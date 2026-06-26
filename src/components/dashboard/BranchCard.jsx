import React, { useState } from "react";
import { FileText, ShoppingCart, Truck, BarChart2, Receipt, Layers, FileSpreadsheet, FileBox, Wallet, X } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const compactCurrency = (value) => {
  const v = value || 0;
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return formatCurrency(v);
};

// Pequeno cartão de métrica por tela
const ScreenTile = ({ icon: Icon, label, count, value, percent, accent, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left flex flex-col gap-1 rounded-xl border bg-white p-3 hover:shadow-sm transition-all ${selected ? "border-slate-800 ring-2 ring-slate-800/20 shadow-sm" : "border-slate-100 hover:border-slate-200"}`}
  >
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${accent.text}`} />
      </div>
      <span className="text-[11px] font-semibold text-slate-500 truncate">{label}</span>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-bold text-slate-800 leading-none">{count}</span>
      {percent != null && <span className="text-[11px] font-medium text-slate-400">{percent}%</span>}
    </div>
    {value != null && (
      <span className="text-[12px] font-semibold text-emerald-600">{formatCurrency(value)}</span>
    )}
  </button>
);

// Mini barra de progresso para SIGV/TOPCON/Boleto
const ProgressStat = ({ label, value, count, barColor, textColor }) => {
  const pct = count > 0 ? Math.round((value / count) * 100) : 0;
  return (
    <div className="flex-1 min-w-[120px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className={`text-[11px] font-bold ${textColor}`}>{value}/{count} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// Linha de resumo por tela com barras de progresso
const ScreenSummaryRow = ({ label, data, dotColor }) => {
  if (!data || data.count === 0) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-sm font-bold text-slate-700">{label}</span>
          <span className="text-[11px] font-medium text-slate-400">· {data.count} notas</span>
        </div>
        <span className="text-sm font-bold text-slate-800">{formatCurrency(data.value)}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        <ProgressStat label="SIGV" value={data.sigv} count={data.count} barColor="bg-green-500" textColor="text-green-600" />
        <ProgressStat label="TOPCON" value={data.topcon} count={data.count} barColor="bg-purple-500" textColor="text-purple-600" />
        <ProgressStat label="Boleto" value={data.boleto} count={data.count} barColor="bg-orange-500" textColor="text-orange-600" />
      </div>
    </div>
  );
};

export default function BranchCard({ name, total, sigv, topcon, boleto, value, screens, screenStats, archivedValue, archivedNfeValue, archivedNfseValue, cteStats, nfseStats, highlight }) {
  const [selectedTiles, setSelectedTiles] = useState([]);

  const toggleTile = (key) =>
    setSelectedTiles((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const screenTotal = screens
    ? (screens.notas + screens.materia_prima + screens.compras + screens.frota + screens.controladoria + screens.arquivadas + (nfseStats?.count || 0) + (cteStats?.count || 0))
    : 0;

  const totalValue = screenStats
    ? (screenStats.notas?.value || 0) + (screenStats.materia_prima?.value || 0) + (screenStats.compras?.value || 0) + (screenStats.frota?.value || 0) + (screenStats.controladoria?.value || 0) + (archivedValue || 0) + (nfseStats?.value || 0) + (cteStats?.value || 0)
    : 0;

  const pctOf = (n) => screenTotal > 0 ? Math.round((n / screenTotal) * 100) : 0;

  const tiles = screens ? [
    { key: "notas",         icon: FileText,        label: "NF-e",          count: screens.notas,         value: screenStats?.notas?.value,         percent: pctOf(screens.notas),         accent: { bg: "bg-slate-100",  text: "text-slate-600" } },
    ...(nfseStats ? [{ key: "nfse", icon: FileSpreadsheet, label: "NFS-e", count: nfseStats.count, value: nfseStats.value, accent: { bg: "bg-rose-50", text: "text-rose-600" } }] : []),
    ...(cteStats ? [{ key: "cte", icon: FileBox, label: "CT-e", count: cteStats.count, value: cteStats.value, accent: { bg: "bg-teal-50", text: "text-teal-600" } }] : []),
    { key: "materia_prima", icon: Layers,       label: "Mat. Prima",    count: screens.materia_prima, value: screenStats?.materia_prima?.value, percent: pctOf(screens.materia_prima), accent: { bg: "bg-green-50",   text: "text-green-600" } },
    { key: "compras",       icon: ShoppingCart, label: "Gest. Compras", count: screens.compras,       value: screenStats?.compras?.value,       percent: pctOf(screens.compras),       accent: { bg: "bg-blue-50",    text: "text-blue-600" } },
    { key: "frota",         icon: Truck,        label: "Gest. Frota",   count: screens.frota,         value: screenStats?.frota?.value,         percent: pctOf(screens.frota),         accent: { bg: "bg-cyan-50",    text: "text-cyan-600" } },
    { key: "controladoria", icon: BarChart2,    label: "Controladoria", count: screens.controladoria, value: screenStats?.controladoria?.value, percent: pctOf(screens.controladoria), accent: { bg: "bg-indigo-50",  text: "text-indigo-600" } },
    { key: "arquivadas_nfe",  icon: Receipt,    label: "Arq. NF-e",     count: screens.arquivadas_nfe,  value: archivedNfeValue,  percent: pctOf(screens.arquivadas_nfe),  accent: { bg: "bg-amber-50",   text: "text-amber-600" } },
    { key: "arquivadas_nfse", icon: Receipt,    label: "Arq. NFS-e",    count: screens.arquivadas_nfse, value: archivedNfseValue, percent: pctOf(screens.arquivadas_nfse), accent: { bg: "bg-orange-50",  text: "text-orange-600" } },
  ] : null;

  const activeTiles = tiles?.filter((t) => selectedTiles.includes(t.key)) || [];
  const selectionCount = activeTiles.reduce((acc, t) => acc + (t.count || 0), 0);
  const selectionValue = activeTiles.reduce((acc, t) => acc + (t.value || 0), 0);

  const screenRowConfig = [
    { key: "notas",         label: "NF-e",                 dotColor: "bg-slate-400", data: screenStats?.notas },
    { key: "nfse",          label: "NFS-e",                dotColor: "bg-rose-500",  data: nfseStats },
    { key: "compras",       label: "Gestão de Compras",    dotColor: "bg-blue-500" },
    { key: "frota",         label: "Gestão de Frota",      dotColor: "bg-cyan-500" },
    { key: "controladoria", label: "Controladoria",        dotColor: "bg-indigo-500" },
  ];

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${highlight ? "border-slate-300 shadow-lg" : "border-slate-200"} overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-4 flex items-center justify-between ${highlight ? "bg-gradient-to-r from-slate-900 to-slate-700" : "bg-slate-50 border-b border-slate-100"}`}>
        <div className="flex items-center gap-3">
          <h2 className={`font-bold text-base tracking-wide ${highlight ? "text-white" : "text-slate-700"}`}>{name}</h2>
          {highlight && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-medium">Consolidado</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-[10px] uppercase tracking-widest ${highlight ? "text-slate-400" : "text-slate-400"}`}>Notas</p>
            <p className={`text-lg font-bold ${highlight ? "text-white" : "text-slate-700"}`}>{screenTotal}</p>
          </div>
          <div className="text-right">
            <p className={`text-[10px] uppercase tracking-widest ${highlight ? "text-slate-400" : "text-slate-400"}`}>Valor total</p>
            <p className={`text-lg font-bold ${highlight ? "text-emerald-400" : "text-emerald-600"}`}>{formatCurrency(totalValue)}</p>
          </div>
        </div>
      </div>

      {/* Cartões por tela */}
      {tiles && (
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Registros por tela</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {tiles.map((t) => (
              <ScreenTile
                key={t.key}
                {...t}
                selected={selectedTiles.includes(t.key)}
                onClick={() => toggleTile(t.key)}
              />
            ))}
          </div>

          {activeTiles.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-800/20 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Soma de {activeTiles.length} tela(s) selecionada(s)
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {activeTiles.map((t) => (
                      <span key={t.key} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.accent.bg} ${t.accent.text}`}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Notas</p>
                    <p className="text-xl font-bold text-slate-700 leading-none">{selectionCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Valor total</p>
                    <p className="text-2xl font-bold text-emerald-600 leading-none">{formatCurrency(selectionValue)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTiles([])}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resumo por tela com barras de progresso */}
      {screenStats && (
        <div className="px-6 py-5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Progresso de lançamentos por tela</p>
          <div className="space-y-3">
            {screenRowConfig.map(({ key, label, dotColor, data }) => (
              <ScreenSummaryRow key={key} label={label} data={data !== undefined ? data : screenStats[key]} dotColor={dotColor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}