import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, Upload, XCircle } from "lucide-react";

const INVOICE_FIELDS = [
  "id", "document_type", "access_key", "number", "series", "supplier_name", "supplier_cnpj",
  "branch_cnpj", "recipient_cnpj", "issue_date", "total_value", "cancelled", "archived",
  "sigv_recorded", "topcon_recorded", "boleto_recorded"
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
const normalizeNumber = (value) => onlyDigits(value).replace(/^0+/, "") || "0";

async function readFileText(file) {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function tagText(parent, tagName) {
  if (!parent) return "";
  return parent.getElementsByTagName(tagName)[0]?.textContent?.trim() || "";
}

function parseXmlInfo(text, fileName) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text.replace(/^\uFEFF/, "").trim(), "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("XML inválido");
  if (doc.getElementsByTagName("infEvento").length) {
    const ev = doc.getElementsByTagName("infEvento")[0];
    return { fileName, isEvent: true, access_key: tagText(ev, "chNFe") || tagText(ev, "chCTe"), event_type: tagText(ev, "tpEvento") };
  }

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  const infCte = doc.getElementsByTagName("infCte")[0];
  const infNFSe = doc.getElementsByTagName("infNFSe")[0] || doc.getElementsByTagName("InfNfse")[0] || doc.getElementsByTagName("Nfse")[0] || doc.getElementsByTagName("CompNfse")[0];
  const type = infCte ? "cte" : infNFe ? "nfe" : infNFSe ? "nfse" : "desconhecido";
  const root = infCte || infNFe || infNFSe || doc.documentElement;
  const ide = root.getElementsByTagName("ide")[0] || root;
  const emit = root.getElementsByTagName("emit")[0] || doc.getElementsByTagName("PrestadorServico")[0] || doc.getElementsByTagName("Prestador")[0];
  const totalNode = root.getElementsByTagName("ICMSTot")[0] || root.getElementsByTagName("vPrest")[0] || root.getElementsByTagName("Valores")[0] || root.getElementsByTagName("valores")[0];
  const id = root.getAttribute("Id") || "";

  return {
    fileName,
    document_type: type,
    access_key: id.replace(/^(NFe|CTe|NFS)/, "") || tagText(doc, "chNFe") || tagText(doc, "chCTe") || tagText(root, "CodigoVerificacao"),
    number: tagText(ide, type === "cte" ? "nCT" : "nNF") || tagText(root, "nNFSe") || tagText(root, "Numero") || tagText(root, "NumeroNfse"),
    supplier_name: tagText(emit, "xNome") || tagText(emit, "RazaoSocial") || tagText(emit, "Nome"),
    supplier_cnpj: onlyDigits(tagText(emit, "CNPJ") || tagText(emit, "Cnpj") || tagText(emit, "CPF") || tagText(emit, "Cpf")),
    issue_date: (tagText(ide, "dhEmi") || tagText(ide, "dEmi") || tagText(root, "DataEmissao") || tagText(root, "dhProc") || "").substring(0, 10),
    total_value: parseFloat(tagText(totalNode, "vNF") || tagText(totalNode, "vTPrest") || tagText(totalNode, "ValorLiquidoNfse") || tagText(totalNode, "ValorServicos") || tagText(totalNode, "vLiq")) || 0,
  };
}

async function fetchAllInvoices() {
  const all = [];
  let skip = 0;
  while (true) {
    const page = await base44.entities.Invoice.list("-issue_date", 5000, skip, INVOICE_FIELDS);
    all.push(...page);
    if (page.length < 5000) break;
    skip += 5000;
  }
  return all;
}

function getAllocation(invoice, supplier, branchMap) {
  if (!invoice) return "Não encontrada no sistema";
  const type = invoice.document_type === "nfse" ? "NFS-e" : invoice.document_type === "cte" ? "CT-e" : "NF-e";
  const branch = branchMap[invoice.branch_cnpj] ? ` · ${branchMap[invoice.branch_cnpj]}` : "";
  if (invoice.cancelled) return `Canceladas (${type})${branch}`;
  if (invoice.archived || (invoice.sigv_recorded && invoice.topcon_recorded && invoice.boleto_recorded)) return `Arquivadas (${type})${branch}`;
  if (invoice.document_type === "cte") return `Dashboard > CT-e${branch}`;
  if (supplier?.materia_prima) return `Dashboard > Matéria Prima${branch}`;
  if (supplier?.gestao_compras) return `Dashboard > Gestão de Compras (${type})${branch}`;
  if (supplier?.gestao_frota) return `Dashboard > Gestão de Frota (${type})${branch}`;
  if (supplier?.controladoria) return `Dashboard > Controladoria (${type})${branch}`;
  if (supplier?.hidden) return `Fornecedor oculto — fora dos cards principais${branch}`;
  if (invoice.document_type === "nfse") return `Dashboard > NFS-e${branch}`;
  return `Dashboard > NF-e${branch}`;
}

function getScreenName(allocation) {
  return String(allocation || "Encontrada no sistema")
    .split(" · ")[0]
    .replace("Dashboard > ", "");
}

function valuesClose(a, b) {
  const left = Number(a || 0);
  const right = Number(b || 0);
  if (!left || !right) return true;
  return Math.abs(left - right) <= 0.01;
}

function findMatchingInvoice(parsed, byAccessKey, byNumberSupplier) {
  if (parsed.access_key && byAccessKey.get(parsed.access_key)) {
    return { invoice: byAccessKey.get(parsed.access_key), confident: true };
  }
  const key = `${normalizeNumber(parsed.number)}|${parsed.supplier_cnpj}`;
  const candidates = byNumberSupplier.get(key) || [];
  if (candidates.length === 0) return null;
  const valueMatch = candidates.find((invoice) => valuesClose(parsed.total_value, invoice.total_value));
  if (valueMatch) return { invoice: valueMatch, confident: true };
  return { invoice: candidates[0], confident: false };
}

export default function XmlSystemLocator() {
  const [rows, setRows] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const summary = useMemo(() => ({
    total: rows.length,
    found: rows.filter((r) => r.status === "found").length,
    missing: rows.filter((r) => r.status === "missing").length,
    divergences: rows.filter((r) => r.status === "divergence").length,
    events: rows.filter((r) => r.status === "event").length,
    errors: rows.filter((r) => r.status === "error").length,
  }), [rows]);

  const allocationSummary = useMemo(() => {
    const grouped = new Map();
    rows.filter((r) => r.status === "found").forEach((row) => {
      const key = getScreenName(row.allocation);
      const current = grouped.get(key) || { screen: key, count: 0, value: 0, notes: [] };
      current.count += 1;
      current.value += row.invoice?.total_value || row.total_value || 0;
      current.notes.push(row);
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.value - a.value);
  }, [rows]);

  const foundTotalValue = useMemo(
    () => allocationSummary.reduce((sum, item) => sum + item.value, 0),
    [allocationSummary]
  );

  const activeScreen = selectedScreen || allocationSummary.find((item) => item.screen.startsWith("Fornecedor oculto"))?.screen || allocationSummary[0]?.screen || "";
  const activeNotes = allocationSummary.find((item) => item.screen === activeScreen)?.notes || [];

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.name.toLowerCase().endsWith(".xml"));
    if (!files.length) return;
    setLoading(true);
    setError("");
    setSelectedScreen("");
    try {
      const [invoices, suppliers, branches] = await Promise.all([
        fetchAllInvoices(),
        base44.entities.Supplier.list(),
        base44.entities.Branch.list(),
      ]);
      const suppliersByCnpj = Object.fromEntries(suppliers.map((s) => [onlyDigits(s.cnpj), s]));
      const branchMap = Object.fromEntries(branches.map((b) => [b.cnpj, b.name]));
      const byAccessKey = new Map(invoices.filter((i) => i.access_key).map((i) => [i.access_key, i]));
      const byNumberSupplier = new Map();
      invoices.forEach((invoice) => {
        const key = `${normalizeNumber(invoice.number)}|${onlyDigits(invoice.supplier_cnpj)}`;
        byNumberSupplier.set(key, [...(byNumberSupplier.get(key) || []), invoice]);
      });

      const parsedRows = [];
      for (const file of files) {
        try {
          const parsed = parseXmlInfo(await readFileText(file), file.name);
          if (parsed.isEvent) {
            parsedRows.push({ ...parsed, status: "event", allocation: "XML de evento fiscal — não é nota nova" });
            continue;
          }
          const match = findMatchingInvoice(parsed, byAccessKey, byNumberSupplier);
          const found = match?.invoice || null;
          const supplier = suppliersByCnpj[onlyDigits(found?.supplier_cnpj)] || null;
          parsedRows.push({
            ...parsed,
            status: found ? (match.confident ? "found" : "divergence") : "missing",
            invoice: found,
            allocation: found ? (match.confident ? getAllocation(found, supplier, branchMap) : "Divergência de valor — revisar antes de confiar") : getAllocation(null, null, branchMap),
          });
        } catch (err) {
          parsedRows.push({ fileName: file.name, status: "error", allocation: err.message || "Erro ao ler XML" });
        }
      }
      setRows(parsedRows);
    } catch (err) {
      setError(err.message || "Erro ao conferir XMLs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <FileSearch className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">Conferir XMLs sem importar</h2>
          <p className="text-sm text-slate-500">Carregue os XMLs para consultar se já existem no sistema e em qual tela/card estão alocados.</p>
        </div>
      </div>

      <label
        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-xl py-8 px-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        {loading ? <Loader2 className="w-9 h-9 text-blue-600 animate-spin" /> : <Upload className="w-9 h-9 text-blue-500" />}
        <div className="text-center">
          <p className="font-semibold text-slate-700">{loading ? "Conferindo XMLs..." : "Arraste ou selecione XMLs para conferência"}</p>
          <p className="text-xs text-slate-400 mt-1">Essa ação não importa nem altera notas no sistema.</p>
        </div>
        <input type="file" accept=".xml" multiple className="hidden" disabled={loading} onChange={(e) => handleFiles(e.target.files)} />
      </label>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="XMLs lidos" value={summary.total} />
            <Stat label="Encontradas" value={summary.found} color="text-emerald-700" />
            <Stat label="Não encontradas" value={summary.missing} color="text-red-700" />
            <Stat label="Divergências" value={summary.divergences} color="text-orange-700" />
            <Stat label="Eventos" value={summary.events} color="text-blue-700" />
            <Stat label="Erros" value={summary.errors} color="text-amber-700" />
          </div>

          {allocationSummary.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-900 text-white p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-slate-300 uppercase tracking-wide font-semibold">Somatório das notas encontradas</p>
                  <p className="text-2xl font-bold">{formatCurrency(foundTotalValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-300 uppercase tracking-wide font-semibold">Total de notas</p>
                  <p className="text-2xl font-bold">{summary.found}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {allocationSummary.map((item) => (
                  <button
                    key={item.screen}
                    type="button"
                    onClick={() => setSelectedScreen(item.screen)}
                    className={`text-left rounded-xl border p-4 shadow-sm transition-colors ${activeScreen === item.screen ? "bg-blue-50 border-blue-300" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                  >
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Tela</p>
                    <p className="text-base font-bold text-slate-800 mt-1">{item.screen}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500 font-semibold">Quantidade</p>
                        <p className="text-2xl font-bold text-slate-800">{item.count}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3 text-right">
                        <p className="text-xs text-emerald-700 font-semibold">Valor</p>
                        <p className="text-lg font-bold text-emerald-700">{formatCurrency(item.value)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {activeNotes.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <p className="font-bold text-slate-800">Lista de notas — {activeScreen}</p>
                    <p className="text-xs text-slate-500">{activeNotes.length} nota(s) · {formatCurrency(activeNotes.reduce((sum, row) => sum + (row.invoice?.total_value || row.total_value || 0), 0))}</p>
                  </div>
                  <div className="overflow-auto max-h-[360px]">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">NF</th>
                          <th className="text-left px-4 py-3 font-semibold">Fornecedor</th>
                          <th className="text-left px-4 py-3 font-semibold">Filial</th>
                          <th className="text-left px-4 py-3 font-semibold">Data</th>
                          <th className="text-right px-4 py-3 font-semibold">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeNotes.map((row, index) => (
                          <tr key={`${row.fileName}-active-${index}`} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-semibold text-slate-700">{row.invoice?.number || row.number || "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{row.invoice?.supplier_name || row.supplier_name || "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{String(row.allocation || "").split(" · ")[1] || "—"}</td>
                            <td className="px-4 py-3 text-slate-600">{row.invoice?.issue_date || row.issue_date || "—"}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(row.invoice?.total_value || row.total_value || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="overflow-auto border border-slate-200 rounded-xl max-h-[520px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">XML / NF</th>
                  <th className="text-left px-4 py-3 font-semibold">Fornecedor</th>
                  <th className="text-right px-4 py-3 font-semibold">Valor XML</th>
                  <th className="text-right px-4 py-3 font-semibold">Valor sistema</th>
                  <th className="text-left px-4 py-3 font-semibold">Onde está no sistema</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.fileName}-${index}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-700">{row.number || row.event_type || "—"}</p><p className="text-xs text-slate-400 max-w-[220px] truncate">{row.fileName}</p></td>
                    <td className="px-4 py-3 text-slate-600 max-w-[260px] truncate">{row.supplier_name || row.invoice?.supplier_name || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.total_value ? formatCurrency(row.total_value) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.invoice ? formatCurrency(row.invoice.total_value) : "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{row.allocation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-slate-700" }) {
  return <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-slate-500">{label}</p></div>;
}

function StatusBadge({ status }) {
  if (status === "found") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1"><CheckCircle2 className="w-3 h-3" /> Encontrada</span>;
  if (status === "missing") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-1"><XCircle className="w-3 h-3" /> Não encontrada</span>;
  if (status === "divergence") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 rounded-full px-2 py-1"><AlertTriangle className="w-3 h-3" /> Divergência</span>;
  if (status === "event") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-1"><FileSearch className="w-3 h-3" /> Evento</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-1"><AlertTriangle className="w-3 h-3" /> Erro</span>;
}