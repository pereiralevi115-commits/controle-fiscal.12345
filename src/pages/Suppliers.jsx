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
import { formatCNPJ, formatPhone } from "@/lib/formatters";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export default function Suppliers({ embedded } = {}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", cnpj: "", phone: "", email: "" });
  const [sortConfig, setSortConfig] = useState([]);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-issue_date", 500),
  });

  // CNPJs (normalizados) de fornecedores que emitem NFS-e. Esses fornecedores
  // não devem ter a opção "Matéria Prima".
  const { data: nfseCnpjs = new Set() } = useQuery({
    queryKey: ["nfse-supplier-cnpjs"],
    queryFn: async () => {
      const normalize = (cnpj) => (cnpj || "").replace(/\D/g, "");
      const set = new Set();
      let skip = 0;
      const pageSize = 500;
      while (true) {
        const page = await base44.entities.Invoice.filter(
          { document_type: "nfse" },
          "-issue_date",
          pageSize,
          skip
        );
        page.forEach((inv) => {
          const key = normalize(inv.supplier_cnpj);
          if (key) set.add(key);
        });
        if (page.length < pageSize) break;
        skip += pageSize;
      }
      return set;
    },
  });

  const isNfseSupplier = (supplier) =>
    nfseCnpjs.has((supplier.cnpj || "").replace(/\D/g, ""));

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

      // Busca TODAS as notas (NF-e, NFS-e e CT-e) paginando, sem o limite de 500.
      const allInvoices = [];
      let skip = 0;
      const pageSize = 500;
      while (true) {
        const page = await base44.entities.Invoice.list("-issue_date", pageSize, skip);
        allInvoices.push(...page);
        if (page.length < pageSize) break;
        skip += pageSize;
      }

      const uniqueSuppliers = new Map();
      allInvoices.forEach((inv) => {
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



  const getCategoryName = (supplier) => {
    if (supplier.materia_prima) return "Matéria Prima";
    if (supplier.gestao_compras) return "Gestão de Compras";
    if (supplier.gestao_frota) return "Gestão de Frota";
    if (supplier.controladoria) return "Controladoria";
    return "Nenhuma";
  };

  const sortedAndFilteredSuppliers = suppliers
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.cnpj.includes(search)
    )
    .sort((a, b) => {
      for (let config of sortConfig) {
        let aValue, bValue;
        if (config.key === "category") {
          aValue = getCategoryName(a);
          bValue = getCategoryName(b);
        } else {
          aValue = a[config.key];
          bValue = b[config.key];
        }
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        let comparison = typeof aValue === "string" ? aValue.localeCompare(bValue) : aValue - bValue;
        if (comparison !== 0) return config.direction === "asc" ? comparison : -comparison;
      }
      return 0;
    });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) return prev.map((s) => s.key === key ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" } : s);
      return [{ key, direction: "asc" }, ...prev];
    });
  };

  const SortableHeader = ({ label, sortKey }) => {
    const sortConfig_ = sortConfig.find((s) => s.key === sortKey);
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-2 hover:text-foreground transition-colors"
      >
        {label}
        <span className="inline-block">
          {sortConfig_ ? (
            sortConfig_.direction === "asc" ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 opacity-30" />
          )}
        </span>
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"}>
      <div className={embedded ? "space-y-4" : "max-w-full mx-auto p-4 md:p-8 space-y-6"}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Fornecedores</h1>
            <p className="text-slate-500 mt-1">
              {sortedAndFilteredSuppliers.length} fornecedor{sortedAndFilteredSuppliers.length !== 1 ? "es" : ""} cadastrado{sortedAndFilteredSuppliers.length !== 1 ? "s" : ""}
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
              <TableHead className="font-semibold">
                <SortableHeader label="Fornecedor" sortKey="name" />
              </TableHead>
              <TableHead className="font-semibold">
                <SortableHeader label="CNPJ" sortKey="cnpj" />
              </TableHead>
              <TableHead className="font-semibold">
                <SortableHeader label="Telefone" sortKey="phone" />
              </TableHead>
              <TableHead className="font-semibold">
                <SortableHeader label="Email" sortKey="email" />
              </TableHead>
              <TableHead className="font-semibold">
                <SortableHeader label="Categorias" sortKey="category" />
              </TableHead>
              <TableHead className="font-semibold text-right">Categoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5" className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredSuppliers.map((supplier) => {
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
                  <TableCell className="text-sm">{formatPhone(supplier.phone) || "—"}</TableCell>
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
                      ]
                        .filter(({ field }) => !(field === "materia_prima" && isNfseSupplier(supplier)))
                        .map(({ field, icon, color, title }) => {
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