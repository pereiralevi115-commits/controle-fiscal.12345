import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Ban, FileWarning, FileCheck, Loader2, Inbox } from "lucide-react";

const formatEventDate = (date) => {
  if (!date) return "—";
  const parsed = date.length <= 10 ? new Date(date + "T12:00:00") : new Date(date);
  if (isNaN(parsed.getTime())) return date;
  return format(parsed, "dd/MM/yyyy", { locale: ptBR });
};

export default function PendingEventsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["pending-fiscal-events"],
    queryFn: () => base44.entities.PendingFiscalEvent.filter({ status: "pendente" }, "-event_date"),
    enabled: open,
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, eventId }) =>
      base44.functions.invoke("manageFiscalEvents", { action, eventId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-fiscal-events"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(variables.action === "approve" ? "Evento aprovado e aplicado à nota." : "Evento rejeitado.");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Erro ao processar o evento.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eventos fiscais para aprovar</DialogTitle>
          <DialogDescription>
            Cancelamentos são aplicados automaticamente. Os demais eventos (carta de correção,
            manifestação, etc.) aguardam sua análise antes de serem aplicados à nota.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-slate-500">
            <Inbox className="w-10 h-10 mb-3 text-slate-300" />
            <p className="font-medium">Nenhum evento pendente</p>
            <p className="text-sm">Todos os eventos foram analisados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const isPending = actionMutation.isPending && actionMutation.variables?.eventId === ev.id;
              const Icon = ev.is_cancellation ? Ban : ev.event_type === "110110" ? FileWarning : FileCheck;
              return (
                <div key={ev.id} className="border rounded-xl p-4 flex items-start gap-3">
                  <div className={`mt-0.5 ${ev.is_cancellation ? "text-red-600" : "text-slate-500"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm ${ev.is_cancellation ? "text-red-700" : "text-slate-800"}`}>
                        {ev.event_label}
                      </p>
                      <span className="text-xs text-muted-foreground">{formatEventDate(ev.event_date)}</span>
                      {ev.document_exists ? (
                        <Badge variant="secondary" className="text-xs">
                          NF #{ev.document_number || "?"}{ev.supplier_name ? ` · ${ev.supplier_name}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">
                          Nota ainda não importada
                        </Badge>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap break-words">{ev.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1 break-all">Chave: {ev.access_key}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={isPending || !ev.document_exists}
                      onClick={() => actionMutation.mutate({ action: "approve", eventId: ev.id })}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      title={!ev.document_exists ? "Importe a nota antes de aprovar" : "Aprovar e aplicar à nota"}
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => actionMutation.mutate({ action: "reject", eventId: ev.id })}
                      className="gap-1 text-slate-600 hover:text-red-600 hover:border-red-300"
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}