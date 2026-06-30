import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { DOMParser } from 'npm:xmldom@0.6.0';

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
  // NFS-e tem muitas variações municipais; detectamos por tags comuns.
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
    is_cancellation: tpEvento === "110111" || tpEvento === "110112" || tpEvento === "110180" || tpEvento === "610111",
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
  const emitEnderEmi = emit?.getElementsByTagName("enderEmit")[0];
  const supplierAddress = emitEnderEmi ? getTagText(emitEnderEmi, "xLgr") : "";
  const supplierNumber = emitEnderEmi ? getTagText(emitEnderEmi, "nro") : "";
  const supplierDistrict = emitEnderEmi ? getTagText(emitEnderEmi, "xBairro") : "";
  const supplierCity = emitEnderEmi ? getTagText(emitEnderEmi, "xMun") : "";
  const supplierState = emitEnderEmi ? getTagText(emitEnderEmi, "UF") : "";
  const supplierZip = emitEnderEmi ? getTagText(emitEnderEmi, "CEP") : "";
  const supplierPhone = emitEnderEmi ? getTagText(emitEnderEmi, "fone") : "";
  const supplierEmail = emit ? getTagText(emit, "email") : "";

  const dest = inf.getElementsByTagName("dest")[0];
  const recipientName = getTagText(dest, "xNome");
  const recipientCnpj = getTagText(dest, "CNPJ");
  const recipientIe = getTagText(dest, "IE");
  const destEnder = dest?.getElementsByTagName("enderDest")[0];
  const recipientAddress = destEnder ? getTagText(destEnder, "xLgr") : "";
  const recipientNumber = destEnder ? getTagText(destEnder, "nro") : "";
  const recipientDistrict = destEnder ? getTagText(destEnder, "xBairro") : "";
  const recipientCity = destEnder ? getTagText(destEnder, "xMun") : "";
  const recipientState = destEnder ? getTagText(destEnder, "UF") : "";
  const recipientZip = destEnder ? getTagText(destEnder, "CEP") : "";

  const total = inf.getElementsByTagName("total")[0];
  const ICMSTot = total?.getElementsByTagName("ICMSTot")[0];
  const totalValue = parseFloat(getTagText(ICMSTot, "vNF")) || 0;
  const totalICMS = parseFloat(getTagText(ICMSTot, "vICMS")) || 0;
  const totalIPI = parseFloat(getTagText(ICMSTot, "vIPI")) || 0;
  const totalPIS = parseFloat(getTagText(ICMSTot, "vPIS")) || 0;
  const totalCOFINS = parseFloat(getTagText(ICMSTot, "vCOFINS")) || 0;
  const totalProducts = parseFloat(getTagText(ICMSTot, "vProd")) || 0;
  const totalFreight = parseFloat(getTagText(ICMSTot, "vFrete")) || 0;
  const totalInsurance = parseFloat(getTagText(ICMSTot, "vSeg")) || 0;
  const totalDiscount = parseFloat(getTagText(ICMSTot, "vDesc")) || 0;
  const totalOtherCharges = parseFloat(getTagText(ICMSTot, "vOutro")) || 0;
  const taxIcmsBase = parseFloat(getTagText(ICMSTot, "vBC")) || 0;
  const taxIpiBase = parseFloat(getTagText(ICMSTot, "vBCIPI")) || 0;

  const cobr = inf.getElementsByTagName("cobr")[0];
  const dupElements = cobr?.getElementsByTagName("dup") || [];
  const installments = [];
  let dueDate = "";
  for (let i = 0; i < dupElements.length; i++) {
    const dup = dupElements[i];
    const nDup = getTagText(dup, "nDup");
    const dVenc = getTagText(dup, "dVenc");
    const vDup = parseFloat(getTagText(dup, "vDup")) || 0;
    if (dVenc) {
      const normalized = dVenc.substring(0, 10);
      installments.push({ number: nDup || `${i + 1}`, due_date: normalized, value: vDup });
      if (i === 0) dueDate = normalized;
    }
  }

  const infAdic = inf.getElementsByTagName("infAdic")[0];
  const complementInfo = getTagText(infAdic, "infCpl") || "";

  const detElements = inf.getElementsByTagName("det");
  const items = [];
  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName("prod")[0];
    if (prod) {
      const code = getTagText(prod, "cProd");
      const description = getTagText(prod, "xProd");
      const unit = getTagText(prod, "uCom");
      const quantity = parseFloat(getTagText(prod, "qCom")) || 0;
      const unitValue = parseFloat(getTagText(prod, "vUnCom")) || 0;
      const itemTotal = parseFloat(getTagText(prod, "vProd")) || 0;
      const ncm = getTagText(prod, "NCM");
      const cfop = getTagText(prod, "CFOP");
      const imposto = det.getElementsByTagName("imposto")[0];
      const icmsEl = imposto?.getElementsByTagName("ICMS")[0];
      const icmsGroup = icmsEl?.childNodes ? Array.from(icmsEl.childNodes).find(n => n.tagName) : null;
      const icmsOrigin = icmsGroup ? getTagText(icmsGroup, "orig") : "";
      const icmsSituation = icmsGroup ? (icmsGroup.tagName || "").replace(/^ICMS/, "") : "";
      items.push({ code, description, unit, quantity, unit_value: unitValue, total: itemTotal, ncm, cfop, icms_origin: icmsOrigin, icms_situation: icmsSituation });
    }
  }

  let formattedDate = issueDate ? issueDate.substring(0, 10) : "";

  const pag = inf.getElementsByTagName("pag")[0];
  const payments = [];
  if (pag) {
    const detPagElements = pag.getElementsByTagName("detPag");
    for (let i = 0; i < detPagElements.length; i++) {
      const detPag = detPagElements[i];
      const tPag = getTagText(detPag, "tPag");
      const vPag = parseFloat(getTagText(detPag, "vPag")) || 0;
      const paymentObj = { payment_type: tPag, value: vPag };
      const card = detPag.getElementsByTagName("card")[0];
      if (card) {
        paymentObj.card_type = getTagText(card, "tpIntegra");
        paymentObj.card_network = getTagText(card, "CNPJ");
        paymentObj.installments = parseInt(getTagText(card, "nParcela")) || 1;
        paymentObj.authorization_number = getTagText(card, "nAut");
        paymentObj.network_authorization = getTagText(card, "nAutOrig");
      }
      const cnpjPg = getTagText(detPag, "CNPJ");
      if (cnpjPg && !paymentObj.card_network) paymentObj.processing_cnpj = cnpjPg;
      payments.push(paymentObj);
    }
  }

  let protNum = "";
  let protDate = "";
  const protNFe = doc.getElementsByTagName("protNFe")[0];
  if (protNFe) {
    protNum = getTagText(protNFe, "nProt");
    const dhRecbto = getTagText(protNFe, "dhRecbto") || getTagText(protNFe, "dRecbto");
    if (dhRecbto) protDate = dhRecbto.substring(0, 10);
  }

  return {
    document_type: "nfe",
    number, series, access_key: accessKey, operation_nature: operationNature,
    supplier_name: supplierName, supplier_cnpj: supplierCnpj, supplier_ie: supplierIe,
    supplier_address: supplierAddress, supplier_number: supplierNumber, supplier_district: supplierDistrict,
    supplier_city: supplierCity, supplier_state: supplierState, supplier_zip: supplierZip,
    supplier_phone: supplierPhone, supplier_email: supplierEmail,
    recipient_name: recipientName, recipient_cnpj: recipientCnpj, recipient_ie: recipientIe,
    recipient_address: recipientAddress, recipient_number: recipientNumber, recipient_district: recipientDistrict,
    recipient_city: recipientCity, recipient_state: recipientState, recipient_zip: recipientZip,
    total_value: totalValue, issue_date: formattedDate, due_date: dueDate,
    items, status: "pendente",
    tax_icms: totalICMS, tax_ipi: totalIPI, tax_pis: totalPIS, tax_cofins: totalCOFINS,
    tax_icms_base: taxIcmsBase, tax_ipi_base: taxIpiBase,
    total_products: totalProducts, total_freight: totalFreight, total_insurance: totalInsurance,
    total_discount: totalDiscount, total_other_charges: totalOtherCharges,
    additional_info: complementInfo, installments, protocol_number: protNum, protocol_date: protDate, payments,
  };
}

function parseCTe(doc) {
  const inf = doc.getElementsByTagName("infCte")[0];

  const ide = inf.getElementsByTagName("ide")[0];
  const number = getTagText(ide, "nCT");
  const series = getTagText(ide, "serie");
  const issueDate = getTagText(ide, "dhEmi") || getTagText(ide, "dEmi");
  const natOp = getTagText(ide, "natOp");
  const cfop = getTagText(ide, "CFOP");
  const modal = getTagText(ide, "modal");

  let accessKey = "";
  const infId = inf.getAttribute("Id") || "";
  if (infId.startsWith("CTe")) accessKey = infId.substring(3);
  if (!accessKey) {
    const protCTe = doc.getElementsByTagName("protCTe")[0];
    if (protCTe) accessKey = getTagText(protCTe, "chCTe");
  }

  // Emitente
  const emit = inf.getElementsByTagName("emit")[0];
  const supplierName = getTagText(emit, "xNome") || getTagText(emit, "xFant");
  const supplierCnpj = getTagText(emit, "CNPJ");
  const supplierIe = getTagText(emit, "IE");
  const emitEnder = emit?.getElementsByTagName("enderEmit")[0];
  const supplierAddress = emitEnder ? getTagText(emitEnder, "xLgr") : "";
  const supplierNumber = emitEnder ? getTagText(emitEnder, "nro") : "";
  const supplierDistrict = emitEnder ? getTagText(emitEnder, "xBairro") : "";
  const supplierCity = emitEnder ? getTagText(emitEnder, "xMun") : "";
  const supplierState = emitEnder ? getTagText(emitEnder, "UF") : "";
  const supplierZip = emitEnder ? getTagText(emitEnder, "CEP") : "";
  const supplierPhone = emitEnder ? getTagText(emitEnder, "fone") : "";

  // Destinatário (no CT-e fica como dest)
  const dest = inf.getElementsByTagName("dest")[0];
  const recipientName = getTagText(dest, "xNome");
  const recipientCnpj = getTagText(dest, "CNPJ") || getTagText(dest, "CPF");
  const recipientIe = getTagText(dest, "IE");
  const destEnder = dest?.getElementsByTagName("enderDest")[0];
  const recipientAddress = destEnder ? getTagText(destEnder, "xLgr") : "";
  const recipientNumber = destEnder ? getTagText(destEnder, "nro") : "";
  const recipientDistrict = destEnder ? getTagText(destEnder, "xBairro") : "";
  const recipientCity = destEnder ? getTagText(destEnder, "xMun") : "";
  const recipientState = destEnder ? getTagText(destEnder, "UF") : "";
  const recipientZip = destEnder ? getTagText(destEnder, "CEP") : "";

  // Valores
  const vPrest = inf.getElementsByTagName("vPrest")[0];
  const totalValue = parseFloat(getTagText(vPrest, "vTPrest")) || 0;

  const icmsGroup = inf.getElementsByTagName("imp")[0];
  const totalICMS = parseFloat(getTagText(icmsGroup, "vICMS")) || 0;
  const icmsBase = parseFloat(getTagText(icmsGroup, "vBC")) || 0;

  // Observações
  const compl = inf.getElementsByTagName("compl")[0];
  const observation = getTagText(compl, "xObs");

  let formattedDate = issueDate ? issueDate.substring(0, 10) : "";

  let protNum = "";
  let protDate = "";
  const protCTe = doc.getElementsByTagName("protCTe")[0];
  if (protCTe) {
    protNum = getTagText(protCTe, "nProt");
    const dhRecbto = getTagText(protCTe, "dhRecbto");
    if (dhRecbto) protDate = dhRecbto.substring(0, 10);
  }

  return {
    document_type: "cte",
    number, series, access_key: accessKey,
    operation_nature: natOp,
    cte_cfop: cfop,
    cte_modal: modal,
    supplier_name: supplierName, supplier_cnpj: supplierCnpj, supplier_ie: supplierIe,
    supplier_address: supplierAddress, supplier_number: supplierNumber, supplier_district: supplierDistrict,
    supplier_city: supplierCity, supplier_state: supplierState, supplier_zip: supplierZip,
    supplier_phone: supplierPhone,
    recipient_name: recipientName, recipient_cnpj: recipientCnpj, recipient_ie: recipientIe,
    recipient_address: recipientAddress, recipient_number: recipientNumber, recipient_district: recipientDistrict,
    recipient_city: recipientCity, recipient_state: recipientState, recipient_zip: recipientZip,
    total_value: totalValue,
    issue_date: formattedDate,
    due_date: "",
    status: "pendente",
    tax_icms: totalICMS,
    tax_icms_base: icmsBase,
    service_description: observation,
    protocol_number: protNum,
    protocol_date: protDate,
    items: [],
    installments: [],
    payments: [],
  };
}

function parseNFSeNacional(doc) {
  const inf = doc.getElementsByTagName("infNFSe")[0];

  const number = getTagText(inf, "nNFSe");
  const accessKey = (inf.getAttribute("Id") || "").replace(/^NFS/, "");

  const issueDateRaw = getTagText(inf, "dhProc") || getTagText(inf, "dhEmi");
  const issueDate = issueDateRaw ? issueDateRaw.substring(0, 10) : "";

  // Emitente / Prestador
  const emit = inf.getElementsByTagName("emit")[0];
  const supplierName = getTagText(emit, "xNome");
  const supplierCnpj = getTagText(emit, "CNPJ") || getTagText(emit, "CPF");
  const supplierIe = getTagText(emit, "IM");
  const emitEnder = emit?.getElementsByTagName("enderNac")[0];
  const supplierAddress = emitEnder ? getTagText(emitEnder, "xLgr") : "";
  const supplierNumber = emitEnder ? getTagText(emitEnder, "nro") : "";
  const supplierDistrict = emitEnder ? getTagText(emitEnder, "xBairro") : "";
  const supplierCity = getTagText(inf, "xLocEmi");
  const supplierState = emitEnder ? getTagText(emitEnder, "UF") : "";
  const supplierZip = emitEnder ? getTagText(emitEnder, "CEP") : "";
  const supplierPhone = getTagText(emit, "fone");
  const supplierEmail = getTagText(emit, "email");

  // Tomador
  const toma = inf.getElementsByTagName("toma")[0];
  const recipientName = getTagText(toma, "xNome");
  const recipientCnpj = getTagText(toma, "CNPJ") || getTagText(toma, "CPF");
  const tomaEnd = toma?.getElementsByTagName("end")[0];
  const recipientAddress = tomaEnd ? getTagText(tomaEnd, "xLgr") : "";
  const recipientNumber = tomaEnd ? getTagText(tomaEnd, "nro") : "";
  const recipientDistrict = tomaEnd ? getTagText(tomaEnd, "xBairro") : "";
  const tomaEndNac = tomaEnd?.getElementsByTagName("endNac")[0];
  const recipientZip = tomaEndNac ? getTagText(tomaEndNac, "CEP") : (tomaEnd ? getTagText(tomaEnd, "CEP") : "");
  const recipientState = tomaEnd ? getTagText(tomaEnd, "UF") : "";
  const recipientCity = getTagText(inf, "xLocPrestacao") || getTagText(inf, "xLocIncid");

  // Valores (nó <valores> direto sob infNFSe)
  const valoresEls = inf.getElementsByTagName("valores");
  const valores = valoresEls[0];
  const totalValue = parseFloat(getTagText(valores, "vLiq") || getTagText(valores, "vBC")) || 0;
  const taxIss = parseFloat(getTagText(valores, "vISSQN")) || 0;

  // Descrição do serviço
  const serv = inf.getElementsByTagName("serv")[0];
  const serviceDescription = getTagText(serv, "xDescServ") || getTagText(inf, "xTribNac");

  const dps = inf.getElementsByTagName("infDPS")[0];
  const series = dps ? getTagText(dps, "serie") : "";

  return {
    document_type: "nfse",
    number: number || "",
    series,
    access_key: accessKey,
    supplier_name: supplierName,
    supplier_cnpj: supplierCnpj,
    supplier_ie: supplierIe,
    supplier_address: supplierAddress,
    supplier_number: supplierNumber,
    supplier_district: supplierDistrict,
    supplier_city: supplierCity,
    supplier_state: supplierState,
    supplier_zip: supplierZip,
    supplier_phone: supplierPhone,
    supplier_email: supplierEmail,
    recipient_name: recipientName,
    recipient_cnpj: recipientCnpj,
    recipient_address: recipientAddress,
    recipient_number: recipientNumber,
    recipient_district: recipientDistrict,
    recipient_city: recipientCity,
    recipient_state: recipientState,
    recipient_zip: recipientZip,
    total_value: totalValue,
    issue_date: issueDate,
    due_date: "",
    status: "pendente",
    tax_iss: taxIss,
    service_description: serviceDescription,
    items: [],
    installments: [],
    payments: [],
  };
}

function parseNFSe(doc) {
  // Padrão nacional possui <infNFSe>; demais são variações municipais.
  if (doc.getElementsByTagName("infNFSe").length > 0) {
    return parseNFSeNacional(doc);
  }
  // Acessa nó relevante; cobre as variações mais comuns dos padrões municipais.
  const infRoot = doc.getElementsByTagName("InfNfse")[0]
    || doc.getElementsByTagName("Nfse")[0]
    || doc.getElementsByTagName("InfDeclaracaoPrestacaoServico")[0]
    || doc.getElementsByTagName("CompNfse")[0]
    || doc.getElementsByTagName("Rps")[0]
    || doc.documentElement;

  const number = getTagText(infRoot, "Numero")
    || getTagText(infRoot, "NumeroNfse")
    || getTagText(infRoot, "Nro");
  const series = getTagText(infRoot, "Serie") || "";
  const issueDateRaw = getTagText(infRoot, "DataEmissao") || getTagText(infRoot, "DataEmissaoRps");
  const issueDate = issueDateRaw ? issueDateRaw.substring(0, 10) : "";

  const accessKey = getTagText(infRoot, "CodigoVerificacao");

  // Prestador
  const prestador = doc.getElementsByTagName("PrestadorServico")[0]
    || doc.getElementsByTagName("Prestador")[0]
    || doc.getElementsByTagName("IdentificacaoPrestador")[0];
  const supplierName = getTagText(prestador, "RazaoSocial") || getTagText(prestador, "Nome");
  const supplierCnpj = getTagText(prestador, "Cnpj") || getTagText(prestador, "CNPJ");
  const supplierIe = getTagText(prestador, "InscricaoMunicipal");
  const prestEnder = prestador?.getElementsByTagName("Endereco")[0];
  const supplierAddress = prestEnder ? getTagText(prestEnder, "Endereco") || getTagText(prestEnder, "Logradouro") : "";
  const supplierNumber = prestEnder ? getTagText(prestEnder, "Numero") : "";
  const supplierDistrict = prestEnder ? getTagText(prestEnder, "Bairro") : "";
  const supplierCity = prestEnder ? getTagText(prestEnder, "Cidade") || getTagText(prestEnder, "CodigoMunicipio") : "";
  const supplierState = prestEnder ? getTagText(prestEnder, "Uf") || getTagText(prestEnder, "UF") || getTagText(prestEnder, "Estado") : "";
  const supplierZip = prestEnder ? getTagText(prestEnder, "Cep") || getTagText(prestEnder, "CEP") : "";

  // Tomador
  const tomador = doc.getElementsByTagName("TomadorServico")[0]
    || doc.getElementsByTagName("Tomador")[0]
    || doc.getElementsByTagName("IdentificacaoTomador")[0];
  const recipientName = getTagText(tomador, "RazaoSocial") || getTagText(tomador, "Nome");
  const recipientCnpj = getTagText(tomador, "Cnpj") || getTagText(tomador, "CNPJ") || getTagText(tomador, "Cpf") || getTagText(tomador, "CPF");
  const tomEnder = tomador?.getElementsByTagName("Endereco")[0];
  const recipientAddress = tomEnder ? getTagText(tomEnder, "Endereco") || getTagText(tomEnder, "Logradouro") : "";
  const recipientNumber = tomEnder ? getTagText(tomEnder, "Numero") : "";
  const recipientDistrict = tomEnder ? getTagText(tomEnder, "Bairro") : "";
  const recipientCity = tomEnder ? getTagText(tomEnder, "Cidade") || getTagText(tomEnder, "CodigoMunicipio") : "";
  const recipientState = tomEnder ? getTagText(tomEnder, "Uf") || getTagText(tomEnder, "UF") || getTagText(tomEnder, "Estado") : "";
  const recipientZip = tomEnder ? getTagText(tomEnder, "Cep") || getTagText(tomEnder, "CEP") : "";

  // Serviço/valores
  const servico = doc.getElementsByTagName("Servico")[0];
  const valores = servico?.getElementsByTagName("Valores")[0] || doc.getElementsByTagName("Valores")[0];
  const totalValue = parseFloat(
    getTagText(valores, "ValorLiquidoNfse")
    || getTagText(valores, "ValorServicos")
    || getTagText(valores, "ValorTotal")
  ) || 0;
  const taxIss = parseFloat(getTagText(valores, "ValorIss")) || 0;
  const taxPis = parseFloat(getTagText(valores, "ValorPis")) || 0;
  const taxCofins = parseFloat(getTagText(valores, "ValorCofins")) || 0;

  const serviceDescription = getTagText(servico, "Discriminacao");

  return {
    document_type: "nfse",
    number: number || "",
    series,
    access_key: accessKey,
    supplier_name: supplierName,
    supplier_cnpj: supplierCnpj,
    supplier_ie: supplierIe,
    supplier_address: supplierAddress,
    supplier_number: supplierNumber,
    supplier_district: supplierDistrict,
    supplier_city: supplierCity,
    supplier_state: supplierState,
    supplier_zip: supplierZip,
    recipient_name: recipientName,
    recipient_cnpj: recipientCnpj,
    recipient_address: recipientAddress,
    recipient_number: recipientNumber,
    recipient_district: recipientDistrict,
    recipient_city: recipientCity,
    recipient_state: recipientState,
    recipient_zip: recipientZip,
    total_value: totalValue,
    issue_date: issueDate,
    due_date: "",
    status: "pendente",
    tax_iss: taxIss,
    tax_pis: taxPis,
    tax_cofins: taxCofins,
    service_description: serviceDescription,
    items: [],
    installments: [],
    payments: [],
  };
}

function cleanXmlText(xmlText) {
  if (typeof xmlText !== "string") return "";
  // Remove BOM e espaços/caracteres antes do início do XML (<?xml ... ou <tag)
  let cleaned = xmlText.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  const firstTag = cleaned.indexOf("<");
  if (firstTag > 0) cleaned = cleaned.substring(firstTag);
  return cleaned;
}

function parseXmlDocument(xmlText) {
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

// Aplica um evento já aprovado a um documento existente. Grava o evento no
// histórico (sem duplicar) e, se for cancelamento, marca a nota como cancelada.
async function applyEventToInvoice(base44, invoice, ev) {
  const events = Array.isArray(invoice.fiscal_events) ? invoice.fiscal_events : [];
  const already = events.some((e) =>
    e.type === ev.event_type &&
    e.date === ev.event_date &&
    (e.protocol || "") === (ev.protocol || "")
  );
  if (already) return false;

  events.push({
    type: ev.event_type,
    label: ev.event_label,
    description: ev.description,
    date: ev.event_date,
    protocol: ev.protocol,
  });

  const updateData = { fiscal_events: events };
  if (ev.is_cancellation) {
    updateData.cancelled = true;
    updateData.cancellation_date = ev.event_date || new Date().toISOString().split("T")[0];
    updateData.cancellation_reason = ev.description || ev.event_label;
  }

  await base44.asServiceRole.entities.Invoice.update(invoice.id, updateData);
  return true;
}

// Registra um evento pendente para aprovação manual (não duplica se já existir
// um pendente igual).
async function registerPendingEvent(base44, ev, invoice) {
  const existing = await base44.asServiceRole.entities.PendingFiscalEvent.filter({
    access_key: ev.access_key,
    event_type: ev.event_type,
    status: "pendente",
  });
  const dup = existing.some((p) =>
    (p.event_date || "") === (ev.event_date || "") &&
    (p.protocol || "") === (ev.protocol || "")
  );
  if (dup) return false;

  await base44.asServiceRole.entities.PendingFiscalEvent.create({
    access_key: ev.access_key,
    event_type: ev.event_type,
    event_label: ev.event_label,
    description: ev.description,
    event_date: ev.event_date,
    protocol: ev.protocol,
    is_cancellation: ev.is_cancellation,
    document_exists: !!invoice,
    document_number: invoice?.number || "",
    supplier_name: invoice?.supplier_name || "",
    status: "pendente",
  });
  return true;
}

// Processa um evento durante a importação:
// - Cancelamento com nota existente → aplica direto.
// - Demais eventos → ficam pendentes de aprovação.
// - Evento sem nota (órfão) → fica pendente; será aplicado quando a nota entrar.
async function processEvent(base44, ev) {
  const docs = await base44.asServiceRole.entities.Invoice.filter({ access_key: ev.access_key });
  const invoice = docs[0] || null;

  if (ev.is_cancellation && invoice) {
    const applied = await applyEventToInvoice(base44, invoice, ev);
    return { applied, pending: false };
  }

  const registered = await registerPendingEvent(base44, ev, invoice);
  return { applied: false, pending: registered };
}

// ---------- Trava global de importação (evita gravações simultâneas) ----------
// Stale após 90s: se um processo travar/morrer sem liberar (ex.: usuário fecha
// a aba no meio do upload), a trava expira rápido e não bloqueia novas importações.
// Uploads longos renovam a trava via heartbeat a cada lote, então 90s é seguro.
const LOCK_STALE_MS = 90 * 1000;

async function getImportSettings(base44) {
  const settings = await base44.asServiceRole.entities.OneDriveImportSettings.filter({ key: "default" });
  return settings[0] || null;
}

async function acquireImportLock(base44, source) {
  const settings = await getImportSettings(base44);
  if (settings?.import_locked) {
    const lockedAt = settings.import_lock_at ? new Date(settings.import_lock_at).getTime() : 0;
    if (Date.now() - lockedAt < LOCK_STALE_MS) {
      return { ok: false, source: settings.import_lock_source || "outra" };
    }
  }
  if (!settings) {
    await base44.asServiceRole.entities.OneDriveImportSettings.create({
      key: "default", import_locked: true, import_lock_source: source, import_lock_at: new Date().toISOString(),
    });
    return { ok: true };
  }
  await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
    import_locked: true, import_lock_source: source, import_lock_at: new Date().toISOString(),
  });
  return { ok: true };
}

async function releaseImportLock(base44) {
  const settings = await getImportSettings(base44);
  if (settings) {
    await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
      import_locked: false, import_lock_source: null,
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { xml_contents, action, keep_lock } = body;

    // Ações dedicadas de trava: o upload em vários lotes adquire a trava UMA vez
    // no início e libera só no fim, em vez de travar/destravar a cada lote.
    if (action === "lock") {
      const lock = await acquireImportLock(base44, "upload");
      if (!lock.ok) {
        return Response.json({
          error: `Já existe uma importação em andamento (${lock.source}). Aguarde concluir antes de iniciar outra.`,
          import_busy: true,
        }, { status: 409 });
      }
      return Response.json({ locked: true });
    }
    if (action === "unlock") {
      await releaseImportLock(base44);
      return Response.json({ unlocked: true });
    }
    // Renova o timestamp da trava durante um upload longo: enquanto os lotes
    // chegam, a trava continua "fresca". Se a aba morrer, os heartbeats param e
    // a trava expira sozinha rapidamente, sem bloquear novas importações.
    if (action === "heartbeat") {
      const settings = await getImportSettings(base44);
      if (settings?.import_locked) {
        await base44.asServiceRole.entities.OneDriveImportSettings.update(settings.id, {
          import_lock_at: new Date().toISOString(),
        });
      }
      return Response.json({ ok: true });
    }

    if (!xml_contents || !Array.isArray(xml_contents)) {
      return Response.json({ error: "xml_contents deve ser um array de strings XML" }, { status: 400 });
    }

    // Se keep_lock=true, a trava é gerida pelo cliente (ações lock/unlock) e este
    // lote não toca na trava. Caso contrário, mantém o comportamento de lote único.
    let acquiredHere = false;
    if (!keep_lock) {
      const lock = await acquireImportLock(base44, "upload");
      if (!lock.ok) {
        return Response.json({
          error: `Já existe uma importação em andamento (${lock.source}). Aguarde concluir antes de iniciar outra.`,
          import_busy: true,
        }, { status: 409 });
      }
      acquiredHere = true;
    }

    try {
      const errors = [];

      // 1) Parse de todos os XMLs em memória (sem tocar no banco).
      //    Eventos (cancelamento, CC-e, etc.) são separados dos documentos.
      const parsedDocs = [];
      const parsedEvents = [];
      for (let i = 0; i < xml_contents.length; i++) {
        try {
          const parsed = parseXmlDocument(xml_contents[i]);
          if (parsed.is_event) {
            parsedEvents.push({ index: i, parsed });
            continue;
          }
          parsed.branch_cnpj = parsed.recipient_cnpj;
          parsedDocs.push({ index: i, parsed });
        } catch (err) {
          errors.push({ index: i, error: err.message });
        }
      }

      // 2) Verifica duplicados de forma DIRECIONADA: em vez de recarregar toda a
      //    base a cada lote (que ficava cada vez mais lento e estourava o tempo da
      //    função), consultamos apenas as chaves de acesso presentes neste lote.
      const batchAccessKeys = [...new Set(parsedDocs.map(d => d.parsed.access_key).filter(Boolean))];

      const existingAK = new Set();
      const deletedAK = new Set();
      const lookupChunk = 50;
      for (let i = 0; i < batchAccessKeys.length; i += lookupChunk) {
        const slice = batchAccessKeys.slice(i, i + lookupChunk);
        const [inv, del] = await Promise.all([
          base44.asServiceRole.entities.Invoice.filter({ access_key: { $in: slice } }),
          base44.asServiceRole.entities.DeletedInvoiceKey.filter({ access_key: { $in: slice } }),
        ]);
        inv.forEach(r => r.access_key && existingAK.add(r.access_key));
        del.forEach(r => r.access_key && deletedAK.add(r.access_key));
      }

      const isInSet = (akSet, parsed) => parsed.access_key && akSet.has(parsed.access_key);
      const existingKeys = existingAK;
      const deletedKeys = deletedAK;

      // 3) Filtra em memória: descarta duplicados e excluídos. Dedupe também
      //    dentro do próprio lote (XMLs repetidos no mesmo upload).
      const toCreate = [];
      const seenInBatch = new Set();
      for (const { index, parsed } of parsedDocs) {
        if (isInSet(deletedKeys, parsed)) {
          errors.push({ index, error: `Documento #${parsed.number} foi excluído e não será reimportado` });
          continue;
        }
        if (isInSet(existingKeys, parsed)) {
          errors.push({ index, error: `Documento #${parsed.number} já importado` });
          continue;
        }
        const dedupeKey = parsed.access_key || `${parsed.number}|${parsed.supplier_cnpj}`;
        if (dedupeKey && seenInBatch.has(dedupeKey)) {
          errors.push({ index, error: `Documento #${parsed.number} duplicado no lote` });
          continue;
        }
        if (dedupeKey) seenInBatch.add(dedupeKey);
        toCreate.push(parsed);
      }

      // 4) Cria em lotes via bulkCreate — 1 chamada por ~100 notas em vez de
      //    1 chamada por nota, eliminando o gargalo de rate limit.
      let success = 0;
      const chunkSize = 100;
      const createdKeys = [];
      for (let i = 0; i < toCreate.length; i += chunkSize) {
        const chunk = toCreate.slice(i, i + chunkSize);
        try {
          await base44.asServiceRole.entities.Invoice.bulkCreate(chunk);
          success += chunk.length;
          chunk.forEach((c) => c.access_key && createdKeys.push(c.access_key));
        } catch (err) {
          errors.push({ index: -1, error: `Falha ao gravar lote: ${err.message}` });
        }
        if (i + chunkSize < toCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 4b) Aplica CANCELAMENTOS pendentes (órfãos) cujas notas acabaram de entrar.
      //     Cancelamento aplica direto; os demais eventos pendentes continuam
      //     aguardando aprovação manual mesmo após a nota existir.
      if (createdKeys.length > 0) {
        for (let i = 0; i < createdKeys.length; i += 50) {
          const slice = createdKeys.slice(i, i + 50);
          const pendings = await base44.asServiceRole.entities.PendingFiscalEvent.filter({
            access_key: { $in: slice }, status: "pendente", is_cancellation: true,
          });
          for (const p of pendings) {
            const docs = await base44.asServiceRole.entities.Invoice.filter({ access_key: p.access_key });
            if (docs[0]) {
              await applyEventToInvoice(base44, docs[0], {
                event_type: p.event_type, event_label: p.event_label, description: p.description,
                event_date: p.event_date, protocol: p.protocol, is_cancellation: true,
              });
              await base44.asServiceRole.entities.PendingFiscalEvent.update(p.id, { status: "aprovado" });
            }
          }
        }
      }

      // 5) Processa os eventos (após criar os documentos do lote, para que
      //    cancelamentos de notas recém-criadas também sejam aplicados).
      let eventsApplied = 0;
      let eventsPending = 0;
      for (const { index, parsed } of parsedEvents) {
        try {
          const res = await processEvent(base44, parsed);
          if (res.applied) eventsApplied++;
          else if (res.pending) eventsPending++;
        } catch (err) {
          errors.push({ index, error: `Evento: ${err.message}` });
        }
      }

      return Response.json({
        success,
        errors: errors.length,
        error_details: errors,
        total: xml_contents.length,
        events_applied: eventsApplied,
        events_pending: eventsPending,
      });
    } finally {
      if (acquiredHere) {
        await releaseImportLock(base44);
      }
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});