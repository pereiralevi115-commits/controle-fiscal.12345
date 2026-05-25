import React, { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Arquivadas from "./Arquivadas";
import Canceladas from "./Canceladas";
import Suppliers from "./Suppliers";
import Branches from "./Branches";
import UsersPage from "./Users";

const tabs = [
  { key: "arquivadas",   label: "Arquivadas" },
  { key: "canceladas",   label: "Canceladas" },
  { key: "fornecedores", label: "Fornecedores" },
  { key: "filiais",      label: "Filiais" },
  { key: "usuarios",     label: "Usuários" },
];

export default function NotasParaVerificar() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-indigo-500" />
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Gerencial</h1>
        </div>

        <Tabs defaultValue="arquivadas">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            {tabs.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="arquivadas" className="mt-4">
            <Arquivadas embedded />
          </TabsContent>
          <TabsContent value="canceladas" className="mt-4">
            <Canceladas embedded />
          </TabsContent>
          <TabsContent value="fornecedores" className="mt-4">
            <Suppliers embedded />
          </TabsContent>
          <TabsContent value="filiais" className="mt-4">
            <Branches embedded />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-4">
            <UsersPage embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}