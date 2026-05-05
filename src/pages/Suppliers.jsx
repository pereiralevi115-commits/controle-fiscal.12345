import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Plus } from "lucide-react";
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

  const hideMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.update(id, { hidden: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fornecedor oculto!");
    },
  });

  const unhideMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.update(id, { hidden: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Fornecedor restaurado!");
    },
  });

  const extractSuppliersMutation = useMutation({
    mutationFn: async () => {
      const uniqueSuppliers = new Map();
      invoices.forEach((inv) => {
        const key = `${inv.supplier_cnpj}`;
        if (!uniqueSuppliers.has(key)) {
          uniqueSuppliers.set(key, {
            name: inv.supplier_name,
            cnpj: inv.supplier_cnpj,
          });
        }
      });

      const existingCNPJs = suppliers.map((s) => s.cnpj);
      const newSuppliers = Array.from(uniqueSuppliers.values()).filter(
        (s) => !existingCNPJs.includes(s.cnpj)
      );

      if (newSuppliers.length === 0) {
        toast.info("Nenhum fornecedor novo para adicionar");
        return;
      }

      await base44.entities.Supplier.bulkCreate(newSuppliers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedores extraídos!");
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
          >
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
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Ações</TableHead>
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
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className={supplier.hidden ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-sm font-mono">{formatCNPJ(supplier.cnpj)}</TableCell>
                  <TableCell className="text-sm">{supplier.phone || "—"}</TableCell>
                  <TableCell className="text-sm">{supplier.email || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {supplier.hidden ? (
                      <span className="text-amber-600 font-medium">Oculto</span>
                    ) : (
                      <span className="text-green-600 font-medium">Ativo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => supplier.hidden ? unhideMutation.mutate(supplier.id) : hideMutation.mutate(supplier.id)}
                    >
                      {supplier.hidden ? (
                        <Eye className="w-4 h-4 text-amber-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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