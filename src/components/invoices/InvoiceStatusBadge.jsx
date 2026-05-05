import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function InvoiceStatusBadge({ status }) {
  const isPendente = status === "pendente";

  return (
    <Badge
      className={cn(
        "text-xs font-medium px-2.5 py-0.5 rounded-full border-0",
        isPendente
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700"
      )}
    >
      {isPendente ? "Pendente" : "Recebida"}
    </Badge>
  );
}