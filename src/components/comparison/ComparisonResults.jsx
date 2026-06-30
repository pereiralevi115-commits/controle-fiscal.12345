import React from "react";
import { CheckCircle2, AlertTriangle, ArrowDownToLine } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const StatBox = ({ label, count, value, color, icon: Icon }) => (
  <div className={`rounded-xl border p-4 ${color.border} ${color.bg}`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-4 h-4 ${color.text}`} />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
    <p className={`text-2xl font-bold ${color.text}`}>{count}</p>
    {value != null && <p className="text-sm font-semibold text-slate-500 mt-0.5">{formatCurrency(value)}</p>}
  </div>
);

const DiffTable = ({ title, rows, valueKey, supplierKey, color }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className={`px-5 py-3 border-b border-slate-100 flex items-center justify-between ${color.headerBg}`}>
      <h3 className={`font-bold text-sm ${color.headerText}`}>{title}</h3>
      <span className="text-xs font-medium text-slate-500">{rows.length} notas</span>
    </div>
    {rows.length === 0 ? (
      <div className="py-10 text-center text-slate-400 text-sm">Nenhuma diferença encontrada 🎉</div>
    ) : (
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-semibold px-5 py-2">NF</th>
              {supplierKey && <th className="text-left font-semibold px-5 py-2">Fornecedor</th>}
              <th className="text-right font-semibold px-5 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2 font-medium text-slate-700">{r.number}</td>
                {supplierKey && <td className="px-5 py-2 text-slate-600 truncate max-w-[280px]">{r[supplierKey] || "—"}</td>}
                <td className="px-5 py-2 text-right font-semibold text-slate-700">{formatCurrency(r[valueKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default function ComparisonResults({ result }) {
  if (!result) return null;
  const { summary, onlyExternal, onlySystem } = result;

  const downloadCSV = (rows, valueKey, filename) => {
    const header = "NF;Fornecedor;Valor\n";
    const body = rows
      .map((r) => `${r.number};${(r.supplier_name || "").replace(/;/g, ",")};${(r[valueKey] || 0).toFixed(2).replace(".", ",")}`)
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          label="Notas no outro app"
          count={summary.externalTotal}
          color={{ border: "border-slate-200", bg: "bg-white", text: "text-slate-700" }}
          icon={ArrowDownToLine}
        />
        <StatBox
          label="Notas no seu sistema"
          count={summary.systemTotal}
          color={{ border: "border-slate-200", bg: "bg-white", text: "text-slate-700" }}
          icon={CheckCircle2}
        />
        <StatBox
          label="Existem em ambos"
          count={summary.matchedNumbers}
          color={{ border: "border-green-200", bg: "bg-green-50", text: "text-green-600" }}
          icon={CheckCircle2}
        />
        <StatBox
          label="Só no outro app (faltando aqui)"
          count={summary.onlyExternalCount}
          value={summary.onlyExternalValue}
          color={{ border: "border-red-200", bg: "bg-red-50", text: "text-red-600" }}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="space-y-2">
          <div className="flex justify-end">
            {onlyExternal.length > 0 && (
              <button
                onClick={() => downloadCSV(onlyExternal, "value", "faltando-no-seu-sistema.csv")}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowDownToLine className="w-3 h-3" /> Baixar CSV
              </button>
            )}
          </div>
          <DiffTable
            title="Só no outro app — faltando no seu sistema"
            rows={onlyExternal}
            valueKey="value"
            color={{ headerBg: "bg-red-50", headerText: "text-red-700" }}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-end">
            {onlySystem.length > 0 && (
              <button
                onClick={() => downloadCSV(onlySystem, "total_value", "so-no-seu-sistema.csv")}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowDownToLine className="w-3 h-3" /> Baixar CSV
              </button>
            )}
          </div>
          <DiffTable
            title="Só no seu sistema — não está no outro app"
            rows={onlySystem}
            valueKey="total_value"
            supplierKey="supplier_name"
            color={{ headerBg: "bg-blue-50", headerText: "text-blue-700" }}
          />
        </div>
      </div>
    </div>
  );
}