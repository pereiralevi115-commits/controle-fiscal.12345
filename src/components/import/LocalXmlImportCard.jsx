import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ImportResultSummary from "@/components/import/ImportResultSummary";
import LocalXmlDropzone from "@/components/import/LocalXmlDropzone";
import LocalXmlFileList from "@/components/import/LocalXmlFileList";

export default function LocalXmlImportCard() {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const lockHeldRef = useRef(false);

  // Se o usuário fechar/recarregar a aba no meio do upload, libera a trava global
  // para não deixá-la presa bloqueando as próximas importações.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lockHeldRef.current) {
        base44.functions.invoke("parseXml", { action: "unlock" }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleFiles = useCallback((newFiles) => {
    const xmlFiles = Array.from(newFiles).filter(
      (file) => file.name.endsWith(".xml") || file.type === "text/xml" || file.type === "application/xml"
    );
    if (xmlFiles.length === 0) {
      toast.error("Selecione apenas arquivos XML");
      return;
    }
    setFiles((prev) => [...prev, ...xmlFiles]);
    setResult(null);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  // Lê UM arquivo do disco e devolve o texto decodificado.
  const readFileText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      // Tenta decodificar como UTF-8 em modo estrito. Se o arquivo estiver em
      // ISO-8859-1/Windows-1252 (comum em NF-e/CT-e antigos), o UTF-8 estrito
      // falha e caímos para windows-1252. Isso evita tanto a corrupção de
      // acentos quanto o caractere inválido (U+FFFD) que tornava o XML ilegível.
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        text = new TextDecoder("windows-1252").decode(buffer);
      }
      resolve(text);
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsArrayBuffer(file);
  });

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      // IMPORTANTE: lemos os arquivos LOTE A LOTE, não todos de uma vez.
      // Com milhares de XMLs, abrir um FileReader por arquivo simultaneamente
      // (Promise.all sobre 4600+ arquivos) estourava a memória e travava a aba.
      // Agora só os arquivos do lote atual ficam carregados na memória.
      const batchSize = 40;
      const totalBatches = Math.ceil(files.length / batchSize);
      let totalSuccess = 0;
      let totalErrors = 0;
      let allErrorDetails = [];

      setProgress({ current: 0, total: files.length });

      // Adquire a trava UMA vez para todo o upload. Assim os lotes não competem
      // com a importação automática (que rodava a cada 30 min e roubava a trava
      // entre lotes, fazendo o processo parar no meio e voltar à tela).
      let lockHeld = false;
      try {
        await base44.functions.invoke("parseXml", { action: "lock" });
        lockHeld = true;
        lockHeldRef.current = true;

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
          const fileBatch = files.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
          // Lê apenas os arquivos deste lote (limitado a batchSize).
          const batch = await Promise.all(fileBatch.map(readFileText));

          // Resiliência por lote: se UM lote falhar (timeout/500), registramos o
          // erro e seguimos para o próximo — em vez de abortar todo o upload e
          // perder o progresso já feito.
          try {
            const response = await base44.functions.invoke("parseXml", { xml_contents: batch, keep_lock: true });
            totalSuccess += response.data.success || 0;
            totalErrors += response.data.errors || 0;
            allErrorDetails = allErrorDetails.concat(
              (response.data.error_details || []).map((item) => ({
                ...item,
                index: item.index + batchIndex * batchSize,
              }))
            );
          } catch (batchErr) {
            totalErrors += batch.length;
            allErrorDetails.push({
              index: batchIndex * batchSize,
              error: `Lote ${batchIndex + 1} falhou: ${batchErr?.response?.data?.error || batchErr.message}`,
            });
          }

          setProgress({ current: Math.min((batchIndex + 1) * batchSize, files.length), total: files.length });

          // Cede a thread principal entre lotes: dá ao navegador a chance de
          // coletar o lixo (os textos do lote anterior) e repintar a barra de
          // progresso, evitando que a aba congele/recarregue em volumes grandes.
          await new Promise((r) => setTimeout(r, 50));
        }
      } finally {
        if (lockHeld) {
          await base44.functions.invoke("parseXml", { action: "unlock" }).catch(() => {});
          lockHeldRef.current = false;
        }
      }

      const finalResult = {
        success: totalSuccess,
        errors: totalErrors,
        error_details: allErrorDetails,
        total: files.length,
      };

      setResult(finalResult);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (totalSuccess > 0) toast.success(`${totalSuccess} nota(s) importada(s) com sucesso!`);
      if (totalErrors > 0) toast.warning(`${totalErrors} arquivo(s) com erro`);
      setFiles([]);
    } catch (error) {
      if (error?.response?.status === 409 || error?.response?.data?.import_busy) {
        toast.error(error?.response?.data?.error || "Já existe uma importação em andamento. Aguarde concluir.");
      } else {
        toast.error("Erro ao importar: " + (error?.response?.data?.error || error.message));
      }
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <section className="space-y-4">
      <LocalXmlDropzone
        dragOver={dragOver}
        setDragOver={setDragOver}
        handleDrop={handleDrop}
        handleFiles={handleFiles}
      />
      <LocalXmlFileList
        files={files}
        importing={importing}
        progress={progress}
        removeFile={removeFile}
        handleImport={handleImport}
      />
      <ImportResultSummary result={result} />
    </section>
  );
}