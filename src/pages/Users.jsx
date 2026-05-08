import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Users, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ProfilesTab from "@/components/users/ProfilesTab";

export default function UsersPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isInviting, setIsInviting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ role: "user", profile_id: "" });

  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["userProfiles"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ userId, profileId }) =>
      base44.entities.User.update(userId, { profile_id: profileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Perfil atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário atualizado!");
      setEditOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar usuário"),
  });

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ role: user.role || "user", profile_id: user.profile_id || "__none__", branch_ids: user.branch_ids || [] });
    setEditOpen(true);
  };

  const isLiderProfile = (profileId) => {
    if (profileId === "__none__") return false;
    const profile = profiles.find((p) => p.id === profileId);
    return profile?.name?.toLowerCase() === "líder" || profile?.name?.toLowerCase() === "lider";
  };

  const handleEditSave = () => {
    updateUserMutation.mutate({
      userId: editUser.id,
      data: {
        role: editForm.role,
        profile_id: editForm.profile_id === "__none__" ? null : editForm.profile_id,
        branch_ids: isLiderProfile(editForm.profile_id) ? editForm.branch_ids : [],
      },
    });
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("Informe o email do usuário");
      return;
    }
    setIsInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success("Convite enviado com sucesso!");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      refetch();
    } catch (error) {
      toast.error("Erro ao enviar convite: " + error.message);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Usuários</h1>
          <p className="text-slate-500 mt-1">Gerencie usuários e perfis de acesso</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="profiles">Perfis de Acesso</TabsTrigger>
          </TabsList>

          {/* ─── ABA USUÁRIOS ─── */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm">
                  {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
                </p>
                <Button onClick={() => setInviteOpen(true)} className="bg-slate-900 hover:bg-slate-800 gap-2">
                  <UserPlus className="w-4 h-4" />
                  Convidar Usuário
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border-0 py-16 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-slate-600">Nenhum usuário cadastrado</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Função</TableHead>
                        <TableHead className="font-semibold">Perfil de Acesso</TableHead>
                        <TableHead className="font-semibold">Cadastrado em</TableHead>
                        <TableHead className="font-semibold"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {user.role === "admin" ? "Admin" : "Usuário"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {profiles.find((p) => p.id === user.profile_id)?.name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.created_date ? new Date(user.created_date).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── ABA PERFIS ─── */}
          <TabsContent value="profiles">
            <ProfilesTab />
          </TabsContent>
        </Tabs>

        {/* ─── DIALOG EDITAR USUÁRIO ─── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            {editUser && (
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700">{editUser.full_name || editUser.email}</p>
                  <p className="text-xs text-muted-foreground">{editUser.email}</p>
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select value={editForm.role} onValueChange={(val) => setEditForm({ ...editForm, role: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <Select value={editForm.profile_id} onValueChange={(val) => setEditForm({ ...editForm, profile_id: val, branch_ids: [] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem perfil</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isLiderProfile(editForm.profile_id) && (
                  <div className="space-y-2">
                    <Label>Filiais com acesso</Label>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {branches.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-4 py-3">Nenhuma filial cadastrada</p>
                      ) : (
                        branches.map((branch) => (
                          <label key={branch.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
                            <Checkbox
                              checked={(editForm.branch_ids || []).includes(branch.id)}
                              onCheckedChange={(checked) => {
                                setEditForm((prev) => ({
                                  ...prev,
                                  branch_ids: checked
                                    ? [...(prev.branch_ids || []), branch.id]
                                    : (prev.branch_ids || []).filter((id) => id !== branch.id),
                                }));
                              }}
                            />
                            <span className="text-sm font-medium text-slate-700">{branch.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{branch.cnpj}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleEditSave} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── DIALOG CONVIDAR ─── */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting ? "Enviando..." : "Convidar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}