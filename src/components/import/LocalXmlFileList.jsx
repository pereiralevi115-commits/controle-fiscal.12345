import React from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LocalXmlFileList({ files, importing, progress, removeFile, handleImport }) {
  if (files.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border-0 divide-y divide-slate-200">
      {files.map((file, index) => (
        <div key={index} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            onClick={() => removeFile(index)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="p-4">
        <Button onClick={handleImport} disabled={importing} className="w-full">
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