import React from "react";
import { Button } from "@/components/ui/button";
import { Cloud, Trash2, Loader2 } from "lucide-react";

export default function OneDriveConnectedFolders({ folders, onRemove, removingId }) {
  if (!folders || folders.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 px-3.5 py-3 shadow-sm">
        <Cloud className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <span className="text-sm text-slate-400 italic">
          Nenhuma pasta conectada ainda — selecione abaixo (até 3).
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {folders.map((folder) => (
        <div
          key={folder.folder_id}
          className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 shadow-sm"
        >
          <Cloud className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="text-sm text-slate-800 font-medium truncate flex-1">
            {folder.folder_path || folder.folder_name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
            onClick={() => onRemove(folder.folder_id)}
            disabled={removingId === folder.folder_id}
            title="Remover pasta"
          >
            {removingId === folder.folder_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      ))}
      <p className="text-[11px] text-slate-400 pl-1">
        {folders.length}/3 pasta(s) conectada(s).
      </p>
    </div>
  );
}