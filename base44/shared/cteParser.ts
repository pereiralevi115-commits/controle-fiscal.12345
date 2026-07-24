function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function num(value) {
  const parsed = parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function first(parent, tagName) {
  return parent?.getElementsByTagName(tagName)?.[0] || null;
}

function findAddressNode(party) {
  if (!party) return null;
  const candidates = ["enderReme", "enderDest", "enderExped", "enderReceb", "enderToma", "enderEmit"];
  for (const tag of candidates) {
    const node = first(party, tag);
    if (node) return node;
  }
  const children = Array.from(party.childNodes || []);
  return children.find((node) => node.tagName && String(node.tagName).startsWith("ender")) || null;
}

function partyFromNode(node, getTagText) {
  const address = findAddressNode(node);
  return {
    name: getTagText(node, "xNome") || getTagText(node, "xFant"),
    cnpj: getTagText(node, "CNPJ") || getTagText(node, "CPF"),
    ie: getTagText(node, "IE"),
    address: address ? getTagText(address, "xLgr") : "",
    number: address ? getTagText(address, "nro") : "",
    district: address ? getTagText(address, "xBairro") : "",
    city: address ? getTagText(address, "xMun") : "",
    state: address ? getTagText(address, "UF") : "",
    zip: address ? getTagText(address, "CEP") : "",
    phone: getTagText(node, "fone") || (address ? getTagText(address, "fone") : ""),
  };
}

function prefix(prefixName, party) {
  return {
    [`${prefixName}_name`]: party.name,
    [`${prefixName}_cnpj`]: party.cnpj,
    [`${prefixName}_ie`]: party.ie,
    [`${prefixName}_address`]: party.address,
    [`${prefixName}_number`]: party.number,
    [`${prefixName}_district`]: party.district,
    [`${prefixName}_city`]: party.city,
    [`${prefixName}_state`]: party.state,
    [`${prefixName}_zip`]: party.zip,
    [`${prefixName}_phone`]: party.phone,
  };
}

function getTaker(inf, ide, parties, getTagText) {
  const toma4 = first(ide, "toma4");
  if (toma4) {
    return { type: "outros", ...partyFromNode(toma4, getTagText) };
  }

  const toma3 = first(ide, "toma3");
  const code = getTagText(toma3, "toma") || getTagText(ide, "toma3");
  const map = {
    "0": ["remetente", parties.rem],
    "1": ["expedidor", parties.exped],
    "2": ["recebedor", parties.receb],
    "3": ["destinatario", parties.dest],
  };
  const selected = map[code];
  if (!selected) return { type: "", name: "", cnpj: "", ie: "", address: "", number: "", district: "", city: "", state: "", zip: "", phone: "" };
  return { type: selected[0], ...selected[1] };
}

function extractFreightComponents(vPrest, getTagText) {
  const comps = [];
  const nodes = vPrest?.getElementsByTagName("Comp") || [];
  for (let i = 0; i < nodes.length; i++) {
    comps.push({
      name: getTagText(nodes[i], "xNome"),
      value: num(getTagText(nodes[i], "vComp")),
    });
  }
  return comps.filter((item) => item.name || item.value);
}

function extractOriginDocuments(inf, getTagText) {
  const docs = [];
  const infDoc = first(inf, "infDoc");
  if (!infDoc) return docs;

  const nfeNodes = infDoc.getElementsByTagName("infNFe") || [];
  for (let i = 0; i < nfeNodes.length; i++) {
    docs.push({
      document_type: "NF-e",
      access_key: getTagText(nfeNodes[i], "chave") || getTagText(nfeNodes[i], "chNFe"),
      number: getTagText(nfeNodes[i], "nDoc"),
      series: getTagText(nfeNodes[i], "serie"),
      issuer_cnpj: getTagText(nfeNodes[i], "CNPJ"),
      issue_date: (getTagText(nfeNodes[i], "dEmi") || "").substring(0, 10),
      value: num(getTagText(nfeNodes[i], "vNF")),
    });
  }

  const nfNodes = infDoc.getElementsByTagName("infNF") || [];
  for (let i = 0; i < nfNodes.length; i++) {
    docs.push({
      document_type: getTagText(nfNodes[i], "mod") || "NF",
      access_key: "",
      number: getTagText(nfNodes[i], "nDoc"),
      series: getTagText(nfNodes[i], "serie"),
      issuer_cnpj: getTagText(nfNodes[i], "CNPJ"),
      issue_date: (getTagText(nfNodes[i], "dEmi") || "").substring(0, 10),
      value: num(getTagText(nfNodes[i], "vNF")),
    });
  }

  const outrosNodes = infDoc.getElementsByTagName("infOutros") || [];
  for (let i = 0; i < outrosNodes.length; i++) {
    docs.push({
      document_type: getTagText(outrosNodes[i], "tpDoc") || "Outros",
      access_key: "",
      number: getTagText(outrosNodes[i], "nDoc"),
      series: getTagText(outrosNodes[i], "serie"),
      issuer_cnpj: getTagText(outrosNodes[i], "CNPJ"),
      issue_date: (getTagText(outrosNodes[i], "dEmi") || "").substring(0, 10),
      value: num(getTagText(outrosNodes[i], "vDocFisc")),
    });
  }

  return docs.filter((item) => item.access_key || item.number || item.issuer_cnpj);
}

function extractObservations(inf, getTagText) {
  const parts = [];
  const compl = first(inf, "compl");
  const xObs = getTagText(compl, "xObs");
  if (xObs) parts.push(xObs);
  const obs = compl?.getElementsByTagName("ObsCont") || [];
  for (let i = 0; i < obs.length; i++) {
    const text = getTagText(obs[i], "xTexto");
    if (text) parts.push(text);
  }
  return parts.join("\n");
}

export function parseCTeDocument(doc, getTagText) {
  const inf = doc.getElementsByTagName("infCte")[0];
  const ide = first(inf, "ide");
  const emit = first(inf, "emit");
  const dest = first(inf, "dest");
  const rem = first(inf, "rem");
  const exped = first(inf, "exped");
  const receb = first(inf, "receb");
  const vPrest = first(inf, "vPrest");
  const infCarga = first(inf, "infCarga");
  const imp = first(inf, "imp");

  const number = getTagText(ide, "nCT");
  const series = getTagText(ide, "serie");
  const issueDateTime = getTagText(ide, "dhEmi") || getTagText(ide, "dEmi");
  let accessKey = "";
  const infId = inf?.getAttribute("Id") || "";
  if (infId.startsWith("CTe")) accessKey = infId.substring(3);
  const protCTe = doc.getElementsByTagName("protCTe")[0];
  if (!accessKey && protCTe) accessKey = getTagText(protCTe, "chCTe");

  const supplier = partyFromNode(emit, getTagText);
  const recipient = partyFromNode(dest, getTagText);
  const parties = {
    rem: partyFromNode(rem, getTagText),
    exped: partyFromNode(exped, getTagText),
    receb: partyFromNode(receb, getTagText),
    dest: recipient,
  };
  const taker = getTaker(inf, ide, parties, getTagText);

  const protocolNumber = protCTe ? getTagText(protCTe, "nProt") : "";
  const protocolDateTime = protCTe ? getTagText(protCTe, "dhRecbto") : "";
  const freightComponents = extractFreightComponents(vPrest, getTagText);
  const originDocuments = extractOriginDocuments(inf, getTagText);
  const cargoQuantityNode = first(infCarga, "infQ");

  return {
    document_type: "cte",
    number,
    series,
    access_key: digits(accessKey),
    operation_nature: getTagText(ide, "natOp"),
    cte_cfop: getTagText(ide, "CFOP"),
    cte_modal: getTagText(ide, "modal"),
    cte_service_type: getTagText(ide, "tpServ"),
    cte_payment_type: getTagText(ide, "forPag"),
    cte_origin_city: getTagText(ide, "xMunIni"),
    cte_origin_state: getTagText(ide, "UFIni"),
    cte_destination_city: getTagText(ide, "xMunFim"),
    cte_destination_state: getTagText(ide, "UFFim"),
    supplier_name: supplier.name,
    supplier_cnpj: supplier.cnpj,
    supplier_ie: supplier.ie,
    supplier_address: supplier.address,
    supplier_number: supplier.number,
    supplier_district: supplier.district,
    supplier_city: supplier.city,
    supplier_state: supplier.state,
    supplier_zip: supplier.zip,
    supplier_phone: supplier.phone,
    recipient_name: recipient.name,
    recipient_cnpj: recipient.cnpj,
    recipient_ie: recipient.ie,
    recipient_address: recipient.address,
    recipient_number: recipient.number,
    recipient_district: recipient.district,
    recipient_city: recipient.city,
    recipient_state: recipient.state,
    recipient_zip: recipient.zip,
    tomador_name: taker.name,
    tomador_cnpj: taker.cnpj,
    tomador_type: taker.type,
    cte_tomador_name: taker.name,
    cte_tomador_cnpj: taker.cnpj,
    cte_tomador_ie: taker.ie,
    cte_tomador_address: taker.address,
    cte_tomador_number: taker.number,
    cte_tomador_district: taker.district,
    cte_tomador_city: taker.city,
    cte_tomador_state: taker.state,
    cte_tomador_zip: taker.zip,
    cte_tomador_phone: taker.phone,
    ...prefix("sender", parties.rem),
    ...prefix("expedidor", parties.exped),
    ...prefix("recebedor", parties.receb),
    total_value: num(getTagText(vPrest, "vTPrest")),
    total_freight: num(getTagText(vPrest, "vTPrest")),
    total_products: num(getTagText(infCarga, "vCarga")),
    issue_date: issueDateTime ? issueDateTime.substring(0, 10) : "",
    issue_datetime: issueDateTime || "",
    due_date: "",
    status: "pendente",
    tax_icms: num(getTagText(imp, "vICMS")),
    tax_icms_base: num(getTagText(imp, "vBC")),
    service_description: extractObservations(inf, getTagText),
    protocol_number: protocolNumber,
    protocol_date: protocolDateTime ? protocolDateTime.substring(0, 10) : "",
    protocol_datetime: protocolDateTime || "",
    product_description: getTagText(infCarga, "proPred"),
    cargo_quantity: num(getTagText(cargoQuantityNode, "qCarga")),
    cargo_quantity_unit: getTagText(cargoQuantityNode, "tpMed"),
    freight_components: freightComponents,
    origin_documents: originDocuments,
    items: originDocuments.map((item) => ({
      code: item.access_key || item.number,
      description: [item.document_type, item.series, item.number].filter(Boolean).join(" "),
      total: item.value || 0,
    })),
    installments: [],
    payments: [],
  };
}