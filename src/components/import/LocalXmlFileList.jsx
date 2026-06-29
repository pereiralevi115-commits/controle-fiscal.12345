import React from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Limite de linhas renderizadas: com milhares de arquivos, criar um nó de DOM
// por arquivo (4600+ linhas) congela e derruba a aba. Mostramos só uma amostra.
const MAX_VISIBLE = 100;

export default function LocalXmlFileList({ files, importing, progress, removeFile, handleImport }) {
  if (files.length === 0) return null;

  const visibleFiles = files.slice(0, MAX_VISIBLE);
  const hiddenCount = files.length - visibleFiles.length;

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {files.length} arquivo{files.length !== 1 ? "s" : ""} selecionado{files.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
        {visibleFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <button
              onClick={() => removeFile(index)}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="px-4 py-2.5 text-center text-xs font-medium text-slate-400">
            + {hiddenCount} outro{hiddenCount !== 1 ? "s" : ""} arquivo{hiddenCount !== 1 ? "s" : ""} (todos serão importados)
          </div>
        )}
      </div>
      <div className="p-4 bg-slate-50/50 border-t border-slate-100">
        <Button onClick={handleImport} disabled={importing} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {progress.total > 0 ? `Importando ${progress.current}/${progress.total}...` : "Importando..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importar {files.length} arquivo{files.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}