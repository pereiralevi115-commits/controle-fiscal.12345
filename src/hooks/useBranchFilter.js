import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * Returns the list of branch CNPJs the current user is allowed to see.
 * If the user is a Líder with branch_ids, returns only their branch CNPJs.
 * Otherwise returns null (no restriction).
 */
export function useBranchFilter() {
  const { user, isLoadingAuth } = useAuth();

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['userProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => base44.entities.Branch.list(),
  });

  const isLoading = isLoadingAuth || profilesLoading || branchesLoading;

  // Enquanto o auth ou os dados ainda carregam, bloqueia com isLoading=true e allowedCnpjs=null
  if (isLoading) return { allowedCnpjs: null, allowedBranchIds: null, isLider: null, branches, isLoading: true };

  if (!user) return { allowedCnpjs: null, allowedBranchIds: null, isLider: false, branches, isLoading: false };

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