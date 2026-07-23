import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/boletoUtils";

const today = () => new Date().toISOString().slice(0, 10);

export default function DdaPaymentDialog({ boleto, open, onClose, onConfirm, loading }) {
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentValue, setPaymentValue] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!boleto) return;
    setPaymentDate(today());
    setPaymentValue(boleto.charged_value || boleto.document_value || 0);
    setNotes("");
  }, [boleto]);

  if (!boleto) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pagamento do boleto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-800">{boleto.document_number || "Boleto sem número"}</p>
            <p className="text-slate-600">{boleto.beneficiary_name}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div><span className="font-semibold">Vencimento:</span><br />{formatDate(boleto.due_date)}</div>
              <div><span className="font-semibold">Valor:</span><br />{formatCurrency(boleto.charged_value)}</div>
              <div className="col-span-2"><span className="font-semibold">Pagador:</span><br />{boleto.payer_name}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Data do pagamento
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FDB913]" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Valor pago
              <input type="number" step="0.01" value={paymentValue} onChange={(e) => setPaymentValue(Number(e.target.value))} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FDB913]" />
            </label>
          </div>
          <label className="space-y-1 text-sm font-medium text-slate-700 block">
            Observação
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FDB913]" />
          </label>
          <p className="text-xs text-slate-500">Ao confirmar, o boleto será movido para Boletos Arquivados e ficará registrado quem executou o pagamento.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={() => onConfirm(boleto, { paymentDate, paymentValue, notes })} disabled={loading || !paymentDate}> {loading ? "Registrando..." : "Confirmar pagamento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}