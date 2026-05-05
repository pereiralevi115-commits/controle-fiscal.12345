import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImportXml() {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback((newFiles) => {
    const xmlFiles = Array.from(newFiles).filter(
      (f) => f.name.endsWith(".xml") || f.type === "text/xml" || f.type === "application/xml"
    );
    if (xmlFiles.length === 0) {
      toast.error("Selecione apenas arquivos XML");
      return;
    }
    setFiles((prev) => [...prev, ...xmlFiles]);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      // Read all XML files as text
      const xmlContents = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
              reader.readAsText(file);
            })
        )
      );

      const response = await base44.functions.invoke("parseXml", {
        xml_contents: xmlContents,
      });

      setResult(response.data);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      if (response.data.success > 0) {
        toast.success(`${response.data.success} nota(s) importada(s) com sucesso!`);
      }
      if (response.data.errors > 0) {
        toast.warning(`${response.data.errors} arquivo(s) com erro`);
      }

      setFiles([]);
    } catch (error) {
      toast.error("Erro ao importar: " + (error?.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Importar XML</h1>
          <p className="text-slate-500 mt-1">
            Faça upload dos arquivos XML de notas fiscais (NF-e)
          </p>
        </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
        onClick={() => document.getElementById("xml-input").click()}
      >
        <input
          id="xml-input"
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Arraste arquivos XML aqui</p>
            <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar</p>
          </div>
        </div>
      </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-0 divide-y divide-slate-200">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="p-4">
            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {files.length} arquivo{files.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg border-0 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Resultado da Importação</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-700">{result.success}</p>
                <p className="text-xs text-emerald-600">Importadas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{result.errors}</p>
                <p className="text-xs text-red-600">Erros</p>
              </div>
            </div>
          </div>
          {result.error_details?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Detalhes dos erros:</p>
              {result.error_details.map((err, idx) => (
                <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                  Arquivo {err.index + 1}: {err.error}
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}