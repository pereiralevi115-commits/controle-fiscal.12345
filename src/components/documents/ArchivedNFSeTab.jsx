import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Calendar, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import NFSeDetailDialog from "@/components/invoices/NFSeDetailDialog";
import { formatCNPJ } from "@/lib/formatters";

const formatCurrency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/**
 * Aba "NFS-e" das telas Arquivadas/Canceladas. Recebe as NFS-e já filtradas
 * pela regra da tela (arquivadas ou canceladas) e aplica busca + filtro de mês.
 */
export default function ArchivedNFSeTab({ documents, branches = [], onUndo, undoPending, showCancellation }) {
  const [search, setSearch] = useState("");
  const [monthYear, setMonthYear] = useState("all");
  const [selected, setSelected] = useState(null);

  const branchMap = useMemo(() => {
    const m = {};
    branches.forEach((b) => { m[b.cnpj] = b.name; });
    return m;
  }, [branches]);

  const availableMonths = useMemo(() => {
    const set = new Set();
    documents.forEach((inv) => {
      if (inv.issue_date) {
        const d = new Date(inv.issue_date + "T12:00:00");
        set.add(`${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [documents]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (monthYear !== "all") {
        if (!doc.issue_date) return false;
        const d = new Date(doc.issue_date + "T12:00:00");
        if (`${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}` !== monthYear) return false;
      }
      if (term) {
        return (
          doc.supplier_name?.toLowerCase().includes(term) ||
          doc.number?.includes(term) ||
          (branchMap[doc.branch_cnpj] || "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [documents, search, monthYear, branchMap]);

  return (
    <div className="space-y-6">
      <p className="text-slate-500">
        {filtered.length} nota{filtered.length !== 1 ? "s" : ""} de serviço
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por fornecedor, número ou filial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={monthYear} onValueChange={setMonthYear}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Mês/Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {availableMonths.map((my) => {
              const [m, y] = my.split("-");
              return <SelectItem key={my} value={my}>{MONTH_NAMES[parseInt(m, 10) - 1]} {y}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma NFS-e encontrada</p>
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
                  {showCancellation && <TableHead className="font-semibold">Cancelamento</TableHead>}
                  <TableHead className="font-semibold">Descrição / Observações</TableHead>
                  <TableHead className="font-semibold text-right">Valor</TableHead>
                  <TableHead className="font-semibold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id} className={doc.cancelled ? "bg-red-50/40" : ""}>
                    <TableCell className="font-medium">{branchMap[doc.branch_cnpj] || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div>{doc.supplier_name}</div>
                      <div className="text-xs text-muted-foreground">{formatCNPJ(doc.supplier_cnpj)}</div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {doc.series ? `${doc.series}/${doc.number}` : doc.number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.issue_date
                        ? format(new Date(doc.issue_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    {showCancellation && (
                      <TableCell className="text-sm text-red-600 font-medium">
                        {doc.cancellation_date
                          ? format(new Date(doc.cancellation_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-slate-600 max-w-md">
                      <span className="line-clamp-2 whitespace-pre-wrap">{doc.service_description || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(doc.total_value)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onUndo && (
                          <button
                            onClick={() => onUndo(doc.id)}
                            disabled={undoPending}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 hover:bg-blue-50 rounded px-2 py-1 transition-all"
                          >
                            Desfazer
                          </button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NFSeDetailDialog
        invoice={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        branches={branches}
      />
    </div>
  );
}