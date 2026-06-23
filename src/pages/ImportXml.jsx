import React from "react";
import LocalXmlImportCard from "@/components/import/LocalXmlImportCard";
import OneDriveXmlImportCard from "@/components/import/OneDriveXmlImportCard";

export default function ImportXml() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Importar XML</h1>
          <p className="text-slate-500 mt-1">
            Importe XMLs manualmente do computador ou direto de uma pasta compartilhada no OneDrive.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <LocalXmlImportCard />
          <OneDriveXmlImportCard />
        </div>
      </div>
    </div>
  );
}