import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DOMParser } from 'npm:xmldom@0.6.0';

// ---------- Parser de XML embutido (espelha a lógica de parseXml.js) ----------
function getTagText(parent, tagName) {
  if (!parent) return "";
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length === 0) return "";
  return elements[0]?.textContent?.trim() || "";
}

// Mapeia o código do tipo de evento (tpEvento) para um rótulo legível.
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
  // Eventos (Cancelamento, CC-e, etc.) — não são documentos novos, são anexados.
  if (doc.getElementsByTagName("infEvento").length > 0) return "evento";
  // IMPORTANTE: checar CT-e ANTES de NF-e. Um CT-e referencia as NF-e transportadas
  // dentro de <infNFe>, então a checagem de NF-e pegaria o CT-e por engano.
  if (doc.getElementsByTagName("infCte").length > 0) return "cte";
  if (doc.getElementsByTagName("infNFe").length > 0) return "nfe";
  // NFS-e padrão nacional (layout sped.fazenda.gov.br/nfse)
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
  // A chave do documento referenciado pode estar em chNFe ou chCTe.
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

  // Emitente / Prestador
  const emit = inf.getElementsByTagName("emit")[0];
  const emitEnder = emit?.getElementsByTagName("enderNac")[0];

  // Tomador
  const toma = inf.getElementsByTagName("toma")[0];
  const tomaEnd = toma?.getElementsByTagName("end")[0];

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
    supplier_address: emitEnder ? getTagText(emitEnder, "xLgr") : "",
    supplier_number: emitEnder ? getTagText(emitEnder, "nro") : "",
    supplier_district: emitEnder ? getTagText(emitEnder, "xBairro") : "",
    supplier_city: getTagText(inf, "xLocEmi"),
    supplier_state: emitEnder ? getTagText(emitEnder, "UF") : "",
    supplier_zip: emitEnder ? getTagText(emitEnder, "CEP") : "",
    supplier_phone: getTagText(emit, "fone"),
    supplier_email: getTagText(emit, "email"),
    recipient_name: getTagText(toma, "xNome"),
    recipient_cnpj: getTagText(toma, "CNPJ") || getTagText(toma, "CPF"),
    recipient_address: tomaEnd ? getTagText(tomaEnd, "xLgr") : "",
    recipient_number: tomaEnd ? getTagText(tomaEnd, "nro") : "",
    recipient_district: tomaEnd ? getTagText(tomaEnd, "xBairro") : "",
    recipient_city: getTagText(inf, "xLocPrestacao") || getTagText(inf, "xLocIncid"),
    recipient_zip: tomaEnd ? getTagText(tomaEnd, "CEP") : "",
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

  // Rejeita documentos vazios (parsing falhou): evita criar notas em branco.
  if (!parsed.number && !parsed.supplier_name && !parsed.access_key) {
    throw new Error("XML inválido ou ilegível — não foi possível extrair os dados do documento.");
  }

  return parsed;
}

// Importa um lote de XMLs diretamente (sem chamar parseXml por HTTP)
// Aplica um evento (cancelamento, CC-e, etc.) a um documento existente.
async function applyEvent(base44, parsed) {
  const docs = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
  if (docs.length === 0) {
    return { applied: false, reason: "documento_nao_encontrado" };
  }
  const doc = docs[0];
  const events = Array.isArray(doc.fiscal_events) ? doc.fiscal_events : [];

  // Evita duplicar o mesmo evento. Os eventos são gravados com as chaves
  // type/date/protocol, então a comparação precisa usar essas chaves.
  const already = events.some((e) =>
    e.type === parsed.event_type &&
    e.date === parsed.event_date &&
    (e.protocol || "") === (parsed.protocol || "")
  );
  if (already) {
    return { applied: false, reason: "evento_duplicado" };
  }

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

async function importXmlBatchLocal(base44, xmlContents) {
  let success = 0;
  let errors = 0;
  const errorDetails = [];

  for (let i = 0; i < xmlContents.length; i++) {
    try {
      const parsed = parseXmlText(xmlContents[i]);

      // Eventos não criam documentos novos — são anexados ao documento existente.
      if (parsed.is_event) {
        const res = await applyEvent(base44, parsed);
        if (res.applied) {
          success++;
        }
        // Eventos sem documento pai ou duplicados são ignorados silenciosamente (não são erros).
        continue;
      }

      parsed.branch_cnpj = parsed.recipient_cnpj;

      // Pula notas que foram excluídas manualmente pelo admin (não devem voltar).
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
      if (blocked.length > 0) {
        errors++;
        errorDetails.push({ index: i, error: `Documento #${parsed.number} foi excluído e não será reimportado` });
        continue;
      }

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

      if (existing.length > 0) {
        errors++;
        errorDetails.push({ index: i, error: `Documento #${parsed.number} já importado` });
        continue;
      }

      await base44.asServiceRole.entities.Invoice.create(parsed);
      success++;
    } catch (err) {
      errors++;
      errorDetails.push({ index: i, error: err.message });
    }
  }

  return { success, errors, error_details: errorDetails, total: xmlContents.length };
}

function getPathLabel(item) {
  const basePath = item?.parentReference?.path?.replace('/drive/root:', '') || '';
  const fullPath = `${basePath}/${item?.name || ''}`.replace(/\/+/g, '/');
  return fullPath || '/';
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

// Retorna a lista de pastas conectadas, considerando o campo legado de pasta única.
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

async function saveSettings(base44, data) {
  const existing = await getSettings(base44);
  const payload = {
    ...data,
    key: 'default',
  };

  if (existing) {
    return await base44.asServiceRole.entities.OneDriveImportSettings.update(existing.id, payload);
  }

  return await base44.asServiceRole.entities.OneDriveImportSettings.create(payload);
}



async function listFolderItems(accessToken, parentId) {
  const currentFolder = parentId
    ? await graphRequest(accessToken, `/me/drive/items/${parentId}?$select=id,name,parentReference,folder`)
    : { id: 'root', name: 'Raiz do OneDrive', pathLabel: '/' };

  // Percorre TODAS as páginas da Graph API (devolve no máx. 200 por vez),
  // senão o contador para em 200 mesmo havendo milhares de arquivos.
  const firstPath = parentId
    ? `/me/drive/items/${parentId}/children?$select=id,name,parentReference,folder,file&$top=200`
    : `/me/drive/root/children?$select=id,name,parentReference,folder,file&$top=200`;

  const items = [];
  let nextLink = firstPath;
  while (nextLink) {
    const response = nextLink.startsWith('https://')
      ? await fetch(nextLink, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }).then((r) => r.json())
      : await graphRequest(accessToken, nextLink);
    (response?.value || []).forEach((item) => items.push(item));
    nextLink = response?.['@odata.nextLink'] || null;
  }

  const folders = items
    .filter((item) => item.folder)
    .map((item) => ({
      id: item.id,
      name: item.name,
      pathLabel: getPathLabel(item),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const xmlFiles = items.filter((item) => item.file && item.name?.toLowerCase().endsWith('.xml'));

  return {
    currentFolder: parentId
      ? {
          id: currentFolder.id,
          name: currentFolder.name,
          pathLabel: getPathLabel(currentFolder),
        }
      : currentFolder,
    folders,
    xmlFileCount: xmlFiles.length,
  };
}

// Busca TODOS os XMLs da pasta usando paginação da Graph API
async function listAllXmlFiles(accessToken, folderId) {
  const allFiles = [];
  let nextLink = `/me/drive/items/${folderId}/children?$select=id,name,file,lastModifiedDateTime&$top=200`;

  while (nextLink) {
    const url = nextLink.startsWith('https://') ? nextLink : null;
    const response = url
      ? await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }).then(r => r.json())
      : await graphRequest(accessToken, nextLink);

    const items = response?.value || [];
    items.filter(item => item.file && item.name?.toLowerCase().endsWith('.xml')).forEach(f => allFiles.push(f));
    nextLink = response?.['@odata.nextLink'] || null;
  }

  return allFiles;
}

function accessKeyFromName(name) {
  const digits = (name || "").replace(/\D/g, "");
  const match = digits.match(/\d{44}/);
  return match ? match[0] : null;
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

async function upsertAudit(base44, data) {
  const now = new Date().toISOString();
  const payload = { ...data, last_seen_at: now, last_processed_at: now };
  const existing = data.file_id ? await base44.asServiceRole.entities.OneDriveXmlAudit.filter({ file_id: data.file_id }) : [];
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

const FINAL_AUDIT_STATUSES = ["importado", "duplicado", "ignorado", "evento_aplicado"];

async function shouldSkipResolvedAudit(base44, file) {
  const existing = await base44.asServiceRole.entities.OneDriveXmlAudit.filter({ file_id: file.id });
  if (existing.length === 0) return false;

  const audit = existing[0];
  const unchanged = !file.lastModifiedDateTime || !audit.modified_at_onedrive || audit.modified_at_onedrive === file.lastModifiedDateTime;
  if (!FINAL_AUDIT_STATUSES.includes(audit.status) || !unchanged) return false;

  await base44.asServiceRole.entities.OneDriveXmlAudit.update(audit.id, { last_seen_at: new Date().toISOString() });
  return true;
}

async function processOneDriveXmlFile(base44, accessToken, file, folder) {
  if (await shouldSkipResolvedAudit(base44, file)) {
    return { success: 0, errors: 0 };
  }

  let content = "";
  try {
    content = await downloadFileText(accessToken, file.id);
  } catch (error) {
    await upsertAudit(base44, auditBase(file, folder, {
      status: "erro",
      document_type: "desconhecido",
      reason: `Falha ao baixar arquivo do OneDrive: ${error.message}`,
    }));
    return { success: 0, errors: 1, detail: `${file.name}: falha ao baixar do OneDrive` };
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
      const docs = parsed.access_key ? await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key }) : [];
      if (docs.length === 0) {
        await savePendingEvent(base44, parsed);
        await upsertAudit(base44, { ...base, status: "evento_pendente", reason: "Evento fiscal guardado para aprovação quando a nota principal existir." });
        return { success: 0, errors: 0 };
      }

      const res = await applyEvent(base44, parsed);
      await upsertAudit(base44, {
        ...base,
        status: res.applied ? "evento_aplicado" : "ignorado",
        reason: res.applied ? "Evento fiscal aplicado à nota." : "Evento fiscal já estava registrado na nota.",
        invoice_id: docs[0].id,
      });
      return { success: res.applied ? 1 : 0, errors: 0 };
    }

    parsed.branch_cnpj = parsed.recipient_cnpj;

    let blocked = [];
    if (parsed.access_key) blocked = await base44.asServiceRole.entities.DeletedInvoiceKey.filter({ access_key: parsed.access_key });
    if (blocked.length === 0 && parsed.number && parsed.supplier_cnpj) {
      blocked = await base44.asServiceRole.entities.DeletedInvoiceKey.filter({ number: parsed.number, supplier_cnpj: parsed.supplier_cnpj });
    }
    if (blocked.length > 0) {
      await upsertAudit(base44, { ...base, status: "ignorado", reason: "Nota já foi excluída manualmente e não deve voltar para o sistema." });
      return { success: 0, errors: 0 };
    }

    let existing = [];
    if (parsed.access_key) existing = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
    if (existing.length === 0 && parsed.number && parsed.supplier_cnpj) {
      existing = await base44.asServiceRole.entities.Invoice.filter({ number: parsed.number, supplier_cnpj: parsed.supplier_cnpj });
    }
    if (existing.length > 0) {
      await upsertAudit(base44, { ...base, status: "duplicado", reason: "Documento já existe no sistema; não foi importado novamente.", invoice_id: existing[0].id });
      return { success: 0, errors: 0 };
    }

    const created = await base44.asServiceRole.entities.Invoice.create({ ...parsed, import_source: "manual" });
    await upsertAudit(base44, { ...base, status: "importado", reason: "Documento importado manualmente pelo OneDrive.", invoice_id: created.id });
    return { success: 1, errors: 0 };
  } catch (error) {
    await upsertAudit(base44, auditBase(file, folder, {
      status: "erro",
      document_type: "desconhecido",
      reason: error.message,
    }));
    return { success: 0, errors: 1, detail: `${file.name}: ${error.message}` };
  }
}

// Importa em lotes de BATCH_SIZE arquivos por chamada para evitar timeout.
const BATCH_SIZE = 5;

async function importFolderById(base44, accessToken, folder, skip = 0) {
  const allXmlFiles = await listAllXmlFiles(accessToken, folder.folder_id);
  const totalFiles = allXmlFiles.length;
  const batch = allXmlFiles.slice(skip, skip + BATCH_SIZE);

  if (batch.length === 0) {
    return { success: 0, errors: 0, error_details: [], total: totalFiles, processed: skip, remaining: 0, done: true };
  }

  let success = 0;
  let errors = 0;
  const errorDetails = [];

  for (let i = 0; i < batch.length; i++) {
    const result = await processOneDriveXmlFile(base44, accessToken, batch[i], folder);
    success += result.success || 0;
    errors += result.errors || 0;
    if (result.detail) errorDetails.push({ index: skip + i, error: result.detail });
  }

  const processed = skip + batch.length;
  const remaining = Math.max(0, totalFiles - processed);
  return { success, errors, error_details: errorDetails, total: totalFiles, processed, remaining, done: remaining <= 0 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, parentId, folderId, folderName, folderPath, autoSyncEnabled, fileIds } = payload || {};
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    if (action === 'getStatus') {
      let settings = await getSettings(base44);
      const lockedAt = settings?.import_lock_at ? new Date(settings.import_lock_at).getTime() : 0;
      const lockIsOld = settings?.import_locked && Date.now() - lockedAt > 90 * 1000;
      const disabledAutoLock = settings?.import_locked && settings.import_lock_source === 'auto' && settings.auto_sync_enabled === false;
      if (settings && (lockIsOld || disabledAutoLock)) {
        settings = await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
          import_locked: false, import_lock_source: null,
        });
      }
      return Response.json({ settings });
    }

    if (action === 'listFolderItems') {
      const data = await listFolderItems(accessToken, parentId);
      return Response.json(data);
    }

    if (action === 'addFolder') {
      const current = await getSettings(base44);
      if (!folderId) {
        return Response.json({ error: 'Selecione uma pasta válida.' }, { status: 400 });
      }
      const existingFolders = getConnectedFolders(current);
      if (existingFolders.some((f) => f.folder_id === folderId)) {
        return Response.json({ error: 'Esta pasta já está conectada.' }, { status: 400 });
      }
      if (existingFolders.length >= 3) {
        return Response.json({ error: 'Você já conectou o máximo de 3 pastas. Remova uma para adicionar outra.' }, { status: 400 });
      }
      const folders = [...existingFolders, { folder_id: folderId, folder_name: folderName, folder_path: folderPath }];
      const settings = await saveSettings(base44, {
        folders,
        folder_id: null,
        folder_name: null,
        folder_path: null,
        auto_sync_enabled: current?.auto_sync_enabled || false,
        last_sync_at: current?.last_sync_at,
        last_sync_message: current?.last_sync_message,
        last_import_total: current?.last_import_total || 0,
        last_import_success: current?.last_import_success || 0,
        last_import_errors: current?.last_import_errors || 0,
      });
      return Response.json({ settings });
    }

    if (action === 'removeFolder') {
      const current = await getSettings(base44);
      const folders = getConnectedFolders(current).filter((f) => f.folder_id !== folderId);
      const settings = await saveSettings(base44, {
        folders,
        folder_id: null,
        folder_name: null,
        folder_path: null,
        auto_sync_enabled: current?.auto_sync_enabled || false,
        last_sync_at: current?.last_sync_at,
        last_sync_message: current?.last_sync_message,
        last_import_total: current?.last_import_total || 0,
        last_import_success: current?.last_import_success || 0,
        last_import_errors: current?.last_import_errors || 0,
      });
      return Response.json({ settings });
    }

    if (action === 'toggleAutoSync') {
      const current = await getSettings(base44);
      const folders = getConnectedFolders(current);
      if (folders.length === 0) {
        return Response.json({ error: 'Conecte pelo menos uma pasta primeiro.' }, { status: 400 });
      }
      const settings = await saveSettings(base44, {
        folders,
        folder_id: null,
        folder_name: null,
        folder_path: null,
        auto_sync_enabled: typeof autoSyncEnabled === 'boolean' ? autoSyncEnabled : !(current?.auto_sync_enabled),
        last_sync_at: current?.last_sync_at,
        last_sync_message: current?.last_sync_message,
        last_import_total: current?.last_import_total || 0,
        last_import_success: current?.last_import_success || 0,
        last_import_errors: current?.last_import_errors || 0,
      });
      return Response.json({ settings });
    }

    if (action === 'importFolder') {
      const settings = await getSettings(base44);
      const connectedFolders = getConnectedFolders(settings);
      if (connectedFolders.length === 0) {
        return Response.json({ error: 'Conecte pelo menos uma pasta do OneDrive primeiro.' }, { status: 400 });
      }

      // Processa uma pasta por vez, lote por lote. O frontend controla folderIndex/skip.
      const folderIndex = payload.folderIndex || 0;
      const skip = payload.skip || 0;

      // Trava global: adquirida no primeiro lote, liberada quando concluir (allDone).
      const LOCK_STALE_MS = 90 * 1000;
      const isFirstBatchOfRun = folderIndex === 0 && skip === 0;
      if (isFirstBatchOfRun) {
        if (settings?.import_locked) {
          const lockedByDisabledAuto = settings.import_lock_source === 'auto' && settings.auto_sync_enabled === false;
          const lockedAt = settings.import_lock_at ? new Date(settings.import_lock_at).getTime() : 0;
          if (!lockedByDisabledAuto && Date.now() - lockedAt < LOCK_STALE_MS) {
            return Response.json({
              error: `Já existe uma importação em andamento (${settings.import_lock_source || 'outra'}). Aguarde concluir antes de iniciar outra.`,
              import_busy: true,
            }, { status: 409 });
          }
        }
        await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
          import_locked: true, import_lock_source: 'onedrive', import_lock_at: new Date().toISOString(),
        });
      }

      const currentFolderEntry = connectedFolders[folderIndex];

      if (!currentFolderEntry) {
        return Response.json({ allDone: true, done: true });
      }

      const result = await importFolderById(base44, accessToken, currentFolderEntry, skip);

      // Acumula os totais entre lotes e pastas (zera só no primeiríssimo lote da primeira pasta).
      const isFirstBatch = folderIndex === 0 && skip === 0;
      const prevSuccess = isFirstBatch ? 0 : (settings?.last_import_success || 0);
      const prevErrors = isFirstBatch ? 0 : (settings?.last_import_errors || 0);

      const totalSuccess = prevSuccess + (result.success || 0);
      const totalErrors = prevErrors + (result.errors || 0);

      const folderDone = result.done;
      const isLastFolder = folderIndex >= connectedFolders.length - 1;
      const allDone = folderDone && isLastFolder;

      const message = allDone
        ? `Concluído: ${totalSuccess} importada(s), ${totalErrors} erro(s) (${connectedFolders.length} pasta(s))`
        : `Processando pasta ${folderIndex + 1}/${connectedFolders.length}: ${result.processed}/${result.total} arquivos...`;

      await saveSettings(base44, {
        folders: connectedFolders,
        folder_id: null,
        folder_name: null,
        folder_path: null,
        auto_sync_enabled: settings?.auto_sync_enabled || false,
        import_locked: true,
        import_lock_source: 'onedrive',
        import_lock_at: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        last_sync_message: message,
        last_import_total: result.total,
        last_import_success: totalSuccess,
        last_import_errors: totalErrors,
      });

      // Libera a trava global quando toda a importação terminar.
      if (allDone) {
        const fresh = await getSettings(base44);
        if (fresh) {
          await base44.asServiceRole.entities.OneDriveImportSettings.update(fresh.id, {
            import_locked: false, import_lock_source: null,
          });
        }
      }

      // Indica ao frontend qual a próxima posição (próximo lote ou próxima pasta).
      const nextFolderIndex = folderDone ? folderIndex + 1 : folderIndex;
      const nextSkip = folderDone ? 0 : result.processed;

      return Response.json({
        ...result,
        totalSuccess,
        totalErrors,
        folderIndex,
        folderName: currentFolderEntry.folder_name,
        folderCount: connectedFolders.length,
        nextFolderIndex,
        nextSkip,
        allDone,
        done: allDone,
      });
    }

    if (action === 'importFiles') {
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return Response.json({ error: 'Selecione pelo menos um arquivo.' }, { status: 400 });
      }

      const xmlContents = [];
      const fileErrors = [];
      for (const fileId of fileIds) {
        try {
          const metadata = await graphRequest(accessToken, `/me/drive/items/${fileId}?$select=id,name,file`);
          if (!metadata?.file || !metadata.name?.toLowerCase().endsWith('.xml')) {
            fileErrors.push({ error: `${metadata?.name || fileId}: arquivo inválido` });
            continue;
          }
          xmlContents.push(await downloadFileText(accessToken, fileId));
        } catch (error) {
          fileErrors.push({ error: `${fileId}: ${error.message}` });
        }
      }

      const result = xmlContents.length > 0
        ? await importXmlContents(base44, xmlContents)
        : { success: 0, errors: 0, error_details: [], total: 0 };

      return Response.json({
        ...result,
        total: fileIds.length,
        errors: result.errors + fileErrors.length,
        error_details: result.error_details.concat(
          fileErrors.map((item, index) => ({ index: result.total + index, error: item.error }))
        ),
      });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});