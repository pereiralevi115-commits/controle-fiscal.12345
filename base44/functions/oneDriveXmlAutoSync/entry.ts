import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DOMParser } from 'npm:xmldom@0.6.0';

// ---------- Parser de XML embutido (espelha a lógica de oneDriveXmlManager) ----------
function getTagText(parent, tagName) {
  if (!parent) return "";
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length === 0) return "";
  return elements[0]?.textContent?.trim() || "";
}

const EVENT_LABELS = {
  "110110": "Carta de Correção",
  "110111": "Cancelamento",
  "110112": "Cancelamento por Substituição",
  "110113": "EPEC",
  "110140": "EPEC",
  "110150": "Pedido de Prorrogação",
  "110160": "Pedido de Prorrogação",
  "110170": "Manifestação do Fisco",
  "210200": "Confirmação da Operação",
  "210210": "Ciência da Operação",
  "210220": "Desconhecimento da Operação",
  "210240": "Operação não Realizada",
  "240130": "Comprovante de Entrega",
  "240140": "Cancelamento do Comprovante de Entrega",
  "610110": "Carta de Correção (CT-e)",
  "610111": "Cancelamento (CT-e)",
  "110180": "Cancelamento (CT-e)",
  "310610": "Comprovante de Entrega (CT-e)",
  "310620": "Cancelamento do Comprovante de Entrega (CT-e)",
};

function detectDocumentType(doc) {
  if (doc.getElementsByTagName("infEvento").length > 0) return "evento";
  if (doc.getElementsByTagName("infCte").length > 0) return "cte";
  if (doc.getElementsByTagName("infNFe").length > 0) return "nfe";
  if (doc.getElementsByTagName("infNFSe").length > 0) return "nfse";
  const nfseTags = ["InfNfse", "Nfse", "CompNfse", "InfDeclaracaoPrestacaoServico", "Rps"];
  for (const tag of nfseTags) {
    if (doc.getElementsByTagName(tag).length > 0) return "nfse";
  }
  return null;
}

function parseEvento(doc) {
  const infEvento = doc.getElementsByTagName("infEvento")[0];
  const tpEvento = getTagText(infEvento, "tpEvento");
  const accessKey = getTagText(infEvento, "chNFe") || getTagText(infEvento, "chCTe");
  const detEvento = infEvento.getElementsByTagName("detEvento")[0];
  const description = getTagText(detEvento, "xCorrecao")
    || getTagText(detEvento, "xJust")
    || getTagText(detEvento, "xMotivo")
    || "";
  const eventDate = getTagText(infEvento, "dhEvento");
  const protocol = getTagText(infEvento, "nProt")
    || (doc.getElementsByTagName("retEvento")[0] ? getTagText(doc.getElementsByTagName("retEvento")[0], "nProt") : "");

  return {
    is_event: true,
    access_key: accessKey,
    event_type: tpEvento,
    event_label: EVENT_LABELS[tpEvento] || `Evento ${tpEvento}`,
    description,
    event_date: eventDate ? eventDate.substring(0, 10) : "",
    protocol,
    is_cancellation: tpEvento === "110111" || tpEvento === "110112" || tpEvento === "110180",
  };
}

function parseNFe(doc) {
  const inf = doc.getElementsByTagName("infNFe")[0];
  const ide = inf.getElementsByTagName("ide")[0];
  const number = getTagText(ide, "nNF");
  const series = getTagText(ide, "serie");
  const issueDate = getTagText(ide, "dhEmi") || getTagText(ide, "dEmi");
  const operationNature = getTagText(ide, "natOp");

  let accessKey = "";
  const infId = inf.getAttribute("Id") || "";
  if (infId.startsWith("NFe")) accessKey = infId.substring(3);
  if (!accessKey) {
    const protNFe = doc.getElementsByTagName("protNFe");
    if (protNFe.length > 0) accessKey = getTagText(protNFe[0], "chNFe");
  }

  const emit = inf.getElementsByTagName("emit")[0];
  const supplierName = getTagText(emit, "xNome") || getTagText(emit, "xFant");
  const supplierCnpj = getTagText(emit, "CNPJ");
  const supplierIe = getTagText(emit, "IE");
  const emitEnder = emit?.getElementsByTagName("enderEmit")[0];
  const supplierAddress = emitEnder ? getTagText(emitEnder, "xLgr") : "";
  const supplierCity = emitEnder ? getTagText(emitEnder, "xMun") : "";
  const supplierState = emitEnder ? getTagText(emitEnder, "UF") : "";

  const dest = inf.getElementsByTagName("dest")[0];
  const recipientName = getTagText(dest, "xNome");
  const recipientCnpj = getTagText(dest, "CNPJ");

  const total = inf.getElementsByTagName("total")[0];
  const ICMSTot = total?.getElementsByTagName("ICMSTot")[0];
  const totalValue = parseFloat(getTagText(ICMSTot, "vNF")) || 0;
  const totalICMS = parseFloat(getTagText(ICMSTot, "vICMS")) || 0;
  const totalIPI = parseFloat(getTagText(ICMSTot, "vIPI")) || 0;
  const totalPIS = parseFloat(getTagText(ICMSTot, "vPIS")) || 0;
  const totalProducts = parseFloat(getTagText(ICMSTot, "vProd")) || 0;

  const cobr = inf.getElementsByTagName("cobr")[0];
  const dupElements = cobr?.getElementsByTagName("dup") || [];
  const installments = [];
  let dueDate = "";
  for (let i = 0; i < dupElements.length; i++) {
    const dup = dupElements[i];
    const dVenc = getTagText(dup, "dVenc");
    if (dVenc) {
      const normalized = dVenc.substring(0, 10);
      installments.push({ number: getTagText(dup, "nDup") || `${i + 1}`, due_date: normalized, value: parseFloat(getTagText(dup, "vDup")) || 0 });
      if (i === 0) dueDate = normalized;
    }
  }

  const infAdic = inf.getElementsByTagName("infAdic")[0];
  const complementInfo = getTagText(infAdic, "infCpl") || "";

  const detElements = inf.getElementsByTagName("det");
  const items = [];
  for (let i = 0; i < detElements.length; i++) {
    const prod = detElements[i].getElementsByTagName("prod")[0];
    if (prod) {
      items.push({
        code: getTagText(prod, "cProd"),
        description: getTagText(prod, "xProd"),
        unit: getTagText(prod, "uCom"),
        quantity: parseFloat(getTagText(prod, "qCom")) || 0,
        unit_value: parseFloat(getTagText(prod, "vUnCom")) || 0,
        total: parseFloat(getTagText(prod, "vProd")) || 0,
        ncm: getTagText(prod, "NCM"),
        cfop: getTagText(prod, "CFOP"),
      });
    }
  }

  return {
    document_type: "nfe",
    number, series, access_key: accessKey, operation_nature: operationNature,
    supplier_name: supplierName, supplier_cnpj: supplierCnpj, supplier_ie: supplierIe,
    supplier_address: supplierAddress, supplier_city: supplierCity, supplier_state: supplierState,
    recipient_name: recipientName, recipient_cnpj: recipientCnpj,
    total_value: totalValue, issue_date: issueDate ? issueDate.substring(0, 10) : "", due_date: dueDate,
    items, status: "pendente",
    tax_icms: totalICMS, tax_ipi: totalIPI, tax_pis: totalPIS,
    total_products: totalProducts,
    additional_info: complementInfo, installments,
  };
}

function parseCTe(doc) {
  const inf = doc.getElementsByTagName("infCte")[0];
  const ide = inf.getElementsByTagName("ide")[0];
  const number = getTagText(ide, "nCT");
  const series = getTagText(ide, "serie");
  const issueDate = getTagText(ide, "dhEmi") || getTagText(ide, "dEmi");

  let accessKey = "";
  const infId = inf.getAttribute("Id") || "";
  if (infId.startsWith("CTe")) accessKey = infId.substring(3);

  const emit = inf.getElementsByTagName("emit")[0];
  const dest = inf.getElementsByTagName("dest")[0];
  const vPrest = inf.getElementsByTagName("vPrest")[0];

  return {
    document_type: "cte",
    number, series, access_key: accessKey,
    operation_nature: getTagText(ide, "natOp"),
    cte_cfop: getTagText(ide, "CFOP"),
    cte_modal: getTagText(ide, "modal"),
    supplier_name: getTagText(emit, "xNome"),
    supplier_cnpj: getTagText(emit, "CNPJ"),
    recipient_name: getTagText(dest, "xNome"),
    recipient_cnpj: getTagText(dest, "CNPJ") || getTagText(dest, "CPF"),
    total_value: parseFloat(getTagText(vPrest, "vTPrest")) || 0,
    issue_date: issueDate ? issueDate.substring(0, 10) : "",
    due_date: "",
    status: "pendente",
    items: [], installments: [], payments: [],
  };
}

function parseNFSeNacional(doc) {
  const inf = doc.getElementsByTagName("infNFSe")[0];
  const number = getTagText(inf, "nNFSe");
  const accessKey = (inf.getAttribute("Id") || "").replace(/^NFS/, "");
  const issueDateRaw = getTagText(inf, "dhProc") || getTagText(inf, "dhEmi");

  const emit = inf.getElementsByTagName("emit")[0];
  const toma = inf.getElementsByTagName("toma")[0];
  const valores = inf.getElementsByTagName("valores")[0];
  const serv = inf.getElementsByTagName("serv")[0];
  const dps = inf.getElementsByTagName("infDPS")[0];

  return {
    document_type: "nfse",
    number: number || "",
    series: dps ? getTagText(dps, "serie") : "",
    access_key: accessKey,
    supplier_name: getTagText(emit, "xNome"),
    supplier_cnpj: getTagText(emit, "CNPJ") || getTagText(emit, "CPF"),
    supplier_ie: getTagText(emit, "IM"),
    supplier_city: getTagText(inf, "xLocEmi"),
    recipient_name: getTagText(toma, "xNome"),
    recipient_cnpj: getTagText(toma, "CNPJ") || getTagText(toma, "CPF"),
    total_value: parseFloat(getTagText(valores, "vLiq") || getTagText(valores, "vBC")) || 0,
    issue_date: issueDateRaw ? issueDateRaw.substring(0, 10) : "",
    due_date: "",
    status: "pendente",
    tax_iss: parseFloat(getTagText(valores, "vISSQN")) || 0,
    service_description: getTagText(serv, "xDescServ") || getTagText(inf, "xTribNac"),
    items: [], installments: [], payments: [],
  };
}

function parseNFSe(doc) {
  if (doc.getElementsByTagName("infNFSe").length > 0) {
    return parseNFSeNacional(doc);
  }
  const infRoot = doc.getElementsByTagName("InfNfse")[0]
    || doc.getElementsByTagName("Nfse")[0]
    || doc.getElementsByTagName("InfDeclaracaoPrestacaoServico")[0]
    || doc.getElementsByTagName("CompNfse")[0]
    || doc.getElementsByTagName("Rps")[0]
    || doc.documentElement;

  const number = getTagText(infRoot, "Numero") || getTagText(infRoot, "NumeroNfse") || getTagText(infRoot, "Nro");
  const issueDateRaw = getTagText(infRoot, "DataEmissao") || getTagText(infRoot, "DataEmissaoRps");

  const prestador = doc.getElementsByTagName("PrestadorServico")[0]
    || doc.getElementsByTagName("Prestador")[0]
    || doc.getElementsByTagName("IdentificacaoPrestador")[0];
  const tomador = doc.getElementsByTagName("TomadorServico")[0]
    || doc.getElementsByTagName("Tomador")[0]
    || doc.getElementsByTagName("IdentificacaoTomador")[0];

  const servico = doc.getElementsByTagName("Servico")[0];
  const valores = servico?.getElementsByTagName("Valores")[0] || doc.getElementsByTagName("Valores")[0];

  return {
    document_type: "nfse",
    number: number || "",
    series: getTagText(infRoot, "Serie") || "",
    access_key: getTagText(infRoot, "CodigoVerificacao"),
    supplier_name: getTagText(prestador, "RazaoSocial") || getTagText(prestador, "Nome"),
    supplier_cnpj: getTagText(prestador, "Cnpj") || getTagText(prestador, "CNPJ"),
    recipient_name: getTagText(tomador, "RazaoSocial") || getTagText(tomador, "Nome"),
    recipient_cnpj: getTagText(tomador, "Cnpj") || getTagText(tomador, "CNPJ") || getTagText(tomador, "Cpf") || getTagText(tomador, "CPF"),
    total_value: parseFloat(
      getTagText(valores, "ValorLiquidoNfse") || getTagText(valores, "ValorServicos") || getTagText(valores, "ValorTotal")
    ) || 0,
    issue_date: issueDateRaw ? issueDateRaw.substring(0, 10) : "",
    due_date: "",
    status: "pendente",
    tax_iss: parseFloat(getTagText(valores, "ValorIss")) || 0,
    service_description: getTagText(servico, "Discriminacao"),
    items: [], installments: [], payments: [],
  };
}

function cleanXmlText(xmlText) {
  if (typeof xmlText !== "string") return "";
  let cleaned = xmlText.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  const firstTag = cleaned.indexOf("<");
  if (firstTag > 0) cleaned = cleaned.substring(firstTag);
  return cleaned;
}

function parseXmlText(xmlText) {
  const cleaned = cleanXmlText(xmlText);
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleaned, "text/xml");
  const type = detectDocumentType(doc);

  let parsed;
  if (type === "evento") {
    parsed = parseEvento(doc);
    if (!parsed.access_key) {
      throw new Error("Evento sem chave de acesso — não foi possível vincular ao documento.");
    }
    return parsed;
  }
  if (type === "nfe") parsed = parseNFe(doc);
  else if (type === "cte") parsed = parseCTe(doc);
  else if (type === "nfse") parsed = parseNFSe(doc);
  else throw new Error("XML não reconhecido. Esperado NF-e, CT-e ou NFS-e.");

  if (!parsed.number && !parsed.supplier_name && !parsed.access_key) {
    throw new Error("XML inválido ou ilegível — não foi possível extrair os dados do documento.");
  }

  return parsed;
}

async function applyEvent(base44, parsed) {
  const docs = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
  if (docs.length === 0) return { applied: false };
  const doc = docs[0];
  const events = Array.isArray(doc.fiscal_events) ? doc.fiscal_events : [];
  // Os eventos são gravados com as chaves type/date/protocol — a checagem de
  // duplicidade precisa usar essas mesmas chaves.
  const already = events.some((e) =>
    e.type === parsed.event_type &&
    e.date === parsed.event_date &&
    (e.protocol || "") === (parsed.protocol || "")
  );
  if (already) return { applied: false };

  events.push({
    type: parsed.event_type,
    label: parsed.event_label,
    description: parsed.description,
    date: parsed.event_date,
    protocol: parsed.protocol,
  });

  const updateData = { fiscal_events: events };
  if (parsed.is_cancellation) {
    updateData.cancelled = true;
    updateData.cancellation_date = parsed.event_date || new Date().toISOString().split("T")[0];
    updateData.cancellation_reason = parsed.description || parsed.event_label;
  }

  await base44.asServiceRole.entities.Invoice.update(doc.id, updateData);
  return { applied: true };
}

// Parseia e cria as notas diretamente com service-role (sem invocar parseXml por HTTP,
// que falhava com 403 no contexto do webhook por não haver usuário autenticado).
async function importXmlContents(base44, xmlContents) {
  let success = 0;
  let errors = 0;

  for (const xml of xmlContents) {
    try {
      const parsed = parseXmlText(xml);

      if (parsed.is_event) {
        const res = await applyEvent(base44, parsed);
        if (res.applied) success++;
        continue;
      }

      parsed.branch_cnpj = parsed.recipient_cnpj;

      // Pula notas excluídas manualmente pelo admin (não devem voltar).
      let blocked = [];
      if (parsed.access_key) {
        blocked = await base44.asServiceRole.entities.DeletedInvoiceKey.filter({ access_key: parsed.access_key });
      }
      if (blocked.length === 0 && parsed.number && parsed.supplier_cnpj) {
        blocked = await base44.asServiceRole.entities.DeletedInvoiceKey.filter({
          number: parsed.number,
          supplier_cnpj: parsed.supplier_cnpj,
        });
      }
      if (blocked.length > 0) continue;

      let existing = [];
      if (parsed.access_key) {
        existing = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
      }
      if (existing.length === 0 && parsed.number && parsed.supplier_cnpj) {
        existing = await base44.asServiceRole.entities.Invoice.filter({
          number: parsed.number,
          supplier_cnpj: parsed.supplier_cnpj,
        });
      }
      if (existing.length > 0) continue;

      await base44.asServiceRole.entities.Invoice.create({ ...parsed, import_source: "auto" });
      success++;
    } catch (_) {
      errors++;
    }
    // Pequena pausa entre notas para não estourar o rate limit do banco.
    await new Promise((r) => setTimeout(r, 250));
  }

  return { success, errors, total: xmlContents.length };
}

async function graphRequest(accessToken, path, options = {}) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status} ${await response.text()}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function downloadFileText(accessToken, fileId) {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo: ${response.status} ${await response.text()}`);
  }

  return await response.text();
}

async function getSettings(base44) {
  const settings = await base44.asServiceRole.entities.OneDriveImportSettings.filter({ key: 'default' });
  return settings[0] || null;
}

function getConnectedFolders(settings) {
  if (!settings) return [];
  if (Array.isArray(settings.folders) && settings.folders.length > 0) {
    return settings.folders.filter((f) => f && f.folder_id);
  }
  if (settings.folder_id) {
    return [{ folder_id: settings.folder_id, folder_name: settings.folder_name, folder_path: settings.folder_path }];
  }
  return [];
}

async function saveResult(base44, settings, result, message) {
  if (!settings) return;
  await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
    folders: getConnectedFolders(settings),
    auto_sync_enabled: settings.auto_sync_enabled,
    last_sync_at: new Date().toISOString(),
    last_sync_message: message,
    last_import_total: result.total || 0,
    last_import_success: result.success || 0,
    last_import_errors: result.errors || 0,
  });
}

// Lista TODOS os XMLs de uma pasta, paginando pela Graph API.
async function listAllXmlFiles(accessToken, folderId) {
  const files = [];
  let url = `/me/drive/items/${folderId}/children?$select=id,name,file,lastModifiedDateTime&$top=200`;
  while (url) {
    const page = await graphRequest(accessToken, url);
    for (const item of page?.value || []) {
      if (item.file && item.name?.toLowerCase().endsWith('.xml')) {
        files.push(item);
      }
    }
    const next = page?.['@odata.nextLink'];
    // nextLink vem como URL absoluta; graphRequest espera o path relativo a /v1.0.
    url = next ? next.replace('https://graph.microsoft.com/v1.0', '') : null;
  }
  // Ordena do mais RECENTE para o mais antigo: os XMLs pendentes (recém-salvos
  // pelo emissor) ficam no topo da fila e são processados primeiro, mesmo quando
  // o nome do arquivo não contém a chave de acesso.
  files.sort((a, b) => {
    const ta = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
    const tb = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
    return tb - ta;
  });
  return files;
}

// Em vez de olhar só os arquivos recentes (que deixava de fora lotes grandes ou
// webhooks perdidos), varremos a pasta inteira e importamos apenas os PENDENTES
// — os XMLs cujo documento ainda não existe no banco. Para não estourar o tempo
// de execução, processamos no máximo MAX_PER_RUN por execução; os faltantes
// entram na passada seguinte (webhook ou agendamento de backup).
const MAX_PER_RUN = 40;

// Extrai a chave de acesso (44 dígitos) do nome do arquivo XML. Os XMLs fiscais
// são nomeados pela chave de acesso, então conseguimos saber se já foi importado
// SEM precisar baixar o conteúdo — o que torna a varredura muito mais rápida.
function accessKeyFromName(name) {
  const digits = (name || "").replace(/\D/g, "");
  const match = digits.match(/\d{44}/);
  return match ? match[0] : null;
}

// Busca, EM LOTE, quais chaves de acesso já existem no banco. Em vez de uma
// consulta por arquivo (que estourava o tempo em pastas grandes), fazemos
// poucas consultas usando $in e comparamos em memória.
async function fetchExistingKeys(base44, keys) {
  const existing = new Set();
  const CHUNK = 200;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const slice = keys.slice(i, i + CHUNK);
    const rows = await base44.asServiceRole.entities.Invoice.filter({ access_key: { $in: slice } });
    for (const row of rows) {
      if (row.access_key) existing.add(row.access_key);
    }
  }
  return existing;
}

async function upsertAudit(base44, data) {
  const now = new Date().toISOString();
  const payload = {
    ...data,
    last_seen_at: now,
    last_processed_at: now,
  };
  const existing = data.file_id
    ? await base44.asServiceRole.entities.OneDriveXmlAudit.filter({ file_id: data.file_id })
    : [];
  if (existing.length > 0) {
    await base44.asServiceRole.entities.OneDriveXmlAudit.update(existing[0].id, payload);
  } else {
    await base44.asServiceRole.entities.OneDriveXmlAudit.create(payload);
  }
}

async function savePendingEvent(base44, parsed) {
  const existing = await base44.asServiceRole.entities.PendingFiscalEvent.filter({
    access_key: parsed.access_key,
    event_type: parsed.event_type,
    protocol: parsed.protocol || "",
    status: "pendente",
  });
  if (existing.length > 0) return;
  await base44.asServiceRole.entities.PendingFiscalEvent.create({
    access_key: parsed.access_key,
    event_type: parsed.event_type,
    event_label: parsed.event_label,
    description: parsed.description,
    event_date: parsed.event_date,
    protocol: parsed.protocol || "",
    is_cancellation: parsed.is_cancellation,
    document_exists: false,
    status: "pendente",
  });
}

function auditBase(file, folder, extra = {}) {
  return {
    file_id: file.id,
    file_name: file.name,
    folder_id: folder.folder_id,
    folder_name: folder.folder_name,
    folder_path: folder.folder_path,
    modified_at_onedrive: file.lastModifiedDateTime,
    access_key: accessKeyFromName(file.name) || "",
    ...extra,
  };
}

async function importPendingXmls(base44, accessToken, folder, budget) {
  if (budget <= 0) return { success: 0, errors: 0, total: 0, remaining: 1 };

  const allFiles = await listAllXmlFiles(accessToken, folder.folder_id);
  const keysFromNames = [];
  for (const file of allFiles) {
    const key = accessKeyFromName(file.name);
    if (key) keysFromNames.push(key);
  }
  const existingKeys = await fetchExistingKeys(base44, keysFromNames);

  const candidates = [];
  for (const file of allFiles) {
    const key = accessKeyFromName(file.name);
    if (key && existingKeys.has(key)) continue;
    candidates.push(file);
    if (candidates.length >= budget) break;
  }

  let success = 0;
  let errors = 0;
  let processed = 0;

  for (const file of candidates) {
    if (processed >= budget) break;
    processed++;

    let content = "";
    try {
      content = await downloadFileText(accessToken, file.id);
    } catch (error) {
      errors++;
      await upsertAudit(base44, auditBase(file, folder, {
        status: "erro",
        document_type: "desconhecido",
        reason: `Falha ao baixar arquivo: ${error.message}`,
      }));
      continue;
    }

    try {
      const parsed = parseXmlText(content);
      const base = auditBase(file, folder, {
        access_key: parsed.access_key || accessKeyFromName(file.name) || "",
        document_type: parsed.is_event ? "evento" : parsed.document_type,
        document_number: parsed.number || "",
        supplier_name: parsed.supplier_name || "",
        supplier_cnpj: parsed.supplier_cnpj || "",
      });

      if (parsed.is_event) {
        const docs = parsed.access_key
          ? await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key })
          : [];
        if (docs.length === 0) {
          await savePendingEvent(base44, parsed);
          await upsertAudit(base44, { ...base, status: "evento_pendente", reason: "Evento fiscal aguardando a nota principal existir no sistema." });
          continue;
        }
        const res = await applyEvent(base44, parsed);
        await upsertAudit(base44, {
          ...base,
          status: res.applied ? "evento_aplicado" : "ignorado",
          reason: res.applied ? "Evento fiscal aplicado à nota." : "Evento fiscal já estava registrado na nota.",
          invoice_id: docs[0].id,
        });
        if (res.applied) success++;
        continue;
      }

      parsed.branch_cnpj = parsed.recipient_cnpj;
      let blocked = [];
      if (parsed.access_key) blocked = await base44.asServiceRole.entities.DeletedInvoiceKey.filter({ access_key: parsed.access_key });
      if (blocked.length === 0 && parsed.number && parsed.supplier_cnpj) {
        blocked = await base44.asServiceRole.entities.DeletedInvoiceKey.filter({ number: parsed.number, supplier_cnpj: parsed.supplier_cnpj });
      }
      if (blocked.length > 0) {
        await upsertAudit(base44, { ...base, status: "ignorado", reason: "Nota já foi excluída manualmente e não deve voltar." });
        continue;
      }

      let existing = [];
      if (parsed.access_key) existing = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
      if (existing.length === 0 && parsed.number && parsed.supplier_cnpj) {
        existing = await base44.asServiceRole.entities.Invoice.filter({ number: parsed.number, supplier_cnpj: parsed.supplier_cnpj });
      }
      if (existing.length > 0) {
        await upsertAudit(base44, { ...base, status: "duplicado", reason: "Documento já existe no sistema.", invoice_id: existing[0].id });
        continue;
      }

      const created = await base44.asServiceRole.entities.Invoice.create({ ...parsed, import_source: "auto" });
      await upsertAudit(base44, { ...base, status: "importado", reason: "Documento importado automaticamente.", invoice_id: created.id });
      success++;
    } catch (error) {
      errors++;
      await upsertAudit(base44, auditBase(file, folder, {
        status: "erro",
        document_type: "desconhecido",
        reason: error.message,
      }));
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  return { success, errors, total: processed, remaining: candidates.length >= budget ? 1 : 0 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const settings = await getSettings(base44);
    const connectedFolders = getConnectedFolders(settings);

    if (!settings?.auto_sync_enabled || connectedFolders.length === 0) {
      if (settings?.import_locked && settings.import_lock_source === 'auto') {
        await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
          import_locked: false, import_lock_source: null,
        });
      }
      return Response.json({ skipped: true, reason: 'Sincronização automática desativada.' });
    }

    // Trava global: se já houver uma importação manual (upload) ou outra rodando,
    // pula esta execução para não gerar notas duplicadas. Travas próprias da
    // varredura automática ("auto") são consideradas velhas mais cedo (90s),
    // para auto-recuperar rápido quando uma execução é cortada no meio.
    const LOCK_STALE_MS = settings.import_lock_source === 'auto' ? 90 * 1000 : 3 * 60 * 1000;
    if (settings.import_locked) {
      const lockedAt = settings.import_lock_at ? new Date(settings.import_lock_at).getTime() : 0;
      if (Date.now() - lockedAt < LOCK_STALE_MS) {
        return Response.json({ skipped: true, reason: `Outra importação em andamento (${settings.import_lock_source || 'outra'}).` });
      }
    }
    await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
      import_locked: true, import_lock_source: 'auto', import_lock_at: new Date().toISOString(),
    });

    try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    const totals = { success: 0, errors: 0, total: 0 };
    let pending = false;
    let budget = MAX_PER_RUN;
    for (const folder of connectedFolders) {
      const result = await importPendingXmls(base44, accessToken, folder, budget);
      totals.success += result.success || 0;
      totals.errors += result.errors || 0;
      totals.total += result.total || 0;
      budget -= (result.total || 0);
      if (result.remaining) pending = true;
      if (budget <= 0) { pending = true; break; }
    }

    const message = totals.total === 0
      ? 'Automático: nenhum XML pendente para importar.'
      : `Automático: ${totals.success} importada(s), ${totals.errors} erro(s) (${connectedFolders.length} pasta(s))${pending ? ' — ainda há pendentes, continuará na próxima execução.' : ''}`;

    await saveResult(base44, settings, totals, message);
    return Response.json({ ok: true, result: totals });
    } finally {
      const fresh = await getSettings(base44);
      if (fresh) {
        await base44.asServiceRole.entities.OneDriveImportSettings.update(fresh.id, {
          import_locked: false, import_lock_source: null,
        });
      }
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});