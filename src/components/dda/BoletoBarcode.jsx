import React from "react";
import { barcodeBars } from "@/lib/boletoUtils";

export default function BoletoBarcode({ code }) {
  const encoded = barcodeBars(code);
  if (!encoded?.bars?.length) return null;
  return (
    <svg viewBox={`0 0 ${encoded.width} 42`} className="w-full h-12 bg-white rounded border border-slate-100" preserveAspectRatio="none" aria-label="Código de barras">
      {encoded.bars.map((bar, index) => (
        <rect key={index} x={bar.x} y="6" width={bar.width} height="30" fill="#0f172a" />
      ))}
    </svg>
  );
}