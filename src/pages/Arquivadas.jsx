import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CategoryInvoiceTab from "@/components/documents/CategoryInvoiceTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Arquivadas({ embedded } = {}) {
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const extraFilters = { archivedMode: "archived", includeAllSuppliers: true, cancelled: "all" };

  const tabs = (
    <Tabs defaultValue="nfe" className="space-y-6">
      <TabsList>
        <TabsTrigger value="nfe">NF-e</TabsTrigger>
        <TabsTrigger value="nfse">NFS-e</TabsTrigger>
      </TabsList>
      <TabsContent value="nfe" className="mt-0">
        <CategoryInvoiceTab documentType="nfe" branches={branches} extraFilters={extraFilters} showCancelledFilter={false} />
      </TabsContent>
      <TabsContent value="nfse" className="mt-0">
        <CategoryInvoiceTab documentType="nfse" branches={branches} extraFilters={extraFilters} showCancelledFilter={false} />
      </TabsContent>
    </Tabs>
  );

  if (embedded) return <div className="space-y-4">{tabs}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Arquivadas</h1>
        {tabs}
      </div>
    </div>
  );
}