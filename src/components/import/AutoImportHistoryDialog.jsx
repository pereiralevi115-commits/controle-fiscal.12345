import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox, FileText, Truck, ReceiptText } from "lucide-react";

const DOC_META = {
  nfe: { label: "NF-e", Icon: FileText, color: "text-blue-600" },
  cte: { label: "CT-e", Icon: Truck, color: "text-violet-600" },
  nfse: { label: "NFS-e", Icon: ReceiptText, color: "text-emerald-600" },
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) return "—";
  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

const formatCurrency = (value) =>
  (value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AutoImportHistoryDialog({ open, onOpenChange }) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["auto-import-history"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 100),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de notas importadas</DialogTitle>
          <DialogDescription>
            As 100 notas fiscais mais recentes que entraram no sistema, ordenadas da mais
            recente para a mais antiga.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-slate-500">
            <Inbox className="w-10 h-10 mb-3 text-slate-300" />
            <p className="font-medium">Nenhuma nota importada ainda</p>
            <p className="text-sm">Assim que o sincronizador importar notas, elas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const meta = DOC_META[inv.document_type] || DOC_META.nfe;
              const Icon = meta.Icon;
              return (
                <div key={inv.id} className="border rounded-xl p-3 flex items-start gap-3">
                  <div className={`mt-0.5 ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{meta.label}</Badge>
                      <p className="font-semibold text-sm text-slate-800">#{inv.number || "?"}</p>
                      {inv.cancelled && (
                        <Badge variant="outline" className="text-xs text-red-700 border-red-300 bg-red-50">
                          Cancelada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 truncate">{inv.supplier_name || "—"}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Importada em {formatDateTime(inv.created_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-slate-800">{formatCurrency(inv.total_value)}</p>
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