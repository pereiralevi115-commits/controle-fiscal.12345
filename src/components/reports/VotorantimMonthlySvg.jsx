import React from "react";

const brl = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function VotorantimMonthlySvg({ svgRef, monthLabel, rows, totals }) {
  const totalNotas = totals.vendaNotas + totals.bonNotas;
  const totalValor = totals.vendaValor + totals.bonValor;
  const rowHeight = 43;
  const tableStartY = 450;
  const footerY = tableStartY + Math.max(rows.length, 1) * rowHeight + 18;
  const height = Math.max(1000, footerY + 120);
  const vendaCfops = [...new Set(rows.flatMap((row) => row.cfopVenda.split(", ").filter((cfop) => cfop && cfop !== "-")))].join(", ") || "-";
  const bonCfops = [...new Set(rows.flatMap((row) => row.cfopBon.split(", ").filter((cfop) => cfop && cfop !== "-")))].join(", ") || "-";
  const badgeText = totals.bonNotas === 0 ? "100% venda no mês" : `${totals.bonNotas} bonificação${totals.bonNotas === 1 ? "" : "s"}`;
  const noteText = totals.bonNotas === 0
    ? `Resultado: em ${monthLabel} não há bonificação para estes fornecedores; todas as notas foram classificadas como venda.`
    : `Resultado: em ${monthLabel} há vendas e bonificações classificadas separadamente por CFOP.`;

  return (
    <svg ref={svgRef} width="1600" height={height} viewBox={`0 0 1600 ${height}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Relatório Votorantim ${monthLabel}`}>
      <rect width="1600" height={height} fill="#f8fafc" />
      <rect x="40" y="36" width="1520" height={height - 72} rx="28" fill="#ffffff" stroke="#e2e8f0" />
      <text x="80" y="94" fill="#b45309" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800" letterSpacing="1.5">CONTROLE FISCAL • MATÉRIA PRIMA</text>
      <text x="80" y="140" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="38" fontWeight="800">Votorantim Cimentos S/A — {monthLabel}</text>
      <text x="80" y="176" fill="#475569" fontFamily="Arial, sans-serif" fontSize="20">Separação por unidade entre venda e bonificação dos CNPJs 01.637.895/0106-00 e 01.637.895/0185-03.</text>
      <rect x="1250" y="80" width="250" height="46" rx="23" fill={totals.bonNotas === 0 ? "#dcfce7" : "#fef3c7"} stroke={totals.bonNotas === 0 ? "#86efac" : "#f59e0b"} />
      <text x="1375" y="110" textAnchor="middle" fill={totals.bonNotas === 0 ? "#166534" : "#78350f"} fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800">{badgeText}</text>

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

      <rect x="80" y="360" width="1420" height={footerY - 360 + 56} rx="18" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="80" y="360" width="1420" height="54" rx="18" fill="#f1f5f9" />
      {['Unidade','Venda','Valor venda','Bonif.','Valor bonif.','Total notas','Total valor','CFOP venda','CFOP bonif.'].map((h, i) => (
        <text key={h} x={[106, 415, 535, 750, 865, 1080, 1200, 1360, 1480][i]} y="394" fill="#334155" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="800" textAnchor={i === 0 ? 'start' : 'middle'}>{h}</text>
      ))}
      {rows.length === 0 ? (
        <text x="790" y="470" textAnchor="middle" fill="#64748b" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="800">Nenhuma nota encontrada para este mês.</text>
      ) : rows.map((row, index) => {
        const y = tableStartY + index * rowHeight;
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
      <rect x="80" y={footerY} width="1420" height="56" fill="#fef3c7" />
      <text x="106" y={footerY + 36} fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">TOTAL</text>
      <text x="415" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{totals.vendaNotas}</text>
      <text x="535" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{brl(totals.vendaValor)}</text>
      <text x="750" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{totals.bonNotas}</text>
      <text x="865" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{brl(totals.bonValor)}</text>
      <text x="1080" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{totalNotas}</text>
      <text x="1200" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{brl(totalValor)}</text>
      <text x="1360" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{vendaCfops}</text>
      <text x="1480" y={footerY + 36} textAnchor="middle" fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900">{bonCfops}</text>
      <rect x="80" y={footerY + 78} width="1420" height="1" fill="#e2e8f0" />
      <text x="80" y={footerY + 104} fill="#78350f" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800">{noteText}</text>
    </svg>
  );
}