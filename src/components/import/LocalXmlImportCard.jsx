import React, { useCallback, useState } from "react";
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

  const handleImport = async () => {
    if (files.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      const xmlContents = await Promise.all(
        files.map((file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const buffer = reader.result;
            // Lê os bytes crus e detecta o encoding declarado no XML.
            // NF-e/CT-e costumam vir em ISO-8859-1/Windows-1252, e o
            // readAsText padrão (UTF-8) corrompe o conteúdo.
            const headBytes = new Uint8Array(buffer).subarray(0, 200);
            const head = new TextDecoder("ascii").decode(headBytes).toLowerCase();
            const match = head.match(/encoding=["']([^"']+)["']/);
            let encoding = match ? match[1].toLowerCase() : "utf-8";
            if (encoding === "iso-8859-1" || encoding === "latin1") encoding = "windows-1252";
            let text;
            try {
              text = new TextDecoder(encoding).decode(buffer);
            } catch {
              text = new TextDecoder("utf-8").decode(buffer);
            }
            resolve(text);
          };
          reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
          reader.readAsArrayBuffer(file);
        }))
      );

      const batchSize = 5;
      const totalBatches = Math.ceil(xmlContents.length / batchSize);
      let totalSuccess = 0;
      let totalErrors = 0;
      let allErrorDetails = [];

      setProgress({ current: 0, total: xmlContents.length });

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
        const batch = xmlContents.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
        const response = await base44.functions.invoke("parseXml", { xml_contents: batch });
        totalSuccess += response.data.success || 0;
        totalErrors += response.data.errors || 0;
        allErrorDetails = allErrorDetails.concat(
          (response.data.error_details || []).map((item) => ({
            ...item,
            index: item.index + batchIndex * batchSize,
          }))
        );
        setProgress({ current: Math.min((batchIndex + 1) * batchSize, xmlContents.length), total: xmlContents.length });
        if (batchIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const finalResult = {
        success: totalSuccess,
        errors: totalErrors,
        error_details: allErrorDetails,
        total: xmlContents.length,
      };

      setResult(finalResult);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (totalSuccess > 0) toast.success(`${totalSuccess} nota(s) importada(s) com sucesso!`);
      if (totalErrors > 0) toast.warning(`${totalErrors} arquivo(s) com erro`);
      setFiles([]);
    } catch (error) {
      toast.error("Erro ao importar: " + (error?.response?.data?.error || error.message));
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Upload manual</h2>
        <p className="text-sm text-slate-500 mt-1">Envie XMLs direto do seu computador.</p>
      </div>
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