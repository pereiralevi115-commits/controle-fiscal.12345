import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, ReceiptText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DdaImportCard from "@/components/dda/DdaImportCard";
import DdaStats from "@/components/dda/DdaStats";
import DdaTable from "@/components/dda/DdaTable";
import DdaLinkDialog from "@/components/dda/DdaLinkDialog";

export default function BoletosDDA() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const { data: boletos = [], isLoading } = useQuery({
    queryKey: ["boletosDda"],
    queryFn: async () => {
      const rows = await base44.entities.BoletoDDA.list("-due_date", 500);
      return rows.filter((boleto) => !boleto.paid && !boleto.paid_at);
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["boletosDda"] });
    queryClient.invalidateQueries({ queryKey: ["boletosDdaArchived"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const linkMutation = useMutation({
    mutationFn: ({ boletoId, invoiceIds }) => base44.functions.invoke("ddaBoletosManager", { action: "linkManual", boleto_id: boletoId, invoice_ids: invoiceIds }),
    onSuccess: () => { setSelected(null); refresh(); },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ boleto, payment }) => {
      const user = await base44.auth.me();
      return base44.entities.BoletoDDA.update(boleto.id, {
        paid: true,
        paid_at: new Date().toISOString(),
        paid_by_id: user.id,
        paid_by_name: user.full_name || user.email || "Usuário",
        payment_date: payment.paymentDate,
        payment_value: payment.paymentValue,
        payment_notes: payment.notes,
      });
    },
    onSuccess: () => {
      refresh();
      toast.success("Pagamento registrado e boleto arquivado.");
    },
  });

  return (
    <div data-print-area="boletos-dda-report" className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FDB913] flex items-center justify-center">
              <ReceiptText className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Boletos DDA</h1>
              <p className="text-slate-500 mt-0.5">Importe relatórios DDA, gere código de barras e vincule com NF-e, NFS-e e CT-e.</p>
            </div>
          </div>
          <Button data-print-hidden="true" variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="w-4 h-4" />
            Imprimir relatório
          </Button>
        </div>

        <DdaImportCard onImported={refresh} />
        <DdaStats boletos={boletos} />
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <DdaTable boletos={boletos} onLink={setSelected} onPay={(boleto, payment) => paymentMutation.mutate({ boleto, payment })} paying={paymentMutation.isPending} />
        )}
        <DdaLinkDialog
          boleto={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          loading={linkMutation.isPending}
          onLink={(boletoId, invoiceIds) => linkMutation.mutate({ boletoId, invoiceIds })}
        />
      </div>
    </div>
  );
}