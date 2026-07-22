import React, { useState } from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function DdaImportCard({ onImported }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke("ddaBoletosManager", {
        action: "import",
        file_url,
        file_name: file.name,
      });
      const data = response.data;
      setMessage(`${data.total} boleto(s) importado(s): ${data.linked} vinculado(s) automaticamente e ${data.pending} pendente(s).`);
      onImported?.();
    } catch (e) {
      setError(e.message || "Não foi possível importar o relatório DDA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <label
        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-xl py-10 px-6 cursor-pointer hover:border-[#FDB913] hover:bg-amber-50/40 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
      >
        {loading ? <Loader2 className="w-10 h-10 text-[#FDB913] animate-spin" /> : <FileSpreadsheet className="w-10 h-10 text-[#FDB913]" />}
        <div className="text-center">
          <p className="font-semibold text-slate-700">{loading ? "Importando DDA..." : "Importar relatório DDA"}</p>
          <p className="text-sm text-slate-400 mt-1">Arraste ou clique para enviar o Excel do banco</p>
        </div>
        <input type="file" accept=".xlsx,.xls" className="hidden" disabled={loading} onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
        <Upload className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Boletos com alta confiança são vinculados automaticamente. Os demais ficam pendentes para conferência.</span>
      </div>
      {message && <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{message}</div>}
      {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
    </div>
  );
}