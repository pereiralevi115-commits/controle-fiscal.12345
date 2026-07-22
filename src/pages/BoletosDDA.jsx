import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DdaImportCard from "@/components/dda/DdaImportCard";
import DdaStats from "@/components/dda/DdaStats";
import DdaTable from "@/components/dda/DdaTable";
import DdaLinkDialog from "@/components/dda/DdaLinkDialog";

export default function BoletosDDA() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const { data: boletos = [], isLoading } = useQuery({
    queryKey: ["boletosDda"],
    queryFn: () => base44.entities.BoletoDDA.list("-due_date", 500),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["boletosDda"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const linkMutation = useMutation({
    mutationFn: ({ boletoId, invoiceId }) => base44.functions.invoke("ddaBoletosManager", { action: "linkManual", boleto_id: boletoId, invoice_id: invoiceId }),
    onSuccess: () => { setSelected(null); refresh(); },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FDB913] flex items-center justify-center">
            <ReceiptText className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Boletos DDA</h1>
            <p className="text-slate-500 mt-0.5">Importe relatórios DDA, gere código de barras e vincule com NF-e, NFS-e e CT-e.</p>
          </div>
        </div>

        <DdaImportCard onImported={refresh} />
        <DdaStats boletos={boletos} />
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <DdaTable boletos={boletos} onLink={setSelected} />
        )}
        <DdaLinkDialog
          boleto={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          loading={linkMutation.isPending}
          onLink={(boletoId, invoiceId) => linkMutation.mutate({ boletoId, invoiceId })}
        />
      </div>
    </div>
  );
}