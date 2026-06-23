import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Ban,
  FileEdit,
  CheckCircle2,
  Eye,
  ThumbsDown,
  XCircle,
  FileClock,
  Info,
} from "lucide-react";

// Mapeia o código do evento (tpEvento) para rótulo, ícone e cor.
const EVENT_CONFIG = {
  "110111": { label: "Cancelamento", icon: Ban, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  "110110": { label: "Carta de Correção (CC-e)", icon: FileEdit, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  "210200": { label: "Confirmação da Operação", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  "210210": { label: "Ciência da Operação", icon: Eye, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
  "210220": { label: "Desconhecimento da Operação", icon: ThumbsDown, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  "210240": { label: "Operação Não Realizada", icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
};

const getConfig = (event) => {
  return (
    EVENT_CONFIG[event.event_type_code] || {
      label: event.event_type_label || "Evento Fiscal",
      icon: Info,
      color: "text-slate-600",
      bg: "bg-slate-50",
      border: "border-slate-200",
    }
  );
};

const fmtEventDate = (d) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return d;
  }
};

export default function FiscalEventsSection({ events }) {
  if (!events || events.length === 0) return null;

  // Ordena por data (mais recente primeiro)
  const sorted = [...events].sort((a, b) => {
    const da = a.event_date ? new Date(a.event_date).getTime() : 0;
    const db = b.event_date ? new Date(b.event_date).getTime() : 0;
    return db - da;
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-slate-800 text-white px-6 py-3 font-bold text-sm tracking-wide flex items-center gap-2">
        <FileClock className="w-4 h-4" />
        EVENTOS DO DOCUMENTO ({sorted.length})
      </div>
      <div className="p-4 space-y-3">
        {sorted.map((event, idx) => {
          const cfg = getConfig(event);
          const Icon = cfg.icon;
          return (
            <div
              key={idx}
              className={`flex gap-3 p-4 rounded-lg border ${cfg.bg} ${cfg.border}`}
            >
              <div className={`flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">{fmtEventDate(event.event_date)}</p>
                </div>
                {event.description && (
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{event.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  {event.protocol_number && <span>Protocolo: {event.protocol_number}</span>}
                  {event.sequence && <span>Seq.: {event.sequence}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}