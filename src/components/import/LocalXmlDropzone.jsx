import React from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LocalXmlDropzone({ dragOver, setDragOver, handleDrop, handleFiles }) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-2xl px-6 py-12 text-center transition-all duration-200 cursor-pointer",
        dragOver
          ? "border-blue-500 bg-blue-50 scale-[1.01]"
          : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/40"
      )}
      onClick={() => document.getElementById("xml-input").click()}
    >
      <input
        id="xml-input"
        type="file"
        accept=".xml"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
          dragOver ? "bg-blue-500" : "bg-gradient-to-br from-blue-500 to-blue-600"
        )}>
          <UploadCloud className="w-8 h-8 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-base">
            {dragOver ? "Solte os arquivos aqui" : "Arraste arquivos XML aqui"}
          </p>
          <p className="text-sm text-slate-500 mt-1">ou clique para selecionar</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Aceita múltiplos arquivos .xml
        </span>
      </div>
    </div>
  );
}