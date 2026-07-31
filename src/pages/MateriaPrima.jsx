import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CategoryInvoiceTab from "@/components/documents/CategoryInvoiceTab";
import MateriaPrimaReport from "@/components/reports/MateriaPrimaReport";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";

export default function MateriaPrima() {
  const [showReport, setShowReport] = useState(false);
  const [currentItems, setCurrentItems] = useState([]);
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Matéria Prima</h1>
          </div>
          <Button onClick={() => setShowReport(true)} className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Gerar Relatório
          </Button>
        </div>

        <CategoryInvoiceTab documentType="nfe" supplierFlag="materia_prima" branches={branches} onItemsChange={setCurrentItems} />

        <MateriaPrimaReport
          open={showReport}
          onClose={() => setShowReport(false)}
          invoices={currentItems}
          branches={branches}
        />
      </div>
    </div>
  );
}