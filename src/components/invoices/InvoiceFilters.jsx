import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function InvoiceFilters({ filters, onFilterChange, branches }) {
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
        value={filters.status}
        onValueChange={(val) => onFilterChange({ ...filters, status: val })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pendente">Pendente</SelectItem>
          <SelectItem value="recebida">Recebida</SelectItem>
        </SelectContent>
      </Select>
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
    </div>
  );
}