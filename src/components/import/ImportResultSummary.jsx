import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ImportResultSummary({ result, title = "Resultado da Importação" }) {
  if (!result) return null;

  return (
    <div className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-slate-50/50">
      <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700 leading-none">{result.success || 0}</p>
            <p className="text-xs text-emerald-600 mt-1">Importadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700 leading-none">{result.errors || 0}</p>
            <p className="text-xs text-red-600 mt-1">Erros</p>
          </div>
        </div>
      </div>
      {result.error_details?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500">Detalhes dos erros:</p>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {result.error_details.map((err, idx) => (
              <div key={idx} className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                Arquivo {Number.isInteger(err.index) ? err.index + 1 : idx + 1}: {err.error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}