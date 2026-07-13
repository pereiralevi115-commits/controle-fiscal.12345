import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ImportResultSummary from "@/components/import/ImportResultSummary";
import OneDriveFolderBrowser from "@/components/import/OneDriveFolderBrowser";
import OneDriveConnectedFolders from "@/components/import/OneDriveConnectedFolders";
import OneDriveHelpBox from "@/components/import/OneDriveHelpBox";
import OneDriveRunFeedback from "@/components/import/OneDriveRunFeedback";
import { Cloud, Loader2, RefreshCw } from "lucide-react";

// Normaliza a lista de pastas conectadas (considera o campo legado de pasta única).
function getConnectedFolders(settings) {
  if (!settings) return [];
  if (Array.isArray(settings.folders) && settings.folders.length > 0) {
    return settings.folders.filter((f) => f && f.folder_id);
  }
  if (settings.folder_id) {
    return [{ folder_id: settings.folder_id, folder_name: settings.folder_name, folder_path: settings.folder_path }];
  }
  return [];
}

export default function OneDriveXmlImportCard() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState({ id: "root", name: "Raiz do OneDrive", pathLabel: "/" });
  const [xmlFileCount, setXmlFileCount] = useState(0);
  const [folderStack, setFolderStack] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [runFeedback, setRunFeedback] = useState(null);

  const connectedFolders = getConnectedFolders(settings);

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

  const handleAddFolder = async () => {
    if (!currentFolder || currentFolder.id === "root") {
      toast.error("Abra a pasta desejada antes de adicionar.");
      return;
    }

    setSaving(true);
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "addFolder",
        folderId: currentFolder.id,
        folderName: currentFolder.name,
        folderPath: currentFolder.pathLabel,
      });
      setSettings(response.data.settings);
      toast.success("Pasta conectada com sucesso!");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFolder = async (folderId) => {
    setRemovingId(folderId);
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "removeFolder",
        folderId,
      });
      setSettings(response.data.settings);
      toast.success("Pasta removida.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggleAutoSync = async () => {
    if (connectedFolders.length === 0) {
      toast.error("Conecte pelo menos uma pasta primeiro.");
      return;
    }

    setSaving(true);
    try {
      const response = await base44.functions.invoke("oneDriveXmlManager", {
        action: "toggleAutoSync",
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
    if (connectedFolders.length === 0) {
      toast.error("Conecte pelo menos uma pasta do OneDrive primeiro.");
      return;
    }

    setImporting(true);
    setResult(null);
    setImportProgress(null);

    let folderIndex = 0;
    let skip = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    try {
      while (true) {
        const response = await base44.functions.invoke("oneDriveXmlManager", {
          action: "importFolder",
          folderIndex,
          skip,
        });

        const data = response.data;
        totalSuccess = data.totalSuccess ?? totalSuccess;
        totalErrors = data.totalErrors ?? totalErrors;

        setImportProgress({
          folder: (data.folderIndex ?? folderIndex) + 1,
          folderName: data.folderName || "pasta conectada",
          folderCount: data.folderCount || connectedFolders.length,
          processed: data.processed || 0,
          total: data.total || 0,
        });

        if (data.allDone) {
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

        folderIndex = data.nextFolderIndex;
        skip = data.nextSkip;
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  // Roda a mesma rotina do automático sob demanda: varre pendentes em lote.
  const handleRunAuto = async () => {
    if (connectedFolders.length === 0) {
      toast.error("Conecte pelo menos uma pasta do OneDrive primeiro.");
      return;
    }
    setRunningAuto(true);
    const timers = [];
    const moveToStep = (currentStep, detail, delay) => {
      timers.push(setTimeout(() => {
        setRunFeedback((prev) => prev && !prev.done && !prev.error ? { ...prev, currentStep, detail } : prev);
      }, delay));
    };

    setRunFeedback({
      title: "Varredura de pendentes em andamento",
      detail: "Conectando ao OneDrive e preparando as pastas conectadas.",
      currentStep: 0,
    });
    moveToStep(1, "Procurando XMLs que ainda não viraram nota no sistema.", 1200);
    moveToStep(2, "Baixando e lendo os XMLs pendentes encontrados.", 2600);
    moveToStep(3, "Criando notas novas e registrando a auditoria dos arquivos.", 4200);

    try {
      const response = await base44.functions.invoke("oneDriveXmlAutoSync", {});
      const r = response.data?.result || {};
      await loadStatus();
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      window.dispatchEvent(new Event("onedrive-audit-refresh"));
      setRunFeedback({
        title: "Varredura concluída",
        detail: `${r.total || 0} XML(s) analisado(s): ${r.success || 0} importado(s) e ${r.errors || 0} com problema. A aba de auditoria mostra arquivo por arquivo.`,
        currentStep: 4,
        done: true,
      });
      if (r.success > 0) {
        toast.success(`${r.success} nota(s) pendente(s) importada(s)!`);
      } else {
        toast.message("Nenhum XML pendente para importar.");
      }
    } catch (error) {
      const message = error?.response?.data?.error || error.message;
      setRunFeedback({
        title: "Varredura interrompida",
        detail: message,
        currentStep: 0,
        error: true,
      });
      toast.error(message);
    } finally {
      timers.forEach(clearTimeout);
      setRunningAuto(false);
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

  const hasFolder = connectedFolders.length > 0;
  const autoOn = !!settings?.auto_sync_enabled;
  const reachedMax = connectedFolders.length >= 3;

  return (
    <section className="space-y-5">
      <OneDriveHelpBox />

      {/* ── Passo 1: Pastas conectadas + status ── */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/40 p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-sm shadow-indigo-500/30">1</span>
            Pastas conectadas
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${autoOn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${autoOn ? "bg-green-500" : "bg-slate-400"}`} />
            {autoOn ? "Automático ativo em todas" : "Automático desligado"}
          </span>
        </div>

        <OneDriveConnectedFolders
          folders={connectedFolders}
          onRemove={handleRemoveFolder}
          removingId={removingId}
        />

        {importing && importProgress ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-indigo-700">
                Importando {importProgress.folderName} ({importProgress.folder}/{importProgress.folderCount})...
              </span>
              <span className="font-semibold text-slate-700 tabular-nums">
                {importProgress.processed} / {importProgress.total}
                {importProgress.total > 0 && (
                  <span className="text-slate-400 ml-1.5">
                    ({Math.round((importProgress.processed / importProgress.total) * 100)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-indigo-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500 ease-out"
                style={{ width: `${importProgress.total > 0 ? Math.min(100, (importProgress.processed / importProgress.total) * 100) : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Mantenha esta tela aberta enquanto a importação acontece.
            </p>
          </div>
        ) : settings?.last_sync_message ? (
          <p className="text-xs text-slate-500">
            <span className="font-medium">Último resultado:</span> {settings.last_sync_message}
          </p>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <Button onClick={handleImportFolder} disabled={importing || !hasFolder} className="h-10 w-full font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-500/20">
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {importing ? "Importando..." : "Importar agora"}
          </Button>
          <Button variant="outline" onClick={handleRunAuto} disabled={runningAuto || importing || !hasFolder} className="h-10 w-full font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
            {runningAuto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cloud className="w-4 h-4 mr-2" />}
            {runningAuto ? "Varrendo..." : "Varrer pendentes"}
          </Button>
          <Button variant="outline" onClick={handleToggleAutoSync} disabled={saving || !hasFolder} className={`h-10 w-full font-medium ${autoOn ? "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}`}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {autoOn ? "Desativar auto" : "Ativar automático"}
          </Button>
        </div>

        <OneDriveRunFeedback feedback={runFeedback} />

        {/* Legenda explicativa dos botões */}
        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          <div className="flex items-start gap-2 rounded-lg bg-white/70 border border-indigo-100 px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Importar agora:</span> processa todas as pastas na hora, com a tela aberta. Ideal para a carga inicial de arquivos antigos.
            </p>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-white/70 border border-indigo-100 px-3 py-2">
            <Cloud className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Automático:</span> importa sozinho cada XML novo que cair em qualquer pasta conectada, sem precisar abrir o sistema. Ideal para o dia a dia.
            </p>
          </div>
        </div>
      </div>

      {/* ── Passo 2: Adicionar pasta ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-sm shadow-indigo-500/30">2</span>
          {reachedMax ? "Máximo de 3 pastas conectadas" : "Adicionar pasta"}
        </div>
        {reachedMax ? (
          <p className="text-xs text-slate-500 pl-1">
            Você já conectou 3 pastas. Remova uma acima para adicionar outra.
          </p>
        ) : (
          <OneDriveFolderBrowser
            loading={loading}
            currentFolder={currentFolder}
            folders={folders}
            xmlFileCount={xmlFileCount}
            onOpenRoot={() => loadFolder(null, [])}
            onGoBack={folderStack.length > 0 ? handleGoBack : null}
            onOpenFolder={handleOpenFolder}
            onSelectCurrent={handleAddFolder}
          />
        )}
      </div>

      <ImportResultSummary result={result} title="Resultado da importação do OneDrive" />
    </section>
  );
}