import React, { useState } from "react";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Converte valor "R$ 34.135,64" / "34135.64" / "1.234,56" em número
function parseBRNumber(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  let s = String(raw).trim().replace(/r\$/i, "").replace(/\s/g, "");
  if (!s) return null;
  // Se tem vírgula, assume formato BR (ponto = milhar, vírgula = decimal)
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Tenta achar os índices das colunas NF, Valor e Data a partir do cabeçalho
function detectColumns(headerCells) {
  const lower = headerCells.map((c) => String(c || "").toLowerCase().trim());
  const find = (terms) => lower.findIndex((c) => terms.some((t) => c.includes(t)));
  return {
    numberIdx: find(["nf", "nº", "n°", "nfe", "nf-e", "número", "numero", "num", "nota", "documento", "doc", "nfse", "nfs-e"]),
    valueIdx: find(["valor", "total", "vlr", "vl "]),
    dateIdx: find(["data", "emiss", "dt "]),
  };
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  // Detecta separador
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const rows = lines.map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()));
  const cols = detectColumns(rows[0]);
  const startIdx = cols.numberIdx >= 0 || cols.valueIdx >= 0 ? 1 : 0;
  const numberIdx = cols.numberIdx >= 0 ? cols.numberIdx : 0;
  const valueIdx = cols.valueIdx >= 0 ? cols.valueIdx : (rows[0].length > 1 ? rows[0].length - 1 : 1);
  const dateIdx = cols.dateIdx;
  const out = [];
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i];
    const number = r[numberIdx];
    if (!number) continue;
    out.push({
      number,
      value: parseBRNumber(r[valueIdx]),
      date: dateIdx >= 0 ? r[dateIdx] : null,
    });
  }
  return out;
}

export default function ComparisonUploader({ onResult }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    setFileName(file.name);
    setLoading(true);
    try {
      let externalList = [];
      const name = file.name.toLowerCase();

      if (name.endsWith(".csv") || name.endsWith(".txt")) {
        const text = await file.text();
        externalList = parseCSV(text);
      } else if (name.endsWith(".xls")) {
        // .xls antigo costuma vir como CSV/HTML/texto delimitado — tenta ler como texto primeiro
        const text = await file.text();
        const looksBinary = /\x00/.test(text.slice(0, 2000));
        if (looksBinary) {
          throw new Error(
            "Este arquivo .xls é do formato antigo do Excel e não pode ser lido. Abra no Excel ou Google Sheets e salve como .xlsx ou .csv, depois importe novamente."
          );
        }
        externalList = parseCSV(text);
      } else if (name.endsWith(".xlsx") || name.endsWith(".json")) {
        // Excel/JSON: extrai via integração ExtractDataFromUploadedFile
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              rows: {
                type: "array",
                description: "Cada linha da planilha. Identifique a coluna que contém o número da nota fiscal (pode se chamar NF, Nota, Documento, Doc, NFe, Número, Nº etc.), o valor e a data.",
                items: {
                  type: "object",
                  properties: {
                    number: { type: "string", description: "Número/identificador da nota fiscal daquela linha" },
                    value: { type: "number", description: "Valor total da nota (se houver)" },
                    date: { type: "string", description: "Data de emissão (se houver)" },
                  },
                },
              },
            },
          },
        });
        if (res.status === "success" && res.output) {
          const arr = Array.isArray(res.output) ? res.output : res.output.rows || [];
          externalList = arr
            .map((r) => ({
              number: r.number != null ? String(r.number).trim() : "",
              value: typeof r.value === "number" ? r.value : parseBRNumber(r.value),
              date: r.date || null,
            }))
            .filter((r) => r.number && /\d/.test(r.number));
        } else {
          throw new Error(res.details || "Não consegui ler o arquivo.");
        }
      } else {
        throw new Error("Formato não suportado. Use CSV, Excel ou JSON.");
      }

      externalList = externalList.filter((r) => r.number);
      if (!externalList.length) {
        throw new Error(
          "Não encontrei números de nota no arquivo. Confira se existe uma coluna com o número da NF (ex.: NF, Nota, Documento, Número) e se ela não está vazia. Se a planilha tiver linhas de título acima do cabeçalho, remova-as e tente de novo."
        );
      }

      const response = await base44.functions.invoke("compareInvoices", { externalList });
      onResult(response.data, externalList.length);
    } catch (e) {
      setError(e.message || "Erro ao processar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <label
        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-xl py-10 px-6 cursor-pointer hover:border-[#FDB913] hover:bg-amber-50/40 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        {loading ? (
          <Loader2 className="w-10 h-10 text-[#FDB913] animate-spin" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-[#FDB913]" />
          </div>
        )}
        <div className="text-center">
          <p className="font-semibold text-slate-700">
            {loading ? "Processando..." : "Importar lista do outro sistema"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {fileName || "Arraste ou clique para enviar CSV, Excel ou JSON"}
          </p>
        </div>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,.xls,.json"
          className="hidden"
          disabled={loading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
        <Upload className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          O arquivo deve ter ao menos uma coluna <strong>NF</strong> (número da nota). As colunas
          <strong> Valor</strong> e <strong> Data</strong> são opcionais e ajudam na conferência. A comparação é feita
          pelo número da nota (ignorando zeros à esquerda).
        </span>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}
    </div>
  );
}