import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { DOMParser } from 'npm:xmldom@0.6.0';

function getTagText(parent, tagName) {
  if (!parent) return "";
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length === 0) return "";
  return elements[0]?.textContent?.trim() || "";
}

function parseNFe(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const infNFe = doc.getElementsByTagName("infNFe");

  if (infNFe.length === 0) {
    throw new Error("XML não contém uma NF-e válida (tag infNFe não encontrada)");
  }

  const inf = infNFe[0];

  // IDE - identification
  const ide = inf.getElementsByTagName("ide")[0];
  const number = getTagText(ide, "nNF");
  const series = getTagText(ide, "serie");
  const issueDate = getTagText(ide, "dhEmi") || getTagText(ide, "dEmi");
  const operationNature = getTagText(ide, "natOp");

  // Access key
  let accessKey = "";
  const infId = inf.getAttribute("Id") || "";
  if (infId.startsWith("NFe")) {
    accessKey = infId.substring(3);
  }
  if (!accessKey) {
    const protNFe = doc.getElementsByTagName("protNFe");
    if (protNFe.length > 0) {
      accessKey = getTagText(protNFe[0], "chNFe");
    }
  }

  // Emitente (supplier)
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

  // Destinatário (recipient)
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

  // Total and taxes
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

  // Due date and installments
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
      installments.push({
        number: nDup || `${i + 1}`,
        due_date: dVenc,
        value: vDup
      });
      if (i === 0) {
        dueDate = dVenc;
      }
    }
  }

  // Complement info
  const infAdic = inf.getElementsByTagName("infAdic")[0];
  const complementInfo = getTagText(infAdic, "infCpl") || "";

  // Items
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

  // Format date
  let formattedDate = "";
  if (issueDate) {
    formattedDate = issueDate.substring(0, 10);
  }

  // Payment info
  const pag = inf.getElementsByTagName("pag")[0];
  const payments = [];
  if (pag) {
    const detPagElements = pag.getElementsByTagName("detPag");
    for (let i = 0; i < detPagElements.length; i++) {
      const detPag = detPagElements[i];
      const tPag = getTagText(detPag, "tPag");
      const vPag = parseFloat(getTagText(detPag, "vPag")) || 0;
      
      const paymentObj = {
        payment_type: tPag,
        value: vPag
      };

      const card = detPag.getElementsByTagName("card")[0];
      if (card) {
        paymentObj.card_type = getTagText(card, "tpIntegra");
        paymentObj.card_network = getTagText(card, "CNPJ");
        paymentObj.installments = parseInt(getTagText(card, "nParcela")) || 1;
        paymentObj.authorization_number = getTagText(card, "nAut");
        paymentObj.network_authorization = getTagText(card, "nAutOrig");
      }

      const cnpjPg = getTagText(detPag, "CNPJ");
      if (cnpjPg && !paymentObj.card_network) {
        paymentObj.processing_cnpj = cnpjPg;
      }

      payments.push(paymentObj);
    }
  }

  // Protocol info
  let protNum = "";
  let protDate = "";
  const protNFe = doc.getElementsByTagName("protNFe")[0];
  if (protNFe) {
    protNum = getTagText(protNFe, "nProt");
    const dhRecbto = getTagText(protNFe, "dhRecbto") || getTagText(protNFe, "dRecbto");
    if (dhRecbto) {
      protDate = dhRecbto.substring(0, 10);
    }
  }

  return {
    number,
    series,
    access_key: accessKey,
    operation_nature: operationNature,
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
    recipient_ie: recipientIe,
    recipient_address: recipientAddress,
    recipient_number: recipientNumber,
    recipient_district: recipientDistrict,
    recipient_city: recipientCity,
    recipient_state: recipientState,
    recipient_zip: recipientZip,
    total_value: totalValue,
    issue_date: formattedDate,
    due_date: dueDate,
    items,
    status: "pendente",
    tax_icms: totalICMS,
    tax_ipi: totalIPI,
    tax_pis: totalPIS,
    tax_cofins: totalCOFINS,
    tax_icms_base: taxIcmsBase,
    tax_ipi_base: taxIpiBase,
    total_products: totalProducts,
    total_freight: totalFreight,
    total_insurance: totalInsurance,
    total_discount: totalDiscount,
    total_other_charges: totalOtherCharges,
    additional_info: complementInfo,
    installments,
    protocol_number: protNum,
    protocol_date: protDate,
    payments,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { xml_contents } = await req.json();

    if (!xml_contents || !Array.isArray(xml_contents)) {
      return Response.json({ error: "xml_contents deve ser um array de strings XML" }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < xml_contents.length; i++) {
      try {
        const parsed = parseNFe(xml_contents[i]);
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
          errors.push({ index: i, error: `Nota #${parsed.number} já importada` });
          continue;
        }

        const created = await base44.asServiceRole.entities.Invoice.create(parsed);
        results.push(created);

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    return Response.json({
      success: results.length,
      errors: errors.length,
      error_details: errors,
      total: xml_contents.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});