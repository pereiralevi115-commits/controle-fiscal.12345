import React, { useRef, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (date) =>
  date ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) : "—";

export default function MateriaPrimaReport({ open, onClose, invoices, branches }) {
  const printRef = useRef();

  const branchMap = {};
  branches.forEach((b) => { branchMap[b.cnpj] = b.name; });

  // Organizar por filial e depois por fornecedor + data
  const groupedData = useMemo(() => {
    const byBranch = {};
    
    invoices.forEach((inv) => {
      const branchName = branchMap[inv.branch_cnpj] || inv.branch_cnpj || "Sem Filial";
      if (!byBranch[branchName]) byBranch[branchName] = {};
      
      const supplierName = inv.supplier_name;
      if (!byBranch[branchName][supplierName]) byBranch[branchName][supplierName] = [];
      
      byBranch[branchName][supplierName].push(inv);
    });

    // Ordenar fornecedores e notas por data
    Object.keys(byBranch).forEach((branch) => {
      Object.keys(byBranch[branch]).forEach((supplier) => {
        byBranch[branch][supplier].sort((a, b) => {
          const dateA = new Date(a.issue_date || 0);
          const dateB = new Date(b.issue_date || 0);
          return dateA - dateB;
        });
      });
    });

    return byBranch;
  }, [invoices]);

  const sortedBranches = Object.keys(groupedData).sort();

  const grandTotal = invoices.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

  // Calcular total por filial
  const branchTotals = useMemo(() => {
    const totals = {};
    sortedBranches.forEach((branchName) => {
      totals[branchName] = Object.keys(groupedData[branchName]).reduce((sum, supplierName) => {
        return sum + groupedData[branchName][supplierName].reduce((s, inv) => s + (inv.total_value || 0), 0);
      }, 0);
    });
    return totals;
  }, [groupedData, sortedBranches]);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Relatório - Matéria Prima</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html { width: 100%; height: 100%; }
            body { 
              font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif; 
              font-size: 14px; 
              color: #1e293b; 
              line-height: 1.6; 
              background: #ffffff;
              padding: 0;
            }
            .print-container { 
              width: 100%; 
              max-width: 100%; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            /* Header com logo */
            .header-flex { 
              display: flex; 
              align-items: flex-start; 
              justify-content: space-between; 
              gap: 24px;
              border-bottom: 2px solid #1e293b;
              padding-bottom: 12px;
              margin-bottom: 8px;
            }
            .header-flex > div:first-child {
              flex: 1;
            }
            .header-title { 
              font-size: 24px; 
              font-weight: 700; 
              color: #1e293b;
              margin: 0 0 8px 0;
            }
            .header-subtitle { 
              font-size: 12px; 
              color: #64748b;
              margin: 0;
            }
            .header-logo {
              flex-shrink: 0;
            }
            .header-logo img {
              height: 64px;
              width: auto;
            }
            /* Summary bar */
            .summary-bar { 
              background: #f1f5f9; 
              border-left: 4px solid #1e293b; 
              padding: 12px 16px; 
              margin-bottom: 16px; 
              font-size: 14px; 
              color: #334155; 
              font-weight: 500;
            }
            /* Branch section */
            .branch-section { 
              margin-bottom: 20px; 
              border: 1px solid #e2e8f0; 
              border-radius: 4px; 
              overflow: hidden; 
            }
            .branch-header { 
              background: #1e293b; 
              color: white; 
              padding: 14px 16px; 
              font-size: 14px; 
              font-weight: 700; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
            }
            .supplier-header { 
              background: #f1f5f9; 
              padding: 12px 16px; 
              border-left: 4px solid #1e293b; 
              font-size: 13px; 
              font-weight: 700; 
              color: #1e293b;
              border-bottom: 1px solid #e2e8f0;
            }
            /* Table styles */
            table { 
              width: 100%; 
              border-collapse: collapse; 
              font-size: 13px;
            }
            thead tr { 
              background: #f1f5f9; 
              border-bottom: 1px solid #cbd5e1; 
            }
            th { 
              padding: 10px 12px; 
              text-align: left; 
              font-weight: 600; 
              color: #334155; 
              font-size: 12px; 
              text-transform: capitalize;
            }
            td { 
              padding: 10px 12px; 
              border-bottom: 1px solid #e2e8f0; 
              color: #334155;
            }
            tbody tr { 
              background: white; 
            }
            /* Subtotal */
            .subtotal-row {
              background: #f1f5f9;
              padding: 10px 12px;
              display: flex;
              justify-content: flex-end;
              align-items: center;
              gap: 12px;
              border-top: 1px solid #cbd5e1;
              border-bottom: 1px solid #cbd5e1;
              font-weight: 600;
              font-size: 13px;
            }
            .subtotal-row .label {
              color: #334155;
            }
            .subtotal-row .value {
              color: #1e293b;
              font-weight: 700;
            }
            /* Branch total */
            .branch-total { 
              background: #334155; 
              color: white; 
              padding: 14px 16px; 
              text-align: center; 
              font-weight: 700; 
              font-size: 14px;
            }
            /* Grand total */
            .grand-total { 
              background: #1e293b; 
              color: white; 
              padding: 16px 20px; 
              margin-top: 20px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              font-weight: 700; 
              border-radius: 4px;
            }
            .grand-total .value { 
              font-size: 16px; 
              font-weight: 800; 
            }
            @page { size: A4; margin: 10mm; }
            @media print { 
              body { margin: 0; padding: 0; }
              .print-container { padding: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">${content}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <DialogTitle className="text-xl">Relatório — Matéria Prima</DialogTitle>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Imprimir / Exportar PDF
          </Button>
        </div>

        <div ref={printRef} className="text-sm">
          {/* Cabeçalho com Logo */}
          <div className="header-flex">
            <div>
              <h1 className="header-title">Relatório — Matéria Prima</h1>
              <p className="header-subtitle">
                Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="header-logo">
              <img src="https://media.base44.com/images/public/69fa46185be2e7353b027550/e295bd950_MotorVlog13.png" alt="Concretar" />
            </div>
          </div>

          {/* Resumo */}
          <div className="summary-bar">
            <strong>{invoices.length}</strong> nota(s) · <strong>{sortedBranches.length}</strong> filial(is)
          </div>

          {/* Seções por Filial */}
          {sortedBranches.map((branchName) => {
            const supplierMap = groupedData[branchName];
            const sortedSuppliers = Object.keys(supplierMap).sort();

            return (
              <div key={branchName} className="branch-section">
                {/* Cabeçalho da Filial */}
                <div className="branch-header">
                  {branchName}
                </div>

                {/* Fornecedores */}
                <div>
                  {sortedSuppliers.map((supplierName) => {
                    const invList = supplierMap[supplierName];
                    const supplierTotal = invList.reduce((sum, inv) => sum + (inv.total_value || 0), 0);

                    return (
                      <div key={supplierName}>
                        {/* Nome do Fornecedor */}
                        <div className="supplier-header">
                          {supplierName}
                        </div>

                        {/* Tabela de Notas */}
                        <table>
                          <thead>
                            <tr>
                              <th>NF</th>
                              <th>Emissão</th>
                              <th>Vencimento</th>
                              <th>Produtos</th>
                              <th style={{ textAlign: 'right' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invList.map((inv) => (
                              <tr key={inv.id}>
                                <td style={{ color: '#0369a1', fontWeight: '600' }}>
                                  {inv.series ? `${inv.series}/${inv.number}` : inv.number}
                                </td>
                                <td>{formatDate(inv.issue_date)}</td>
                                <td>{formatDate(inv.due_date)}</td>
                                <td>
                                  {inv.items && inv.items.length > 0
                                    ? inv.items.map(item => item.description).join(", ")
                                    : "—"}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                  {formatCurrency(inv.total_value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Subtotal do Fornecedor */}
                        <div className="subtotal-row">
                          <span className="label">Subtotal:</span>
                          <span className="value">{formatCurrency(supplierTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total da Filial */}
                <div className="branch-total">
                  TOTAL {branchName.toUpperCase()} — {formatCurrency(branchTotals[branchName])}
                </div>
              </div>
            );
          })}

          {/* Total Geral */}
          <div className="grand-total">
            <span>TOTAL GERAL — {invoices.length} nota(s)</span>
            <span className="value">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}