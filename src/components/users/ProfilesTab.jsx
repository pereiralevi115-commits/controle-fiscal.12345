import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";

const ALL_PAGES = [
  { key: "dashboard", label: "Dashboard", path: "/" },
  { key: "nf", label: "NF", path: "/nf" },
  { key: "notas", label: "Notas Fiscais", path: "/notas" },
  { key: "materia-prima", label: "Matéria Prima", path: "/materia-prima" },
  { key: "gestao-compras", label: "Gestão de Compras", path: "/gestao-compras" },
  { key: "gestao-frota", label: "Gestão de Frota", path: "/gestao-frota" },
  { key: "controladoria", label: "Controladoria", path: "/controladoria" },
  { key: "arquivadas", label: "Arquivadas", path: "/arquivadas" },
  { key: "notas-para-verificar", label: "Gerencial", path: "/notas-para-verificar" },
  { key: "importar", label: "Importar XML", path: "/importar" },
  { key: "fornecedores", label: "Fornecedores", path: "/fornecedores" },
  { key: "filiais", label: "Filiais", path: "/filiais" },
  { key: "usuarios", label: "Usuários", path: "/usuarios" },
];

const ALL_PERMISSIONS = [
  { key: "edit_due_date", label: "Editar data de vencimento", description: "Permite alterar a coluna Vencimento nas tabelas" },
  { key: "download_pdf", label: "Baixar PDF (Ver Detalhes)", description: "Permite baixar o PDF ao abrir os detalhes de uma NF" },
  { key: "toggle_sigv", label: "Marcar SIGV", description: "Permite ativar/desativar o botão SIGV" },
  { key: "toggle_topcon", label: "Marcar TOPCON", description: "Permite ativar/desativar o botão TOPCON" },
  { key: "toggle_boleto", label: "Marcar BOLETO", description: "Permite ativar/desativar o botão BOLETO" },
];

const emptyForm = { name: "", description: "", pages: [], permissions: [] };

export default function ProfilesTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["userProfiles"],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfiles"] });
      toast.success("Perfil criado!");
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfiles"] });
      toast.success("Perfil atualizado!");
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfiles"] });
      toast.success("Perfil removido!");
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (profile) => {
    setEditing(profile);
    setForm({ name: profile.name, description: profile.description || "", pages: profile.pages || [], permissions: profile.permissions || [] });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const togglePage = (key) => {
    setForm((prev) => ({
      ...prev,
      pages: prev.pages.includes(key)
        ? prev.pages.filter((p) => p !== key)
        : [...prev.pages, key],
    }));
  };

  const toggleAll = () => {
    if (form.pages.length === ALL_PAGES.length) {
      setForm((prev) => ({ ...prev, pages: [] }));
    } else {
      setForm((prev) => ({ ...prev, pages: ALL_PAGES.map((p) => p.key) }));
    }
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const toggleAllPermissions = () => {
    if (form.permissions.length === ALL_PERMISSIONS.length) {
      setForm((prev) => ({ ...prev, permissions: [] }));
    } else {
      setForm((prev) => ({ ...prev, permissions: ALL_PERMISSIONS.map((p) => p.key) }));
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Nome do perfil é obrigatório");
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-sm">{profiles.length} perfil{profiles.length !== 1 ? "is" : ""} cadastrado{profiles.length !== 1 ? "s" : ""}</p>
        <Button onClick={openNew} className="bg-slate-900 hover:bg-slate-800 gap-2">
          <Plus className="w-4 h-4" />
          Novo Perfil
        </Button>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-white rounded-xl border py-16 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhum perfil cadastrado</p>
          <p className="text-sm text-slate-500 mt-1">Crie perfis para controlar o acesso às telas</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <div key={profile.id} className="bg-white rounded-xl border p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                  <h3 className="font-semibold text-slate-800">{profile.name}</h3>
                </div>
                {profile.description && (
                  <p className="text-sm text-slate-500 mb-2">{profile.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(profile.pages || []).length === 0 ? (
                    <span className="text-xs text-slate-400">Nenhuma tela selecionada</span>
                  ) : (profile.pages || []).length === ALL_PAGES.length ? (
                    <Badge variant="secondary" className="text-xs">Acesso total às telas</Badge>
                  ) : (
                    (profile.pages || []).map((key) => {
                      const page = ALL_PAGES.find((p) => p.key === key);
                      return page ? (
                        <Badge key={key} variant="secondary" className="text-xs">{page.label}</Badge>
                      ) : null;
                    })
                  )}
                </div>
                {(profile.permissions || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(profile.permissions || []).map((key) => {
                      const perm = ALL_PERMISSIONS.find((p) => p.key === key);
                      return perm ? (
                        <Badge key={key} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">{perm.label}</Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(profile)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(profile.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Perfil" : "Novo Perfil"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Financeiro, Operacional..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição opcional do perfil"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Telas com acesso</Label>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  {form.pages.length === ALL_PAGES.length ? "Desmarcar todas" : "Marcar todas"}
                </button>
              </div>
              <div className="border rounded-lg divide-y">
                {ALL_PAGES.map((page) => (
                  <label
                    key={page.key}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Checkbox
                      checked={form.pages.includes(page.key)}
                      onCheckedChange={() => togglePage(page.key)}
                    />
                    <span className="text-sm font-medium text-slate-700">{page.label}</span>
                    <span className="text-xs text-slate-400 ml-auto">{page.path}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissões de ações</Label>
                <button
                  type="button"
                  onClick={toggleAllPermissions}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  {form.permissions.length === ALL_PERMISSIONS.length ? "Desmarcar todas" : "Marcar todas"}
                </button>
              </div>
              <div className="border rounded-lg divide-y">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={form.permissions.includes(perm.key)}
                      onCheckedChange={() => togglePermission(perm.key)}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{perm.label}</p>
                      <p className="text-xs text-slate-400">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Salvar" : "Criar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}