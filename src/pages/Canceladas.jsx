import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { XCircle } from "lucide-react";
import CancelledInvoiceTab from "@/components/documents/CancelledInvoiceTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Canceladas({ embedded } = {}) {
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"}>
      <div className={embedded ? "space-y-4" : "max-w-full mx-auto p-4 md:p-8 space-y-6"}>
        {!embedded && (
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              Canceladas
            </h1>
            <p className="text-slate-500 mt-1">Notas fiscais canceladas</p>
          </div>
        )}

        <Tabs defaultValue="nfe" className="space-y-6">
          <TabsList>
            <TabsTrigger value="nfe">NF-e</TabsTrigger>
            <TabsTrigger value="nfse">NFS-e</TabsTrigger>
          </TabsList>
          <TabsContent value="nfe" className="mt-0">
            <CancelledInvoiceTab documentType="nfe" branches={branches} />
          </TabsContent>
          <TabsContent value="nfse" className="mt-0">
            <CancelledInvoiceTab documentType="nfse" branches={branches} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}