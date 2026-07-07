import React from "react";
import LocalXmlImportCard from "@/components/import/LocalXmlImportCard";
import OneDriveXmlImportCard from "@/components/import/OneDriveXmlImportCard";
import PendingEventsButton, { PendingEventsBanner } from "@/components/events/PendingEventsButton";
import AutoImportHistoryButton from "@/components/import/AutoImportHistoryButton";
import OneDriveAuditPanel from "@/components/import/OneDriveAuditPanel";
import { Upload, Cloud, FileStack } from "lucide-react";

export default function ImportXml() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Cabeçalho */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-7 py-8 md:px-10 md:py-10 shadow-xl">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute right-20 bottom-0 w-40 h-40 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur items-center justify-center ring-1 ring-white/20">
              <FileStack className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Integração</h1>
              <p className="text-slate-300 mt-2 max-w-2xl text-sm md:text-base">
                Importe notas fiscais em XML de duas formas: enviando arquivos do seu computador
                ou conectando uma pasta do OneDrive para importação manual ou automática.
              </p>
            </div>
            <div className="relative shrink-0 flex flex-col sm:flex-row gap-2">
              <AutoImportHistoryButton />
              <PendingEventsButton />
            </div>
          </div>
        </div>

        {/* Banner de eventos aguardando aprovação */}
        <PendingEventsBanner />

        {/* Dois caminhos lado a lado */}
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Card: Upload manual */}
          <div className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Upload manual</h2>
                <p className="text-sm text-slate-500">Arraste ou selecione arquivos XML do seu computador.</p>
              </div>
            </div>
            <div className="p-6">
              <LocalXmlImportCard />
            </div>
          </div>

          {/* Card: OneDrive */}
          <div className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">OneDrive compartilhado</h2>
                <p className="text-sm text-slate-500">Conecte uma pasta para importar de forma manual ou automática.</p>
              </div>
            </div>
            <div className="p-6">
              <OneDriveXmlImportCard />
            </div>
          </div>
        </div>

        <OneDriveAuditPanel />
      </div>
    </div>
  );
}