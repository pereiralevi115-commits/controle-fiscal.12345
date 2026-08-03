export function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function isConcretarTomador(inv) {
  return normalizeText(inv?.tomador_name).includes('concretar');
}

export async function getUserProfile(base44, user) {
  if (!user?.profile_id) return null;
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ id: user.profile_id });
  return profiles?.[0] || null;
}

export async function getAllowedCnpjs(base44, user, profile = null, branches = null, respectAdminRole = true) {
  if (!user) return null;
  if (respectAdminRole && user.role === 'admin') return null;
  const userProfile = profile || await getUserProfile(base44, user);
  const isLider = normalizeText(userProfile?.name) === 'lider';
  if (!isLider || !Array.isArray(user.branch_ids) || user.branch_ids.length === 0) return null;
  const branchRows = branches || await base44.asServiceRole.entities.Branch.list();
  return branchRows.filter((branch) => user.branch_ids.includes(branch.id)).map((branch) => branch.cnpj);
}