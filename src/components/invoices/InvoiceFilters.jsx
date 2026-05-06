import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function InvoiceFilters({ filters, onFilterChange, branches, showCancelledFilter }) {
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
          {branches.map((branch) => (
            <SelectItem key={branch.cnpj} value={branch.cnpj}>
              {branch.name}
            </SelectItem>
          ))}
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