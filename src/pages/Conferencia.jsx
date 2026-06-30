import React, { useState } from "react";
import { GitCompareArrows } from "lucide-react";
import ComparisonUploader from "@/components/comparison/ComparisonUploader";
import ComparisonResults from "@/components/comparison/ComparisonResults";

export default function Conferencia() {
  const [result, setResult] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FDB913] flex items-center justify-center">
            <GitCompareArrows className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Conferência de Notas</h1>
            <p className="text-slate-500 mt-0.5">
              Importe a lista do outro sistema e veja exatamente quais notas estão faltando ou sobrando.
            </p>
          </div>
        </div>

        <ComparisonUploader onResult={(data) => setResult(data)} />

        {result && <ComparisonResults result={result} />}
      </div>
    </div>
  );
}