import React from "react";
import LocalXmlImportCard from "@/components/import/LocalXmlImportCard";
import OneDriveXmlImportCard from "@/components/import/OneDriveXmlImportCard";
import { Upload, Cloud } from "lucide-react";

export default function ImportXml() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Integração</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Importe notas fiscais em XML de duas formas: enviando arquivos do seu computador
            ou conectando uma pasta do OneDrive para importação manual ou automática.
          </p>
        </div>

        {/* Dois caminhos lado a lado */}
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Card: Upload manual */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Upload manual</h2>
                <p className="text-xs text-slate-500">Arraste ou selecione arquivos XML do seu computador.</p>
              </div>
            </div>
            <div className="p-6">
              <LocalXmlImportCard />
            </div>
          </div>

          {/* Card: OneDrive */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">OneDrive compartilhado</h2>
                <p className="text-xs text-slate-500">Conecte uma pasta para importar de forma manual ou automática.</p>
              </div>
            </div>
            <div className="p-6">
              <OneDriveXmlImportCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}