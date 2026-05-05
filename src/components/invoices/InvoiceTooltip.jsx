import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCNPJ } from "@/lib/formatters";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function InvoiceTooltip({ invoice, children }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="w-80 p-4 bg-card border border-border rounded-lg">
          <div className="space-y-3 text-sm">
            {/* Fornecedor */}
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Fornecedor</p>
              <p className="font-medium">{invoice.supplier_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{formatCNPJ(invoice.supplier_cnpj)}</p>
            </div>

            {/* NF e Série */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">NF</p>
                <p className="font-medium">{invoice.number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Série</p>
                <p className="font-medium">{invoice.series || "—"}</p>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Emissão</p>
                <p className="font-medium text-xs">{invoice.issue_date || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Vencimento</p>
                <p className="font-medium text-xs">{invoice.due_date || "—"}</p>
              </div>
            </div>

            {/* Valor */}
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Valor Total</p>
              <p className="font-bold text-base">{formatCurrency(invoice.total_value)}</p>
            </div>

            {/* Produtos */}
            {invoice.items && invoice.items.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Produtos ({invoice.items.length})</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {invoice.items.map((item, idx) => (
                    <p key={idx} className="text-xs">{item.description}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Informações Adicionais */}
            {invoice.additional_info && (
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Informações Adicionais</p>
                <p className="text-xs line-clamp-3">{invoice.additional_info}</p>
              </div>
            )}

            {/* Impostos */}
            {(invoice.tax_icms || invoice.tax_ipi || invoice.tax_pis) && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Impostos</p>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {invoice.tax_icms > 0 && <p>ICMS: {formatCurrency(invoice.tax_icms)}</p>}
                  {invoice.tax_ipi > 0 && <p>IPI: {formatCurrency(invoice.tax_ipi)}</p>}
                  {invoice.tax_pis > 0 && <p>PIS: {formatCurrency(invoice.tax_pis)}</p>}
                </div>
              </div>
            )}

            {/* Chave de Acesso */}
            {invoice.access_key && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Chave de Acesso</p>
                <p className="text-xs font-mono break-all">{invoice.access_key}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}