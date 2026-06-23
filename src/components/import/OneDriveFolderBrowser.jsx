import React from "react";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, HardDrive, RefreshCw, Home, ChevronLeft, Check } from "lucide-react";

export default function OneDriveFolderBrowser({ loading, currentFolder, folders, xmlFileCount, onOpenRoot, onGoBack, onOpenFolder, onSelectCurrent }) {
  const isRoot = currentFolder?.id === "root";

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Barra de navegação */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1 min-w-0">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onOpenRoot} title="Raiz">
            <Home className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onGoBack} disabled={!onGoBack || isRoot} title="Voltar">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 truncate ml-1">{currentFolder?.pathLabel || "/"}</span>
        </div>
        <Button size="sm" className="h-8" onClick={onSelectCurrent} disabled={isRoot || loading}>
          <Check className="w-4 h-4 mr-1.5" />
          Adicionar esta pasta
        </Button>
      </div>

      {/* Contagem de XMLs */}
      <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 border-b border-slate-100">
        <HardDrive className="w-4 h-4 text-slate-400" />
        <span><strong className="text-slate-800">{xmlFileCount}</strong> XML(s) nesta pasta</span>
      </div>

      {/* Lista de subpastas */}
      <div className="bg-white max-h-72 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 px-3 py-8 justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando pastas...
          </div>
        ) : folders.length === 0 ? (
          <div className="text-sm text-slate-400 px-3 py-8 text-center">Nenhuma subpasta aqui.</div>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onOpenFolder(folder)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-indigo-50/60 transition-colors text-left group"
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <Folder className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate">{folder.name}</span>
              </div>
              <FolderOpen className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}