import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function ImportResultSummary({ result, title = "Resultado da Importação" }) {
  if (!result) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border-0 p-6 space-y-4">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold text-emerald-700">{result.success || 0}</p>
            <p className="text-xs text-emerald-600">Importadas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-2xl font-bold text-red-700">{result.errors || 0}</p>
            <p className="text-xs text-red-600">Erros</p>
          </div>
        </div>
      </div>
      {result.error_details?.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Detalhes dos erros:</p>
          {result.error_details.map((err, idx) => (
            <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
              Arquivo {Number.isInteger(err.index) ? err.index + 1 : idx + 1}: {err.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}