import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, Printer } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import DdaTable from "@/components/dda/DdaTable";

export default function BoletosArquivados() {
  const { data: boletos = [], isLoading } = useQuery({
    queryKey: ["boletosDdaArchived"],
    queryFn: async () => {
      const rows = await base44.entities.BoletoDDA.filter({ paid: true }, "-paid_at", 500);
      return rows.filter((boleto) => boleto.paid || boleto.paid_at);
    },
  });

  return (
    <div data-print-area="boletos-dda-report" className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center">
              <Archive className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Boletos Arquivados</h1>
              <p className="text-slate-500 mt-0.5">Boletos DDA pagos, com data, valor e responsável pelo pagamento.</p>
            </div>
          </div>
          <Button data-print-hidden="true" variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="w-4 h-4" />
            Imprimir relatório
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <DdaTable boletos={boletos} archived />
        )}
      </div>
    </div>
  );
}