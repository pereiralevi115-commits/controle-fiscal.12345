import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, ShoppingCart, Truck, BarChart2, Loader2 } from "lucide-react";
import { formatCNPJ } from "@/lib/formatters";

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", cnpj: "", phone: "", email: "" });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setFormData({ name: "", cnpj: "", phone: "", email: "" });
      setShowDialog(false);
      toast.success("Fornecedor adicionado!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor atualizado!");
    },
  });

  const toggleFieldMutation = useMutation({
    mutationFn: ({ id, field, value }) => base44.entities.Supplier.update(id, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor atualizado!");
    },
  });

  const extractSuppliersMutation = useMutation({
    mutationFn: async () => {
      const normalize = (cnpj) => (cnpj || "").replace(/\D/g, "");

      const uniqueSuppliers = new Map();
      invoices.forEach((inv) => {
        const key = normalize(inv.supplier_cnpj);
        if (key && !uniqueSuppliers.has(key)) {
          uniqueSuppliers.set(key, {
            name: inv.supplier_name,
            cnpj: inv.supplier_cnpj,
            phone: inv.supplier_phone || "",
            email: inv.supplier_email || "",
          });
        }
      });

      const existingMap = new Map(suppliers.map((s) => [normalize(s.cnpj), s]));
      const toCreate = [];
      const toUpdate = [];

      for (const [cnpj, data] of uniqueSuppliers.entries()) {
        if (existingMap.has(cnpj)) {
          const existing = existingMap.get(cnpj);
          if ((data.phone && data.phone !== existing.phone) || (data.email && data.email !== existing.email)) {
            toUpdate.push({ id: existing.id, data: { phone: data.phone, email: data.email } });
          }
        } else {
          toCreate.push(data);
        }
      }

      if (toCreate.length === 0 && toUpdate.length === 0) {
        return { noop: true };
      }

      if (toCreate.length > 0) {
        await base44.entities.Supplier.bulkCreate(toCreate);
      }
      for (const { id, data } of toUpdate) {
        await base44.entities.Supplier.update(id, data);
      }

      return { created: toCreate.length, updated: toUpdate.length };
    },
    onSuccess: (result) => {
      if (result?.noop) {
        toast.info("Nenhuma alteração encontrada");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`Fornecedores atualizados! (${result.created} criados, ${result.updated} atualizados)`);
    },
    onError: () => {
      toast.error("Erro ao extrair fornecedores");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.cnpj) {
      toast.error("Preencha todos os campos");
      return;
    }
    createMutation.mutate(formData);
  };



  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.cnpj.includes(search)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      <div className="max-w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Fornecedores</h1>
            <p className="text-slate-500 mt-1">
              {filteredSuppliers.length} fornecedor{filteredSuppliers.length !== 1 ? "es" : ""} cadastrado{filteredSuppliers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button 
            onClick={() => extractSuppliersMutation.mutate()}
            variant="outline"
            className="gap-2 text-slate-600"
            disabled={extractSuppliersMutation.isPending}
          >
            {extractSuppliersMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Extrair de Notas Fiscais
          </Button>
        </div>

        <div className="flex gap-3">
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-sm"
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">Fornecedor</TableHead>
              <TableHead className="font-semibold">CNPJ</TableHead>
              <TableHead className="font-semibold">Telefone</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Categorias</TableHead>
              <TableHead className="font-semibold text-right">Categoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => {
                const rowColor = supplier.materia_prima
                  ? "bg-orange-50"
                  : supplier.gestao_compras
                  ? "bg-blue-50"
                  : supplier.gestao_frota
                  ? "bg-green-50"
                  : supplier.controladoria
                  ? "bg-purple-50"
                  : "";
                return (
                <TableRow key={supplier.id} className={rowColor}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-sm font-mono">{formatCNPJ(supplier.cnpj)}</TableCell>
                  <TableCell className="text-sm">{supplier.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{supplier.email || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-wrap gap-1">
                      {supplier.materia_prima && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Mat. Prima</span>}
                      {supplier.gestao_compras && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Gest. Compras</span>}
                      {supplier.gestao_frota && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Gest. Frota</span>}
                      {supplier.controladoria && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Controladoria</span>}
                      {!supplier.materia_prima && !supplier.gestao_compras && !supplier.gestao_frota && !supplier.controladoria && (
                        <span className="text-slate-400 text-xs">Nenhuma</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {[
                        { field: "materia_prima", icon: <Layers className="w-4 h-4" />, color: "text-orange-500", title: "Matéria Prima" },
                        { field: "gestao_compras", icon: <ShoppingCart className="w-4 h-4" />, color: "text-blue-500", title: "Gestão de Compras" },
                        { field: "gestao_frota", icon: <Truck className="w-4 h-4" />, color: "text-green-500", title: "Gestão de Frota" },
                        { field: "controladoria", icon: <BarChart2 className="w-4 h-4" />, color: "text-purple-500", title: "Controladoria" },
                      ].map(({ field, icon, color, title }) => {
                        const isActive = supplier[field];
                        return (
                          <Button
                            key={field}
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isActive ? color : "text-muted-foreground"}`}
                            title={isActive ? `Remover de ${title}` : `Marcar como ${title}`}
                            onClick={() => {
                              const update = {
                                materia_prima: false,
                                gestao_compras: false,
                                gestao_frota: false,
                                controladoria: false,
                                [field]: !isActive,
                              };
                              updateMutation.mutate({ id: supplier.id, data: update });
                            }}
                          >
                            {icon}
                          </Button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fornecedor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Razão social"
              />
            </div>
            <div>
              <label className="text-sm font-medium">CNPJ</label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@fornecedor.com"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Adicionar</Button>
            </div>
          </form>
        </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}