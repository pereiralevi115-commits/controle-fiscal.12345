import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import PendingEventsDialog from "@/components/events/PendingEventsDialog";

export default function PendingEventsButton() {
  const [open, setOpen] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["pending-fiscal-events"],
    queryFn: () => base44.entities.PendingFiscalEvent.filter({ status: "pendente" }),
    refetchInterval: 60000,
  });

  const count = events.length;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-amber-400 text-slate-900 font-semibold hover:bg-amber-300 shadow-lg shadow-amber-500/30"
      >
        <BellRing className="w-4 h-4" />
        Eventos para aprovar
        {count > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse">
            {count}
          </span>
        )}
      </Button>
      <PendingEventsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

// Banner de alerta exibido abaixo do cabeçalho quando há eventos aguardando
// aprovação. Garante que o usuário não passe despercebido pela fila de
// cancelamentos/cartas de correção que precisam de decisão manual.
export function PendingEventsBanner() {
  const [open, setOpen] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["pending-fiscal-events"],
    queryFn: () => base44.entities.PendingFiscalEvent.filter({ status: "pendente" }),
    refetchInterval: 60000,
  });

  const count = events.length;
  if (count === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 flex items-center gap-4 hover:bg-amber-100 transition-colors shadow-sm"
      >
        <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
          <BellRing className="w-6 h-6 text-slate-900" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">
            {count} evento{count > 1 ? "s" : ""} aguardando sua aprovação
          </p>
          <p className="text-sm text-amber-700">
            Clique aqui para revisar e decidir se deve lançar cada evento (cancelamentos, cartas de correção, etc.).
          </p>
        </div>
        <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-red-600 text-white text-sm font-bold">
          {count}
        </span>
      </button>
      <PendingEventsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}