import React from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function InvoiceActionButtons({ invoiceId, invoice }) {
  const queryClient = useQueryClient();

  const recordMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.update(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const handleButtonClick = (buttonType) => {
    const fieldMap = {
      SIGV: "sigv_recorded",
      TOPCON: "topcon_recorded",
      BOLETO: "boleto_recorded"
    };
    
    const field = fieldMap[buttonType];
    const newValue = !invoice[field];
    
    recordMutation.mutate({ [field]: newValue }, {
      onSuccess: () => {
        toast.success(`${buttonType} ${newValue ? "registrado" : "desregistrado"}!`);
      }
    });
  };

  const buttons = [
    { id: "SIGV", label: "SIGV", borderColor: "border-emerald-500", textColor: "text-emerald-600", bgColor: "bg-emerald-50", field: "sigv_recorded" },
    { id: "TOPCON", label: "TOPCON", borderColor: "border-violet-500", textColor: "text-violet-600", bgColor: "bg-violet-50", field: "topcon_recorded" },
    { id: "BOLETO", label: "BOLETO", borderColor: "border-amber-500", textColor: "text-amber-600", bgColor: "bg-amber-50", field: "boleto_recorded" }
  ];

  return (
    <div className="flex items-center justify-end gap-2">
      {buttons.map((btn) => (
        <Button
          key={btn.id}
          variant="outline"
          size="sm"
          onClick={() => handleButtonClick(btn.id)}
          disabled={recordMutation.isPending}
          className={`h-7 px-3 text-xs font-medium transition-all ${btn.borderColor} ${
            invoice[btn.field]
              ? `bg-emerald-600 text-white border-2 border-emerald-600`
              : `${btn.textColor} hover:${btn.bgColor}`
          }`}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}