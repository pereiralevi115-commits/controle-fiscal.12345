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

  // Try different root elements
  const nfeProc = doc.getElementsByTagName("nfeProc");
  const NFe = doc.getElementsByTagName("NFe");
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

  // Access key from infNFe Id attribute or protNFe
  let accessKey = "";
  const infId = inf.getAttribute("Id") || "";
  if (infId.startsWith("NFe")) {
    accessKey = infId.substring(3);
  }
  // Try protNFe
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

  // Destinatário (recipient)
  const dest = inf.getElementsByTagName("dest")[0];
  const recipientName = getTagText(dest, "xNome");
  const recipientCnpj = getTagText(dest, "CNPJ");

  // Total and taxes
  const total = inf.getElementsByTagName("total")[0];
  const ICMSTot = total?.getElementsByTagName("ICMSTot")[0];
  const totalValue = parseFloat(getTagText(ICMSTot, "vNF")) || 0;
  const totalICMS = parseFloat(getTagText(ICMSTot, "vICMS")) || 0;
  const totalIPI = parseFloat(getTagText(ICMSTot, "vIPI")) || 0;
  const totalPIS = parseFloat(getTagText(ICMSTot, "vPIS")) || 0;
  const totalCOFINS = parseFloat(getTagText(ICMSTot, "vCOFINS")) || 0;
  const totalProducts = parseFloat(getTagText(ICMSTot, "vProd")) || 0;

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
      const description = getTagText(prod, "xProd");
      const quantity = parseFloat(getTagText(prod, "qCom")) || 0;
      const unitValue = parseFloat(getTagText(prod, "vUnCom")) || 0;
      const itemTotal = parseFloat(getTagText(prod, "vProd")) || 0;
      const ncm = getTagText(prod, "NCM");
      items.push({ description, quantity, unit_value: unitValue, total: itemTotal, ncm });
    }
  }

  // Format date
  let formattedDate = "";
  if (issueDate) {
    formattedDate = issueDate.substring(0, 10);
  }

  return {
    number,
    series,
    access_key: accessKey,
    supplier_name: supplierName,
    supplier_cnpj: supplierCnpj,
    recipient_name: recipientName,
    recipient_cnpj: recipientCnpj,
    total_value: totalValue,
    issue_date: formattedDate,
    due_date: dueDate,
    items,
    status: "pendente",
    tax_icms: totalICMS,
    tax_ipi: totalIPI,
    tax_pis: totalPIS,
    tax_cofins: totalCOFINS,
    total_products: totalProducts,
    additional_info: complementInfo,
    installments,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { xml_contents } = await req.json();

    if (!xml_contents || !Array.isArray(xml_contents)) {
      return Response.json({ error: "xml_contents deve ser um array de strings XML" }, { status: 400 });
    }

    // Get branches to auto-match
    const branches = await base44.entities.Branch.filter({});

    const results = [];
    const errors = [];

    for (let i = 0; i < xml_contents.length; i++) {
      try {
        const parsed = parseNFe(xml_contents[i]);

        // Set branch CNPJ as the identifier
        parsed.branch_cnpj = parsed.recipient_cnpj;

        // Check for duplicates by access_key or number + supplier
        let existing = [];
        if (parsed.access_key) {
          existing = await base44.entities.Invoice.filter({ access_key: parsed.access_key });
        }
        if (existing.length === 0 && parsed.number && parsed.supplier_cnpj) {
          existing = await base44.entities.Invoice.filter({
            number: parsed.number,
            supplier_cnpj: parsed.supplier_cnpj,
          });
        }

        if (existing.length > 0) {
          errors.push({ index: i, error: `Nota #${parsed.number} já importada` });
          continue;
        }

        const created = await base44.entities.Invoice.create(parsed);
        results.push(created);
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