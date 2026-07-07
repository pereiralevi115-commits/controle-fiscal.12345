import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldCheck } from "lucide-react";

const STATUS_LABELS = {
  importado: "Virou nota",
  pendente: "Aguardando análise",
  erro: "Com problema",
  ignorado: "Não importado",
  duplicado: "Já existia",
  evento_pendente: "Evento aguardando nota",
  evento_aplicado: "Evento aplicado",
};

const STATUS_CLASSES = {
  importado: "bg-green-100 text-green-700",
  evento_aplicado: "bg-green-100 text-green-700",
  pendente: "bg-amber-100 text-amber-700",
  evento_pendente: "bg-amber-100 text-amber-700",
  erro: "bg-red-100 text-red-700",
  ignorado: "bg-slate-100 text-slate-700",
  duplicado: "bg-blue-100 text-blue-700",
};

const TYPE_LABELS = {
  nfe: "NF-e",
  cte: "CT-e",
  nfse: "NFS-e",
  evento: "Evento fiscal",
  desconhecido: "Não identificado",
};

const STATUS_HELP = {
  importado: "O XML foi lido corretamente e uma nota foi criada no sistema.",
  evento_aplicado: "O XML era um evento fiscal e já foi aplicado na nota correspondente.",
  evento_pendente: "O XML é um evento fiscal, mas a nota principal ainda não foi encontrada no sistema.",
  erro: "O sistema tentou ler o XML, mas encontrou algum problema no arquivo ou no download.",
  duplicado: "A nota desse XML já existe no sistema, então ela não foi importada novamente.",
  ignorado: "O arquivo foi visto, mas não precisava gerar uma nova nota.",
  pendente: "O arquivo foi visto, mas ainda precisa ser processado em uma próxima varredura.",
};

const STATUS_ACTION = {
  importado: "Nada a fazer.",
  evento_aplicado: "Nada a fazer.",
  evento_pendente: "Confira se a nota principal existe; depois aprove o evento fiscal pendente.",
  erro: "Abra o XML no OneDrive, confira o arquivo e tente importar novamente.",
  duplicado: "Nada a fazer; é apenas uma proteção contra duplicidade.",
  ignorado: "Revise somente se você esperava que esse XML virasse uma nota.",
  pendente: "Aguarde a próxima varredura ou clique em Varrer pendentes.",
};

export default function OneDriveAuditPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.OneDriveXmlAudit.list("-last_seen_at", 200);
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    window.addEventListener("onedrive-audit-refresh", loadRows);
    return () => window.removeEventListener("onedrive-audit-refresh", loadRows);
  }, []);

  const stats = useMemo(() => rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {}), [rows]);

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Auditoria dos XMLs do OneDrive</h2>
            <p className="text-sm text-slate-500">Aqui você acompanha o que aconteceu com cada XML visto pela importação automática.</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadRows} disabled={loading} className="shrink-0">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar auditoria
        </Button>
      </div>

      <div className="p-6 space-y-5">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Como ler esta aba</p>
          <p className="mt-1">Cada linha é um XML encontrado no OneDrive. A coluna “Situação” mostra se ele virou nota, se já existia, se deu erro ou se é um evento fiscal aguardando a nota principal.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["importado", "evento_pendente", "erro", "duplicado", "ignorado"].map((key) => (
            <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">{STATUS_LABELS[key]}</p>
              <p className="text-2xl font-bold text-slate-800">{stats[key] || 0}</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{STATUS_HELP[key]}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Arquivo XML</th>
                <th className="text-left px-4 py-3 font-medium">Documento</th>
                <th className="text-left px-4 py-3 font-medium">Situação</th>
                <th className="text-left px-4 py-3 font-medium">O que significa</th>
                <th className="text-left px-4 py-3 font-medium">O que fazer</th>
                <th className="text-left px-4 py-3 font-medium">Última verificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Nenhum XML auditado ainda.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3 max-w-xs truncate" title={row.file_name}>{row.file_name}</td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[row.document_type] || row.document_type || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_CLASSES[row.status] || "bg-slate-100 text-slate-700"}>{STATUS_LABELS[row.status] || row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-sm">{STATUS_HELP[row.status] || row.reason || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">{STATUS_ACTION[row.status] || "Revise o motivo informado."}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.last_seen_at ? new Date(row.last_seen_at).toLocaleString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}