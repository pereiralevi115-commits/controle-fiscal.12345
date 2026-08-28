export function normalizeCnpj(value) {
  return String(value || '').replace(/\D/g, '');
}

export async function loadRegisteredBranchCnpjs(base44) {
  const branches = await base44.asServiceRole.entities.Branch.list();
  return new Set(branches.map((branch) => normalizeCnpj(branch.cnpj)).filter(Boolean));
}

export function ensureInvoiceDestinationRegistered(parsed, branchCnpjs) {
  const documentType = parsed?.document_type || 'nfe';
  if (documentType !== 'nfe' && documentType !== 'nfse') return;

  const recipientCnpj = normalizeCnpj(parsed.recipient_cnpj || parsed.branch_cnpj);
  if (!recipientCnpj) {
    throw new Error(`Documento #${parsed.number || 'sem número'} rejeitado: CNPJ do destinatário/tomador não informado.`);
  }

  if (!branchCnpjs.has(recipientCnpj)) {
    throw new Error(`Documento #${parsed.number || 'sem número'} rejeitado: CNPJ do destinatário/tomador ${recipientCnpj} não está cadastrado como filial do sistema.`);
  }

  parsed.recipient_cnpj = recipientCnpj;
  parsed.branch_cnpj = recipientCnpj;
}