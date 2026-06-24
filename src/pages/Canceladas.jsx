import React, { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { XCircle, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { useInvoices } from "@/hooks/useInvoices";
import ArchivedNFSeTab from "@/components/documents/ArchivedNFSeTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Canceladas({ embedded } = {}) {
  const { allowedCnpjs, isLoading: branchFilterLoading } = useBranchFilter();
  const [search, setSearch] = useState("");
  const [monthYear, setMonthYear] = useState("all");
  const queryClient = useQueryClient();

  const undoMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.update(id, { cancelled: false, cancellation_date: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Cancelamento desfeito!");
    },
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices(["nfe", "nfse"]);

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const branchMap = useMemo(() => {
    const m = {};
    branches.forEach(b => { m[b.cnpj] = b.name; });
    return m;
  }, [branches]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    invoices.forEach(inv => {
      if (inv.cancelled && inv.issue_date) {
        const d = new Date(inv.issue_date + "T12:00:00");
        set.add(`${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [invoices]);

  const cancelledAll = useMemo(() => {
    return invoices.filter(inv => {
      if (!inv.cancelled) return false;
      if (allowedCnpjs && !allowedCnpjs.includes(inv.branch_cnpj)) return false;
      if (monthYear !== "all") {
        if (!inv.issue_date) return false;
        const d = new Date(inv.issue_date + "T12:00:00");
        if (`${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}` !== monthYear) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        return (
          inv.supplier_name?.toLowerCase().includes(s) ||
          inv.number?.includes(s) ||
          (branchMap[inv.branch_cnpj] || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [invoices, allowedCnpjs, search, branchMap, monthYear]);

  const filtered = useMemo(
    () => cancelledAll.filter(inv => (inv.document_type || "nfe") === "nfe"),
    [cancelledAll]
  );
  const nfseCanceladas = useMemo(
    () => invoices.filter(inv => inv.cancelled && inv.document_type === "nfse" && (!allowedCnpjs || allowedCnpjs.includes(inv.branch_cnpj))),
    [invoices, allowedCnpjs]
  );

  const isLoading = loadingInvoices || loadingBranches || branchFilterLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"}>
      <div className={embedded ? "space-y-4" : "max-w-full mx-auto p-4 md:p-8 space-y-6"}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              Canceladas
            </h1>
            <p className="text-slate-500 mt-1">Notas fiscais canceladas</p>
          </div>
        </div>

        <Tabs defaultValue="nfe" className="space-y-6">
          <TabsList>
            <TabsTrigger value="nfe">NF-e</TabsTrigger>
            <TabsTrigger value="nfse">NFS-e</TabsTrigger>
          </TabsList>

          <TabsContent value="nfe" className="space-y-6 mt-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por fornecedor, número ou filial..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={monthYear} onValueChange={setMonthYear}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Mês/Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map(my => {
                const [m, y] = my.split("-");
                return <SelectItem key={my} value={my}>{MONTH_NAMES[parseInt(m, 10) - 1]} {y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <XCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma nota cancelada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Filial</TableHead>
                    <TableHead className="font-semibold">Fornecedor</TableHead>
                    <TableHead className="font-semibold">NF</TableHead>
                    <TableHead className="font-semibold">Emissão</TableHead>
                    <TableHead className="font-semibold">Cancelamento</TableHead>
                    <TableHead className="font-semibold text-right">Valor</TableHead>
                    <TableHead className="font-semibold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(inv => (
                    <TableRow key={inv.id} className="bg-red-50/40">
                      <TableCell className="font-medium">{branchMap[inv.branch_cnpj] || "—"}</TableCell>
                      <TableCell className="text-sm">{inv.supplier_name}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {inv.series ? `${inv.series}/` : ""}{inv.number}
                      </TableCell>
                      <TableCell className="text-sm">
                        {inv.issue_date
                          ? format(new Date(inv.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-red-600 font-medium">
                        {inv.cancellation_date
                          ? format(new Date(inv.cancellation_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(inv.total_value)}</TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => undoMutation.mutate(inv.id)}
                          disabled={undoMutation.isPending}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 hover:bg-blue-50 rounded px-2 py-1 transition-all"
                        >
                          Desfazer
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
          </TabsContent>

          <TabsContent value="nfse" className="mt-0">
            <ArchivedNFSeTab
              documents={nfseCanceladas}
              branches={branches}
              onUndo={(id) => undoMutation.mutate(id)}
              undoPending={undoMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}