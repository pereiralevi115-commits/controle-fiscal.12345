import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { FileText, AlertCircle, CheckCircle2, DollarSign, ArrowRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboard/StatCard";
import InvoiceStatusBadge from "@/components/invoices/InvoiceStatusBadge";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function Dashboard() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const pendentes = invoices.filter((i) => i.status === "pendente");
  const recebidas = invoices.filter((i) => i.status === "recebida");
  const totalPendente = pendentes.reduce((sum, i) => sum + (i.total_value || 0), 0);
  const recentPendentes = pendentes.slice(0, 5);

  const getBranchName = (cnpj) => branches.find((b) => b.cnpj === cnpj)?.name || "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral das notas fiscais</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Notas"
          value={invoices.length}
          icon={FileText}
          subtitle="Notas fiscais importadas"
        />
        <StatCard
          title="Pendentes"
          value={pendentes.length}
          icon={AlertCircle}
          color="bg-amber-500"
          subtitle="Aguardando recebimento"
        />
        <StatCard
          title="Recebidas"
          value={recebidas.length}
          icon={CheckCircle2}
          color="bg-emerald-500"
          subtitle="Notas já recebidas"
        />
        <StatCard
          title="Valor Pendente"
          value={formatCurrency(totalPendente)}
          icon={DollarSign}
          color="bg-primary"
          subtitle="Valor total das pendentes"
        />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-lg">Últimas Notas Pendentes</h2>
          </div>
          <Link to="/notas">
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        {recentPendentes.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
            <p className="font-medium">Nenhuma nota pendente!</p>
            <p className="text-sm mt-1">Todas as notas foram recebidas</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentPendentes.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invoice.supplier_name}</p>
                  <p className="text-sm text-muted-foreground">
                    NF #{invoice.number} • {getBranchName(invoice.branch_cnpj)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold">{formatCurrency(invoice.total_value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.issue_date
                      ? format(new Date(invoice.issue_date), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}