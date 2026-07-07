import React from "react";

const CONTROLS = [
  { label: "SIGV", field: "sigv_recorded", prefix: "sigv" },
  { label: "TOPCON", field: "topcon_recorded", prefix: "topcon" },
  { label: "Boleto", field: "boleto_recorded", prefix: "boleto" },
];

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
};

export default function InternalControlsAudit({ invoice }) {
  if (!invoice) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-slate-800 text-white px-6 py-3 font-bold text-sm tracking-wide">
        CONTROLES INTERNOS
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {CONTROLS.map((control) => {
          const active = invoice[control.field];
          const name = invoice[`${control.prefix}_recorded_by_name`];
          const date = invoice[`${control.prefix}_recorded_at`];
          const updatedName = invoice[`${control.prefix}_updated_by_name`];
          const updatedDate = invoice[`${control.prefix}_updated_at`];

          return (
            <div key={control.field} className="py-3 px-6 border-b md:border-r border-border last:border-r-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{control.label}</p>
              <p className="font-medium text-sm">{active ? "Marcado" : "Não marcado"}</p>
              {active && (name || date) ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Marcado por {name || "—"} em {formatDateTime(date)}
                </p>
              ) : updatedName || updatedDate ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Última alteração por {updatedName || "—"} em {formatDateTime(updatedDate)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}