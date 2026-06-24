import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar } from "lucide-react";

const months = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const getAvailableMonthsAndYears = (invoices) => {
  const monthYears = new Set();
  invoices.forEach((inv) => {
    if (inv.issue_date) {
      const date = new Date(inv.issue_date + "T12:00:00");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      monthYears.add(`${month}-${year}`);
    }
  });
  return Array.from(monthYears).sort().reverse();
};

const BRANCH_ORDER = [
  "ARARANGUA", "ORLEANS", "CAPIVARI DE BAIXO", "CRICIUMA", "PASSO DE TORRES",
  "BRAÇO DO NORTE", "MAQUINE", "TURVO", "CASEIROS", "LAGES",
  "SANTO ANTONIO DA PATRULA", "VILA FLORES"
];

const sortBranches = (branches) => {
  return [...branches].sort((a, b) => {
    const ai = BRANCH_ORDER.findIndex(n => a.name.toUpperCase().includes(n));
    const bi = BRANCH_ORDER.findIndex(n => b.name.toUpperCase().includes(n));
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

export default function InvoiceFilters({ filters, onFilterChange, branches, invoices = [], showCancelledFilter }) {
  const availableMonthsAndYears = getAvailableMonthsAndYears(invoices);

  // Se o mês selecionado não existe mais na lista de notas, volta para "Todos os meses"
  useEffect(() => {
    if (
      filters.monthYear &&
      filters.monthYear !== "all" &&
      invoices.length > 0 &&
      !availableMonthsAndYears.includes(filters.monthYear)
    ) {
      onFilterChange({ ...filters, monthYear: "all" });
    }
  }, [filters.monthYear, availableMonthsAndYears, invoices.length]);

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por fornecedor ou número..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.branch}
        onValueChange={(val) => onFilterChange({ ...filters, branch: val })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filial" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as filiais</SelectItem>
          {sortBranches(branches).map((branch) => (
            <SelectItem key={branch.cnpj} value={branch.cnpj}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.monthYear || "all"}
        onValueChange={(val) => onFilterChange({ ...filters, monthYear: val })}
      >
        <SelectTrigger className="w-[160px]">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Mês/Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os meses</SelectItem>
          {availableMonthsAndYears.map((monthYear) => {
            const [month, year] = monthYear.split("-");
            const monthName = months.find((m) => m.value === month)?.label || "";
            return (
              <SelectItem key={monthYear} value={monthYear}>
                {monthName} {year}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select
        value={filters.sigv || "all"}
        onValueChange={(val) => onFilterChange({ ...filters, sigv: val })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="SIGV" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">SIGV: Todos</SelectItem>
          <SelectItem value="sim">SIGV: Sim</SelectItem>
          <SelectItem value="nao">SIGV: Não</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.topcon || "all"}
        onValueChange={(val) => onFilterChange({ ...filters, topcon: val })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="TOPCON" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">TOPCON: Todos</SelectItem>
          <SelectItem value="sim">TOPCON: Sim</SelectItem>
          <SelectItem value="nao">TOPCON: Não</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.boleto || "all"}
        onValueChange={(val) => onFilterChange({ ...filters, boleto: val })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="BOLETO" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">BOLETO: Todos</SelectItem>
          <SelectItem value="sim">BOLETO: Sim</SelectItem>
          <SelectItem value="nao">BOLETO: Não</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}