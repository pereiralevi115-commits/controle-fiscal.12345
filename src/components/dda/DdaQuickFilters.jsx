import React from "react";
import { Button } from "@/components/ui/button";

const filters = [
  ["todos", "Todas"],
  ["alta", "Alta confiança"],
  ["fornecedor", "Mesmo fornecedor"],
  ["valor", "Valor compatível"],
  ["vencimento", "Vencimento próximo"],
  ["nfe", "NF-e"],
  ["nfse", "NFS-e"],
  ["cte", "CT-e"],
];

export default function DdaQuickFilters({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(([key, label]) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={value === key ? "default" : "outline"}
          onClick={() => onChange(key)}
          className={value === key ? "bg-slate-900 text-white" : "bg-white"}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}