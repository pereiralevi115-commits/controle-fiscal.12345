import React from "react";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, HardDrive, RefreshCw } from "lucide-react";

export default function OneDriveFolderBrowser({ loading, currentFolder, folders, xmlFileCount, onOpenRoot, onGoBack, onOpenFolder, onSelectCurrent }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Pasta aberta</p>
          <p className="text-sm text-slate-500">{currentFolder?.pathLabel || "/"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onOpenRoot}>Raiz</Button>
          <Button variant="outline" size="sm" onClick={onGoBack} disabled={!onGoBack || currentFolder?.id === "root"}>Voltar</Button>
          <Button size="sm" onClick={onSelectCurrent} disabled={!currentFolder || currentFolder.id === "root" || loading}>
            Usar pasta aberta
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
        <HardDrive className="w-4 h-4" />
        <span>{xmlFileCount} XML(s) encontrados nesta pasta</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando pastas...
          </div>
        ) : folders.length === 0 ? (
          <div className="text-sm text-slate-500 py-6">Nenhuma subpasta encontrada aqui.</div>
        ) : (
          folders.map((folder) => (
            <div key={folder.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3">
              <div className="min-w-0 flex items-center gap-3">
                <Folder className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{folder.name}</p>
                  <p className="text-xs text-slate-500 truncate">{folder.pathLabel}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onOpenFolder(folder)}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Abrir
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}