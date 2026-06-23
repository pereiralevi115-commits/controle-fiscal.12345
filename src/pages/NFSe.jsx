import React from "react";

export default function NFSe() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">NFS-e</h1>
          <p className="text-slate-500 mt-1">
            Notas Fiscais de Serviço Eletrônicas.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border-0 p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">Nenhuma NFS-e cadastrada ainda</p>
          <p className="text-sm mt-1">Em breve esta tela exibirá a listagem de NFS-e.</p>
        </div>
      </div>
    </div>
  );
}