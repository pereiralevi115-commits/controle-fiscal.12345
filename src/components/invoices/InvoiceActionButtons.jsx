import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function InvoiceActionButtons({ invoiceId }) {
  const [selected, setSelected] = useState(null);

  const buttons = [
    { id: "SIGV", label: "SIGV", borderColor: "border-emerald-500", textColor: "text-emerald-600", bgColor: "bg-emerald-50" },
    { id: "TOPCON", label: "TOPCON", borderColor: "border-violet-500", textColor: "text-violet-600", bgColor: "bg-violet-50" },
    { id: "BOLETO", label: "BOLETO", borderColor: "border-amber-500", textColor: "text-amber-600", bgColor: "bg-amber-50" }
  ];

  return (
    <div className="flex items-center justify-end gap-2">
      {buttons.map((btn) => (
        <Button
          key={btn.id}
          variant="outline"
          size="sm"
          onClick={() => setSelected(selected === btn.id ? null : btn.id)}
          className={`h-7 px-3 text-xs font-medium transition-all ${btn.borderColor} ${
            selected === btn.id
              ? `${btn.bgColor} ${btn.textColor} border-2`
              : `${btn.textColor} hover:${btn.bgColor}`
          }`}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}