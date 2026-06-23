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
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "importFolder",
        folderId: folderData.id,
        folderName: folderData.name,
        folderPath: folderData.pathLabel,
      });
      setResult(response.data);
      await loadStatus();
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if ((response.data.success || 0) > 0) {
        toast.success(`${response.data.success} nota(s) importada(s) com sucesso!`);
      } else {
        toast.message("Nenhum XML novo foi importado.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setImporting(false);
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

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">OneDrive compartilhado</h2>
        <p className="text-sm text-slate-500 mt-1">Escolha uma pasta do OneDrive para importar XMLs manualmente ou de forma automática.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <Cloud className="w-4 h-4 text-primary" />
              Pasta configurada
            </div>
            <div className="text-sm text-slate-500">
              {settings?.folder_path ? settings.folder_path : "Nenhuma pasta salva ainda."}
            </div>
            {settings?.last_sync_message && (
              <div className="text-xs text-slate-500">
                Último resultado: {settings.last_sync_message}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => saveFolder()} disabled={saving || loading || currentFolder.id === "root"}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar pasta
            </Button>
            <Button variant="outline" onClick={handleToggleAutoSync} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {settings?.auto_sync_enabled ? "Desativar automático" : "Ativar automático"}
            </Button>
            <Button onClick={handleImportFolder} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Importar agora
            </Button>
          </div>
        </div>
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

      <ImportResultSummary result={result} title="Resultado da importação do OneDrive" />
    </section>
  );
}