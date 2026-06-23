import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DOMParser } from 'npm:xmldom@0.6.0';

// ---------- Parser de XML embutido (espelha a lógica de parseXml.js) ----------
function getTagText(parent, tagName) {
  if (!parent) return "";
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length === 0) return "";
  return elements[0]?.textContent?.trim() || "";
}

function detectDocumentType(doc) {
  if (
    doc.getElementsByTagName("procEventoNFe").length > 0 ||
    doc.getElementsByTagName("procEventoCTe").length > 0 ||
    doc.getElementsByTagName("infEvento").length > 0 ||
    doc.getElementsByTagName("detEvento").length > 0
  ) return "evento";
  if (doc.getElementsByTagName("infNFe").length > 0) return "nfe";
  if (doc.getElementsByTagName("infCte").length > 0) return "cte";
  // NFS-e padrão nacional (layout sped.fazenda.gov.br/nfse)
  if (doc.getElementsByTagName("infNFSe").length > 0) return "nfse";
  const nfseTags = ["InfNfse", "Nfse", "CompNfse", "InfDeclaracaoPrestacaoServico", "Rps"];
  for (const tag of nfseTags) {
    if (doc.getElementsByTagName(tag).length > 0) return "nfse";
  }
  return null;
}

const EVENT_LABELS = {
  "110111": "Cancelamento",
  "110110": "Carta de Correção (CC-e)",
  "110112": "Cancelamento por Substituição",
  "210200": "Confirmação da Operação",
  "210210": "Ciência da Operação",
  "210220": "Desconhecimento da Operação",
  "210240": "Operação Não Realizada",
};

function parseEvento(doc) {
  const infEvento = doc.getElementsByTagName("infEvento")[0];
  const detEvento = doc.getElementsByTagName("detEvento")[0];
  const eventTypeCode = getTagText(infEvento, "tpEvento");
  const accessKey = getTagText(infEvento, "chNFe") || getTagText(infEvento, "chCTe");
  const retEvento = doc.getElementsByTagName("retEvento")[0];
  return {
    __is_event: true,
    access_key: accessKey,
    event: {
      event_type_code: eventTypeCode,
      event_type_label: EVENT_LABELS[eventTypeCode] || getTagText(detEvento, "descEvento") || "Evento Fiscal",
      description:
        getTagText(detEvento, "xJust") ||
        getTagText(detEvento, "xCorrecao") ||
        getTagText(detEvento, "xMotivo") ||
        getTagText(detEvento, "descEvento") ||
        "",
      event_date: getTagText(infEvento, "dhEvento"),
      protocol_number: retEvento ? getTagText(retEvento, "nProt") : "",
      sequence: getTagText(infEvento, "nSeqEvento"),
    },
  };
}

async function applyEventToInvoice(base44, invoice, event) {
  const existingEvents = Array.isArray(invoice.fiscal_events) ? invoice.fiscal_events : [];
  const alreadyExists = existingEvents.some(
    (e) => e.event_type_code === event.event_type_code && (e.sequence || "") === (event.sequence || "")
  );
  if (alreadyExists) return;

  const updateData = { fiscal_events: [...existingEvents, event] };
  if (event.event_type_code === "110111" || event.event_type_code === "110112") {
    updateData.cancelled = true;
    updateData.cancellation_date = event.event_date ? event.event_date.substring(0, 10) : undefined;
    updateData.cancellation_reason = event.description || "Cancelada via evento";
  }
  await base44.asServiceRole.entities.Invoice.update(invoice.id, updateData);
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
    const ev = parseEvento(doc);
    if (!ev.access_key) {
      throw new Error("Evento sem chave de acesso — não foi possível vincular ao documento.");
    }
    return ev;
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
async function importXmlBatchLocal(base44, xmlContents) {
  let success = 0;
  let errors = 0;
  const errorDetails = [];
  const pendingEvents = [];

  for (let i = 0; i < xmlContents.length; i++) {
    try {
      const parsed = parseXmlText(xmlContents[i]);

      // ----- XMLs de evento (cancelamento, CC-e, manifestação, etc.) -----
      if (parsed.__is_event) {
        const target = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
        if (target.length === 0) {
          pendingEvents.push({ index: i, parsed });
          continue;
        }
        await applyEventToInvoice(base44, target[0], parsed.event);
        success++;
        continue;
      }

      parsed.branch_cnpj = parsed.recipient_cnpj;

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

  // Reprocessa eventos cuja nota foi criada depois neste mesmo lote.
  for (const { index, parsed } of pendingEvents) {
    try {
      const target = await base44.asServiceRole.entities.Invoice.filter({ access_key: parsed.access_key });
      if (target.length === 0) {
        errors++;
        errorDetails.push({ index, error: `Evento (${parsed.event.event_type_label}) sem nota correspondente — chave ${parsed.access_key}` });
        continue;
      }
      await applyEventToInvoice(base44, target[0], parsed.event);
      success++;
    } catch (err) {
      errors++;
      errorDetails.push({ index, error: err.message });
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
  let nextLink = `/me/drive/items/${folderId}/children?$select=id,name,file&$top=200`;

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

// Importa em lotes de BATCH_SIZE arquivos por chamada para evitar timeout
const BATCH_SIZE = 10;

async function importFolderById(base44, accessToken, folderId, skip = 0) {
  const allXmlFiles = await listAllXmlFiles(accessToken, folderId);
  const totalFiles = allXmlFiles.length;

  const batch = allXmlFiles.slice(skip, skip + BATCH_SIZE);

  if (batch.length === 0) {
    return {
      success: 0, errors: 0, error_details: [], total: 0,
      processed: 0, remaining: 0, done: true,
    };
  }

  const xmlContents = [];
  const fileErrors = [];

  for (const file of batch) {
    try {
      const content = await downloadFileText(accessToken, file.id);
      xmlContents.push(content);
    } catch (error) {
      fileErrors.push({ error: `${file.name}: ${error.message}` });
    }
  }

  const importResult = xmlContents.length > 0
    ? await importXmlBatchLocal(base44, xmlContents)
    : { success: 0, errors: 0, error_details: [], total: 0 };

  const processed = skip + batch.length;
  const remaining = totalFiles - processed;

  return {
    ...importResult,
    errors: importResult.errors + fileErrors.length,
    error_details: importResult.error_details.concat(
      fileErrors.map((item, index) => ({ index: importResult.total + index, error: item.error }))
    ),
    total: totalFiles,
    processed,
    remaining,
    done: remaining <= 0,
  };
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
      const settings = await getSettings(base44);
      return Response.json({ settings });
    }

    if (action === 'listFolderItems') {
      const data = await listFolderItems(accessToken, parentId);
      return Response.json(data);
    }

    if (action === 'saveSettings') {
      const current = await getSettings(base44);
      const settings = await saveSettings(base44, {
        folder_id: folderId ?? current?.folder_id,
        folder_name: folderName ?? current?.folder_name,
        folder_path: folderPath ?? current?.folder_path,
        auto_sync_enabled: typeof autoSyncEnabled === 'boolean' ? autoSyncEnabled : (current?.auto_sync_enabled || false),
      });
      return Response.json({ settings });
    }

    if (action === 'importFolder') {
      const settings = await getSettings(base44);
      const effectiveFolderId = folderId || settings?.folder_id;
      if (!effectiveFolderId) {
        return Response.json({ error: 'Selecione uma pasta do OneDrive primeiro.' }, { status: 400 });
      }

      const skip = payload.skip || 0;
      const result = await importFolderById(base44, accessToken, effectiveFolderId, skip);

      // Acumula os totais com o que já foi salvo (para chamadas subsequentes)
      const prevSuccess = skip > 0 ? (settings?.last_import_success || 0) : 0;
      const prevErrors = skip > 0 ? (settings?.last_import_errors || 0) : 0;

      const totalSuccess = prevSuccess + (result.success || 0);
      const totalErrors = prevErrors + (result.errors || 0);

      const message = result.done
        ? `Concluído: ${totalSuccess} importada(s), ${totalErrors} erro(s) de ${result.total} arquivo(s)`
        : `Processando: ${result.processed}/${result.total} arquivos...`;

      await saveSettings(base44, {
        folder_id: folderId || settings?.folder_id,
        folder_name: folderName || settings?.folder_name,
        folder_path: folderPath || settings?.folder_path,
        auto_sync_enabled: settings?.auto_sync_enabled || false,
        last_sync_at: new Date().toISOString(),
        last_sync_message: message,
        last_import_total: result.total,
        last_import_success: totalSuccess,
        last_import_errors: totalErrors,
      });
      return Response.json({ ...result, totalSuccess, totalErrors });
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