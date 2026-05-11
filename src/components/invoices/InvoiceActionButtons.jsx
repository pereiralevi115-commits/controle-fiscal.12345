import React from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";

export default function InvoiceActionButtons({ invoiceId, invoice }) {
  const { hasPermission, user, userProfile } = useAuth();
  const showOutrasOperacoes = user?.role === 'admin' || userProfile?.name === 'Compras';
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
    { id: "SIGV", label: "SIGV", permission: "toggle_sigv", borderColor: "border-emerald-500", textColor: "text-emerald-600", bgColor: "bg-emerald-50", activeBg: "bg-emerald-600", field: "sigv_recorded" },
    { id: "TOPCON", label: "TOPCON", permission: "toggle_topcon", borderColor: "border-violet-500", textColor: "text-violet-600", bgColor: "bg-violet-50", activeBg: "bg-violet-600", field: "topcon_recorded" },
    { id: "BOLETO", label: "BOLETO", permission: "toggle_boleto", borderColor: "border-amber-500", textColor: "text-amber-600", bgColor: "bg-amber-50", activeBg: "bg-amber-600", field: "boleto_recorded" }
  ];

  return (
    <div className="flex items-center justify-end gap-2">
      {showOutrasOperacoes && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs font-medium border-red-500 text-red-600 hover:bg-red-50"
        >
          OUTRAS OPERAÇÕES
        </Button>
      )}
      {buttons.map((btn) => {
        const canEdit = hasPermission(btn.permission);
        return (
          <Button
            key={btn.id}
            variant="outline"
            size="sm"
            onClick={() => canEdit && handleButtonClick(btn.id)}
            disabled={recordMutation.isPending || !canEdit}
            className={`h-7 px-3 text-xs font-medium transition-all ${btn.borderColor} ${
              invoice[btn.field]
                ? `${btn.activeBg} text-white border-2`
                : `${btn.textColor} hover:${btn.bgColor}`
            } ${!canEdit ? "cursor-not-allowed pointer-events-none" : ""}`}
          >
            {btn.label}
          </Button>
        );
      })}
    </div>
  );
}