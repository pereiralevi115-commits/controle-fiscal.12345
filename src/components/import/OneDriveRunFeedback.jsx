import React from "react";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";

const STEPS = [
  "Conectando às pastas",
  "Procurando XMLs pendentes",
  "Baixando e lendo arquivos",
  "Atualizando notas e auditoria",
];

export default function OneDriveRunFeedback({ feedback }) {
  if (!feedback) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-3 ${feedback.error ? "bg-red-50 border-red-200" : feedback.done ? "bg-green-50 border-green-200" : "bg-indigo-50 border-indigo-200"}`}>
      <div className="flex items-start gap-2">
        {feedback.error ? (
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
        ) : feedback.done ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
        ) : (
          <Loader2 className="w-4 h-4 text-indigo-600 mt-0.5 animate-spin" />
        )}
        <div>
          <p className={`text-sm font-semibold ${feedback.error ? "text-red-800" : feedback.done ? "text-green-800" : "text-indigo-800"}`}>{feedback.title}</p>
          <p className="text-xs text-slate-600 mt-0.5">{feedback.detail}</p>
        </div>
      </div>

      {!feedback.error && (
        <div className="grid sm:grid-cols-4 gap-2">
          {STEPS.map((step, index) => {
            const completed = feedback.done || index < feedback.currentStep;
            const running = !feedback.done && index === feedback.currentStep;
            return (
              <div key={step} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] ${completed ? "bg-white text-green-700" : running ? "bg-white text-indigo-700" : "bg-white/60 text-slate-400"}`}>
                {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Circle className="w-3.5 h-3.5" />}
                <span className="leading-tight">{step}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}