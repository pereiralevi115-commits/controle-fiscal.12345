import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { DOMParser } from 'npm:xmldom@0.6.0';

function getTagText(parent, tagName) {
  if (!parent) return "";
  const elements = parent.getElementsByTagName(tagName);
  if (elements.length === 0) return "";
  return elements[0]?.textContent?.trim() || "";
}

function detectDocumentType(doc) {
  if (doc.getElementsByTagName("infEvento").length > 0) return "evento";
  if (doc.getElementsByTagName("infNFe").length > 0) return "nfe";
  if (doc.getElementsByTagName("infCte").length > 0) return "cte";
  if (doc.getElementsByTagName("infNFSe").length > 0) return "nfse";
  const nfseTags = ["InfNfse", "Nfse", "CompNfse", "InfDeclaracaoPrestacaoServico", "Rps"];
  for (const tag of nfseTags) {
    if (doc.getElementsByTagName(tag).length > 0) return "nfse";
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');
    const folderId = "E879A453737ADFFE!sb805943cb5fa415181ba58cf7b7653c0";
    const listResp = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name&$top=3`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const files = (await listResp.json()).value || [];

    const out = [];
    for (const f of files.slice(0, 3)) {
      const content = await (await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${f.id}/content`, { headers: { Authorization: `Bearer ${accessToken}` } })).text();
      let cleaned = content.replace(/^\uFEFF/, "").replace(/^\s+/, "");
      const firstTag = cleaned.indexOf("<");
      if (firstTag > 0) cleaned = cleaned.substring(firstTag);
      const doc = new DOMParser().parseFromString(cleaned, "text/xml");
      out.push({
        name: f.name,
        detectedType: detectDocumentType(doc),
        infEventoCount: doc.getElementsByTagName("infEvento").length,
        infCteCount: doc.getElementsByTagName("infCte").length,
      });
    }
    return Response.json({ out });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});