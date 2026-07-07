import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldCheck } from "lucide-react";

const STATUS_LABELS = {
  importado: "Importado",
  pendente: "Pendente",
  erro: "Erro",
  ignorado: "Ignorado",
  duplicado: "Duplicado",
  evento_pendente: "Evento pendente",
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
            <p className="text-sm text-slate-500">Últimos arquivos vistos pela importação automática e o resultado de cada um.</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadRows} disabled={loading} className="shrink-0">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar auditoria
        </Button>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["importado", "evento_pendente", "erro", "duplicado", "ignorado"].map((key) => (
            <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">{STATUS_LABELS[key]}</p>
              <p className="text-2xl font-bold text-slate-800">{stats[key] || 0}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Arquivo</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Motivo</th>
                <th className="text-left px-4 py-3 font-medium">Visto em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Nenhum XML auditado ainda.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 max-w-xs truncate" title={row.file_name}>{row.file_name}</td>
                  <td className="px-4 py-3 uppercase text-slate-600">{row.document_type || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_CLASSES[row.status] || "bg-slate-100 text-slate-700"}>{STATUS_LABELS[row.status] || row.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-md truncate" title={row.reason}>{row.reason || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{row.last_seen_at ? new Date(row.last_seen_at).toLocaleString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}