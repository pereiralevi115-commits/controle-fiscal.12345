import React from "react";
import { Link2, AlertTriangle, ReceiptText } from "lucide-react";
import { formatCurrency } from "@/lib/boletoUtils";

export default function DdaStats({ boletos }) {
  const linked = boletos.filter((b) => b.status === "vinculado").length;
  const pending = boletos.filter((b) => b.status === "pendente").length;
  const total = boletos.reduce((sum, b) => sum + (b.charged_value || 0), 0);
  const cards = [
    { label: "Boletos", value: boletos.length, icon: ReceiptText, color: "bg-slate-100 text-slate-700" },
    { label: "Vinculados", value: linked, icon: Link2, color: "bg-emerald-100 text-emerald-700" },
    { label: "Pendentes", value: pending, icon: AlertTriangle, color: "bg-amber-100 text-amber-700" },
    { label: "Valor total", value: formatCurrency(total), icon: ReceiptText, color: "bg-blue-100 text-blue-700" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}><Icon className="w-5 h-5" /></div>
            <p className="text-sm text-slate-500 mt-3">{card.label}</p>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}