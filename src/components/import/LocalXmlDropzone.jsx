import React from "react";
import { Upload } from "lucide-react";
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
        "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer",
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
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
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">Arraste arquivos XML aqui</p>
          <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
        </div>
      </div>
    </div>
  );
}