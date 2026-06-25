import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileWarning, Ban, FileCheck } from "lucide-react";

const SectionHeader = ({ title }) => (
  <div className="bg-slate-800 text-white px-6 py-3 font-bold text-sm tracking-wide">
    {title}
  </div>
);

const formatEventDate = (date) => {
  if (!date) return "—";
  const parsed = date.length <= 10 ? new Date(date + "T12:00:00") : new Date(date);
  if (isNaN(parsed.getTime())) return date;
  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
};

const EVENT_LABELS = {
  "110110": "Carta de Correção",
  "110111": "Cancelamento",
  "110112": "Cancelamento por Substituição",
  "110113": "EPEC",
  "110140": "EPEC",
  "110150": "Pedido de Prorrogação",
  "110160": "Pedido de Prorrogação",
  "110170": "Manifestação do Fisco",
  "210200": "Confirmação da Operação",
  "210210": "Ciência da Operação",
  "210220": "Desconhecimento da Operação",
  "210240": "Operação não Realizada",
  "240130": "Comprovante de Entrega",
  "240140": "Cancelamento do Comprovante de Entrega",
  "610110": "Carta de Correção (CT-e)",
  "610111": "Cancelamento (CT-e)",
  "110180": "Cancelamento (CT-e)",
  "310610": "Comprovante de Entrega (CT-e)",
  "310620": "Cancelamento do Comprovante de Entrega (CT-e)",
};

const getEventLabel = (event) =>
  EVENT_LABELS[event.type] || event.label || (event.type ? `Evento ${event.type}` : "Evento");

const isCancellation = (event) =>
  ["110111", "110112", "110180", "610111"].includes(event.type);

// Remove eventos repetidos (mesmo tipo + data + protocolo), tolerando dados
// antigos que ficaram duplicados no banco.
const dedupeEvents = (events) => {
  const seen = new Set();
  return events.filter((e) => {
    const key = `${e.type || ""}|${e.date || ""}|${e.protocol || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function FiscalEventsSection({ events }) {
  if (!Array.isArray(events) || events.length === 0) return null;

  const uniqueEvents = dedupeEvents(events);

  return (
    <div className="border rounded-lg overflow-hidden">
      <SectionHeader title={`EVENTOS FISCAIS (${uniqueEvents.length})`} />
      <div className="divide-y">
        {uniqueEvents.map((event, idx) => {
          const cancel = isCancellation(event);
          const Icon = cancel ? Ban : event.type === "110110" || event.type === "610110" ? FileWarning : FileCheck;
          return (
            <div key={idx} className="px-6 py-4 flex items-start gap-3">
              <div className={`mt-0.5 ${cancel ? "text-red-600" : "text-slate-500"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-semibold text-sm ${cancel ? "text-red-700" : "text-slate-800"}`}>
                    {getEventLabel(event)}
                  </p>
                  <p className="text-xs text-muted-foreground shrink-0">{formatEventDate(event.date)}</p>
                </div>
                {event.description && (
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{event.description}</p>
                )}
                {event.protocol && (
                  <p className="text-xs text-muted-foreground mt-1">Protocolo: {event.protocol}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}