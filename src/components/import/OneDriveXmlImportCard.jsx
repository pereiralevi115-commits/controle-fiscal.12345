import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ImportResultSummary from "@/components/import/ImportResultSummary";
import OneDriveFolderBrowser from "@/components/import/OneDriveFolderBrowser";
import { Cloud, Loader2, RefreshCw } from "lucide-react";

export default function OneDriveXmlImportCard() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState({ id: "root", name: "Raiz do OneDrive", pathLabel: "/" });
  const [xmlFileCount, setXmlFileCount] = useState(0);
  const [folderStack, setFolderStack] = useState([]);

  const loadStatus = async () => {
    const response = await base44.functions.invoke("oneDriveXmlManager", { action: "getStatus" });
    setSettings(response.data.settings || null);
  };

  const loadFolder = async (parentId = null, stack = []) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "listFolderItems",
        parentId,
      });
      setFolders(response.data.folders || []);
      setCurrentFolder(response.data.currentFolder || { id: "root", name: "Raiz do OneDrive", pathLabel: "/" });
      setXmlFileCount(response.data.xmlFileCount || 0);
      setFolderStack(stack);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadStatus(), loadFolder()]).catch(() => {});
  }, []);

  const saveFolder = async (autoSyncEnabled = settings?.auto_sync_enabled ?? false) => {
    if (!currentFolder || currentFolder.id === "root") {
      toast.error("Abra a pasta desejada antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "saveSettings",
        folderId: currentFolder.id,
        folderName: currentFolder.name,
        folderPath: currentFolder.pathLabel,
        autoSyncEnabled,
      });
      setSettings(response.data.settings);
      toast.success("Pasta do OneDrive salva com sucesso!");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!settings?.folder_id && currentFolder?.id === "root") {
      toast.error("Selecione uma pasta primeiro.");
      return;
    }

    const folderData = settings?.folder_id ? settings : currentFolder;
    setSaving(true);
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "saveSettings",
        folderId: folderData.folder_id || folderData.id,
        folderName: folderData.folder_name || folderData.name,
        folderPath: folderData.folder_path || folderData.pathLabel,
        autoSyncEnabled: !settings?.auto_sync_enabled,
      });
      setSettings(response.data.settings);
      toast.success(!settings?.auto_sync_enabled ? "Importação automática ativada!" : "Importação automática desativada.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSaving(false);
    }
  };

  const [importProgress, setImportProgress] = useState(null);

  const handleImportFolder = async () => {
    const folderData = settings?.folder_id
      ? { id: settings.folder_id, name: settings.folder_name, pathLabel: settings.folder_path }
      : currentFolder;

    if (!folderData?.id || folderData.id === "root") {
      toast.error("Selecione uma pasta do OneDrive primeiro.");
      return;
    }

    setImporting(true);
    setResult(null);
    setImportProgress(null);

    let skip = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let grandTotal = 0;

    try {
      while (true) {
        const response = await base44.functions.invoke("oneDriveXmlManager", {
          action: "importFolder",
          folderId: folderData.id,
          folderName: folderData.name,
          folderPath: folderData.pathLabel,
          skip,
        });

        const data = response.data;
        grandTotal = data.total || grandTotal;
        totalSuccess = data.totalSuccess ?? (totalSuccess + (data.success || 0));
        totalErrors = data.totalErrors ?? (totalErrors + (data.errors || 0));

        setImportProgress({
          processed: data.processed || (skip + 10),
          total: grandTotal,
        });

        if (data.done) {
          setResult({ success: totalSuccess, errors: totalErrors, error_details: data.error_details || [] });
          await loadStatus();
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          if (totalSuccess > 0) {
            toast.success(`${totalSuccess} nota(s) importada(s) com sucesso!`);
          } else {
            toast.message("Nenhum XML novo foi importado.");
          }
          break;
        }

        skip = data.processed;
        // Pequena pausa entre lotes para não sobrecarregar
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleOpenFolder = (folder) => {
    loadFolder(folder.id, [...folderStack, currentFolder]);
  };

  const handleGoBack = () => {
    const previous = folderStack[folderStack.length - 1];
    const nextStack = folderStack.slice(0, -1);
    loadFolder(previous?.id === "root" ? null : previous?.id, nextStack);
  };

  const hasFolder = !!settings?.folder_id;
  const autoOn = !!settings?.auto_sync_enabled;

  return (
    <section className="space-y-5">
      {/* ── Passo 1: Pasta atual + status ── */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/40 p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-sm shadow-indigo-500/30">1</span>
            Pasta conectada
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${autoOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${autoOn ? "bg-green-500" : "bg-slate-400"}`} />
            {autoOn ? "Automático ativo" : "Automático desligado"}
          </span>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 px-3.5 py-3 shadow-sm">
          <Cloud className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className={`text-sm truncate ${hasFolder ? "text-slate-800 font-medium" : "text-slate-400 italic"}`}>
            {hasFolder ? settings.folder_path : "Nenhuma pasta conectada ainda — selecione abaixo."}
          </span>
        </div>

        {settings?.last_sync_message && (
          <p className="text-xs text-slate-500">
            <span className="font-medium">Último resultado:</span> {settings.last_sync_message}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={handleImportFolder} disabled={importing || (!hasFolder && currentFolder.id === "root")} className="flex-1 min-w-[140px] bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {importing && importProgress
              ? `${importProgress.processed}/${importProgress.total}...`
              : "Importar agora"}
          </Button>
          <Button variant="outline" onClick={handleToggleAutoSync} disabled={saving} className="flex-1 min-w-[140px] border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {autoOn ? "Desativar automático" : "Ativar automático"}
          </Button>
        </div>
      </div>

      {/* ── Passo 2: Escolher pasta ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-sm shadow-indigo-500/30">2</span>
          Escolher outra pasta
        </div>
        <OneDriveFolderBrowser
          loading={loading}
          currentFolder={currentFolder}
          folders={folders}
          xmlFileCount={xmlFileCount}
          onOpenRoot={() => loadFolder(null, [])}
          onGoBack={folderStack.length > 0 ? handleGoBack : null}
          onOpenFolder={handleOpenFolder}
          onSelectCurrent={() => saveFolder(settings?.auto_sync_enabled ?? false)}
        />
      </div>

      <ImportResultSummary result={result} title="Resultado da importação do OneDrive" />
    </section>
  );
}