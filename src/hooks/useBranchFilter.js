import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * Returns the list of branch CNPJs the current user is allowed to see.
 * If the user is a Líder with branch_ids, returns only their branch CNPJs.
 * Otherwise returns null (no restriction).
 */
export function useBranchFilter() {
  const { user } = useAuth();

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['userProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => base44.entities.Branch.list(),
  });

  const isLoading = profilesLoading || branchesLoading;

  if (!user) return { allowedCnpjs: null, allowedBranchIds: null, isLider: false, branches, isLoading: false };

  // Enquanto carrega, retorna um array vazio para não mostrar dados antes de saber o perfil
  if (isLoading) return { allowedCnpjs: [], allowedBranchIds: [], isLider: null, branches, isLoading: true };

  const profile = profiles.find((p) => p.id === user.profile_id);
  const isLider = profile?.name?.toLowerCase() === 'líder' || profile?.name?.toLowerCase() === 'lider';

  if (!isLider || !user.branch_ids?.length) {
    return { allowedCnpjs: null, allowedBranchIds: null, isLider: false, branches, isLoading: false };
  }

  const allowedBranchIds = user.branch_ids;
  const allowedCnpjs = branches
    .filter((b) => allowedBranchIds.includes(b.id))
    .map((b) => b.cnpj);

  return { allowedCnpjs, allowedBranchIds, isLider: true, branches, isLoading: false };
}