import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, X, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BranchCard from "@/components/dashboard/BranchCard";

export default function Dashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: computed, isLoading } = useQuery({
    queryKey: ["dashboardSummary", startDate, endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke("dashboardSummary", { startDate, endDate });
      return response.data;
    },
    refetchOnMount: "always",
  });

  if (isLoading || !computed) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const {
    rows = [],
    isLider,
    allTotal, allSigv, allTopcon, allBoleto, allValue,
    allScreens, allScreenStats, allArchivedValue, allArchivedNfeValue, allArchivedNfseValue,
    allCancelledNfeCount, allCancelledNfseCount, allCancelledNfeValue, allCancelledNfseValue,
    cteStats, nfseStats, branchBreakdown,
  } = computed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 mt-1">Controle de lançamentos por filial</p>
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data inicial
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data final
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="gap-1 text-slate-500"
              >
                <X className="w-4 h-4" /> Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {!isLider && (
            <BranchCard name="Todas as Filiais" total={allTotal} sigv={allSigv} topcon={allTopcon} boleto={allBoleto} value={allValue} screens={allScreens} screenStats={allScreenStats} archivedValue={allArchivedValue} archivedNfeValue={allArchivedNfeValue} archivedNfseValue={allArchivedNfseValue} cancelledNfeCount={allCancelledNfeCount} cancelledNfseCount={allCancelledNfseCount} cancelledNfeValue={allCancelledNfeValue} cancelledNfseValue={allCancelledNfseValue} cteStats={cteStats} nfseStats={nfseStats} branchBreakdown={branchBreakdown} highlight />
          )}

          {rows.map((row) => (
            <BranchCard key={row.name} name={row.name} total={row.total} sigv={row.sigv} topcon={row.topcon} boleto={row.boleto} value={row.value} screens={row.screens} screenStats={row.screenStats} archivedValue={row.archivedValue} archivedNfeValue={row.archivedNfeValue} archivedNfseValue={row.archivedNfseValue} cancelledNfeCount={row.cancelledNfeCount} cancelledNfseCount={row.cancelledNfseCount} cancelledNfeValue={row.cancelledNfeValue} cancelledNfseValue={row.cancelledNfseValue} cteStats={row.cteStats} nfseStats={row.nfseStats} />
          ))}

          {rows.length === 0 && (
            <div className="bg-white rounded-xl shadow border border-slate-100 py-16 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma nota fiscal importada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}