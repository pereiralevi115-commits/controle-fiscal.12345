import React, { useState } from "react";
import { HelpCircle, ChevronDown, FolderSearch, MousePointerClick, Zap } from "lucide-react";

const steps = [
  {
    icon: FolderSearch,
    title: "1. Escolha a pasta",
    text: 'No navegador abaixo, entre nas pastas do seu OneDrive e clique em "Usar esta pasta" quando encontrar a que contém os XMLs.',
  },
  {
    icon: MousePointerClick,
    title: "2. Importe as notas",
    text: 'Clique em "Importar agora" para o sistema ler todos os XMLs da pasta e cadastrar as notas. Notas já importadas são ignoradas (não duplica).',
  },
  {
    icon: Zap,
    title: "3. (Opcional) Ative o automático",
    text: 'Ligando "Ativar automático", o sistema passa a importar sozinho de tempos em tempos, sem você precisar clicar.',
  },
];

export default function OneDriveHelpBox() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
          <HelpCircle className="w-4 h-4" />
          Como funciona o OneDrive compartilhado?
        </span>
        <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-blue-700/80">
            Em vez de enviar XMLs um a um, você conecta uma pasta do OneDrive e o sistema importa
            as notas de lá. A pasta conectada vale para todos os usuários do app.
          </p>
          <div className="space-y-2.5">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex gap-3 rounded-xl bg-white border border-blue-100 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-blue-700/70">
            💡 Em pastas com muitos arquivos, a importação roda em lotes — por isso aparece um
            contador (ex: "10/1475") subindo enquanto processa.
          </p>
        </div>
      )}
    </div>
  );
}