import React, { useMemo, useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const rows = [
  { unidade: "ARARANGUÁ", vendaNotas: 5, vendaValor: 125096.4, bonNotas: 0, bonValor: 0, cfopVenda: "5101", cfopBon: "-" },
  { unidade: "BRAÇO DO NORTE", vendaNotas: 12, vendaValor: 291298.15, bonNotas: 0, bonValor: 0, cfopVenda: "5101", cfopBon: "-" },
  { unidade: "CAPIVARI DE BAIXO", vendaNotas: 21, vendaValor: 501906.1, bonNotas: 0, bonValor: 0, cfopVenda: "5101", cfopBon: "-" },
  { unidade: "CRICIÚMA", vendaNotas: 25, vendaValor: 631323.55, bonNotas: 0, bonValor: 0, cfopVenda: "5101", cfopBon: "-" },
  { unidade: "LAGES", vendaNotas: 22, vendaValor: 531534.68, bonNotas: 0, bonValor: 0, cfopVenda: "6107", cfopBon: "-" },
  { unidade: "MAQUINÉ", vendaNotas: 41, vendaValor: 1152189.19, bonNotas: 0, bonValor: 0, cfopVenda: "6107", cfopBon: "-" },
  { unidade: "ORLEANS", vendaNotas: 8, vendaValor: 208274.55, bonNotas: 0, bonValor: 0, cfopVenda: "5101", cfopBon: "-" },
  { unidade: "PASSO DE TORRES", vendaNotas: 6, vendaValor: 172535.47, bonNotas: 0, bonValor: 0, cfopVenda: "5101", cfopBon: "-" },
  { unidade: "SANTO ANTÔNIO DA PATRULHA", vendaNotas: 2, vendaValor: 48414.64, bonNotas: 0, bonValor: 0, cfopVenda: "6107", cfopBon: "-" },
  { unidade: "VILA FLORES", vendaNotas: 7, vendaValor: 188135.4, bonNotas: 0, bonValor: 0, cfopVenda: "6107", cfopBon: "-" },
];

const brl = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RelatorioVotorantimAgosto() {
  const svgRef = useRef(null);
  const totals = useMemo(() => rows.reduce((acc, row) => ({
    vendaNotas: acc.vendaNotas + row.vendaNotas,
    vendaValor: acc.vendaValor + row.vendaValor,
    bonNotas: acc.bonNotas + row.bonNotas,
    bonValor: acc.bonValor + row.bonValor,
  }), { vendaNotas: 0, vendaValor: 0, bonNotas: 0, bonValor: 0 }), []);

  const totalNotas = totals.vendaNotas + totals.bonNotas;
  const totalValor = totals.vendaValor + totals.bonValor;

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-votorantim-agosto-2026.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "relatorio-votorantim-agosto-2026.png";
      link.click();
    };
    image.src = url;
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3" data-print-hidden="true">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Imagem do relatório — Agosto/2026</h1>
            <p className="text-slate-600">Votorantim Cimentos S/A: venda x bonificação por unidade.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadPng} className="gap-2"><Download className="w-4 h-4" />Baixar PNG</Button>
            <Button onClick={downloadSvg} variant="outline" className="gap-2"><Download className="w-4 h-4" />Baixar SVG</Button>
          </div>
        </div>

        <div className="overflow-auto rounded-2xl shadow-xl bg-white p-2">
          <svg ref={svgRef} width="1600" height="1000" viewBox="0 0 1600 1000" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Relatório Votorantim Agosto 2026">
            <rect width="1600" height="1000" fill="#f8fafc" />
            <rect x="40" y="36" width="1520" height="928" rx="28" fill="#ffffff" stroke="#e2e8f0" />
            <text x="80" y="94" fill="#b45309" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800" letterSpacing="1.5">CONTROLE FISCAL • MATÉRIA PRIMA</text>
            <text x="80" y="140" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="800">Votorantim Cimentos S/A — Agosto/2026</text>
            <text x="80" y="176" fill="#475569" fontFamily="Arial, sans-serif" fontSize="20">Separação por unidade entre venda e bonificação dos CNPJs 01.637.895/0106-00 e 01.637.895/0185-03.</text>
            <rect x="1250" y="80" width="250" height="46" rx="23" fill="#dcfce7" stroke="#86efac" />
            <text x="1375" y="110" textAnchor="middle" fill="#166534" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800">100% venda em agosto</text>

            <rect x="80" y="215" width="440" height="105" rx="20" fill="#0f172a" />
            <text x="112" y="254" fill="#cbd5e1" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">NOTAS DE VENDA</text>
            <text x="112" y="296" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="42" fontWeight="800">{totals.vendaNotas}</text>
            <text x="235" y="294" fill="#fbbf24" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800">{brl(totals.vendaValor)}</text>
            <rect x="580" y="215" width="440" height="105" rx="20" fill="#0f172a" />
            <text x="612" y="254" fill="#cbd5e1" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">NOTAS DE BONIFICAÇÃO</text>
            <text x="612" y="296" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="42" fontWeight="800">{totals.bonNotas}</text>
            <text x="735" y="294" fill="#fbbf24" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800">{brl(totals.bonValor)}</text>
            <rect x="1080" y="215" width="420" height="105" rx="20" fill="#0f172a" />
            <text x="1112" y="254" fill="#cbd5e1" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">TOTAL GERAL</text>
            <text x="1112" y="296" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="42" fontWeight="800">{totalNotas}</text>
            <text x="1235" y="294" fill="#fbbf24" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="800">{brl(totalValor)}</text>

            <rect x="80" y="360" width="1420" height="540" rx="18" fill="#ffffff" stroke="#cbd5e1" />
            <rect x="80" y="360" width="1420" height="54" rx="18" fill="#f1f5f9" />
            {['Unidade','Venda','Valor venda','Bonif.','Valor bonif.','Total notas','Total valor','CFOP venda','CFOP bonif.'].map((h, i) => (
              <text key={h} x={[106, 415, 535, 750, 865, 1080, 1200, 1360, 1480][i]} y="394" fill="#334155" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" textAnchor={i === 0 ? 'start' : 'middle'}>{h}</text>
            ))}
            {rows.map((row, index) => {
              const y = 450 + index * 43;
              return (
                <g key={row.unidade}>
                  <line x1="80" y1={y - 24} x2="1500" y2={y - 24} stroke="#e2e8f0" />
                  <text x="106" y={y} fill="#1f2937" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{row.unidade}</text>
                  <text x="415" y={y} textAnchor="middle" fill="#1f2937" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{row.vendaNotas}</text>
                  <text x="535" y={y} textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{brl(row.vendaValor)}</text>
                  <text x="750" y={y} textAnchor="middle" fill="#1f2937" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{row.bonNotas}</text>
                  <text x="865" y={y} textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{brl(row.bonValor)}</text>
                  <text x="1080" y={y} textAnchor="middle" fill="#1f2937" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{row.vendaNotas + row.bonNotas}</text>
                  <text x="1200" y={y} textAnchor="middle" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{brl(row.vendaValor + row.bonValor)}</text>
                  <text x="1360" y={y} textAnchor="middle" fill="#1f2937" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{row.cfopVenda}</text>
                  <text x="1480" y={y} textAnchor="middle" fill="#1f2937" fontFamily="Arial, sans-serif" fontSize="17" fontWeight="700">{row.cfopBon}</text>
                </g>
              );
            })}
            <rect x="80" y="844" width="1420" height="56" fill="#fef3c7" />
            <text x="106" y="880" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">TOTAL</text>
            <text x="415" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{totals.vendaNotas}</text>
            <text x="535" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{brl(totals.vendaValor)}</text>
            <text x="750" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{totals.bonNotas}</text>
            <text x="865" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{brl(totals.bonValor)}</text>
            <text x="1080" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{totalNotas}</text>
            <text x="1200" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{brl(totalValor)}</text>
            <text x="1360" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">5101, 6107</text>
            <text x="1480" y="880" textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">-</text>
            <rect x="80" y="922" width="1420" height="1" fill="#e2e8f0" />
            <text x="80" y="946" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800">Resultado: em agosto/2026 não há bonificação para estes fornecedores; todas as notas foram classificadas como venda.</text>
          </svg>
        </div>
      </div>
    </div>
  );
}