import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CategoryInvoiceTab from "@/components/documents/CategoryInvoiceTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Controladoria() {
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Controladoria</h1>

        <Tabs defaultValue="nfe" className="space-y-6">
          <TabsList>
            <TabsTrigger value="nfe">NF-e</TabsTrigger>
            <TabsTrigger value="nfse">NFS-e</TabsTrigger>
          </TabsList>
          <TabsContent value="nfe" className="mt-0">
            <CategoryInvoiceTab documentType="nfe" supplierFlag="controladoria" branches={branches} />
          </TabsContent>
          <TabsContent value="nfse" className="mt-0">
            <CategoryInvoiceTab documentType="nfse" supplierFlag="controladoria" branches={branches} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}