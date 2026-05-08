import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, Edit3, Search, ShoppingBag,
  Loader2, Save, ArrowUpRight, Shield, RefreshCw,
  BarChart3, Boxes, ShieldCheck, Target, ImagePlus, X, Check, Settings2, AlertTriangle, Pencil, Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, parseCurrency, formatCurrencyBRL, formatDisplayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Produtos — FortSecure" }] }),
  component: () => <AppShell><Products /></AppShell>,
});

const DEFAULT_CATEGORIES = ["Software", "Hardware", "Serviços", "Suporte"];

const PRESET_COLORS = [
  "#3ecf8e", "#1eaedb", "#f59e0b", "#e53e3e",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
  "#6366f1", "#84cc16",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [custom, setCustom] = useState(value.startsWith("#") && !PRESET_COLORS.includes(value) ? value : "");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={cn("h-7 w-7 rounded-md border-2 transition-all", value === c ? "border-white scale-110" : "border-transparent hover:scale-105")}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md border border-border shrink-0" style={{ backgroundColor: custom || value }} />
        <Input
          placeholder="#hex personalizado"
          value={custom}
          onChange={e => { setCustom(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value); }}
          className="h-7 text-xs bg-background border-border font-mono"
        />
      </div>
    </div>
  );
}

function Products() {
  const { isManager, isAdmin } = useAuth();
  const canManage = isManager || isAdmin;
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  interface ProductForm {
    name: string;
    description: string;
    category: string;
    technical_notes: string;
    color: string;
    goal: string;
    image: string;
    new_category: string;
    goal_active: boolean;
    seller_goals: Record<string, string>;
  }

  const blankForm: ProductForm = {
    name: "", description: "", category: "Software",
    technical_notes: "", color: "#3ecf8e",
    goal: "", image: "", new_category: "", goal_active: false,
    seller_goals: {},
  };
  const [form, setForm] = useState<ProductForm>(blankForm);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      const prods = data ?? [];
      setItems(prods);
      // Collect custom categories
      const cats = new Set<string>(DEFAULT_CATEGORIES);
      prods.forEach(p => { if ((p as any).metadata?.category) cats.add((p as any).metadata.category); });
      const { data: profs } = await supabase.from("profiles").select("id, full_name").order("full_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      
      const sellersOnly = (profs || []).filter(p => {
        const r = roles?.find(r => r.user_id === p.id);
        return r?.role === "vendedor";
      });
      setSellers(sellersOnly);
    } catch { toast.error("Erro ao carregar produtos"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function handleImageFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter menos de 2MB"); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      setForm(f => ({ ...f, image: base64 }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // If new category typed, use it
      const finalCategory = form.new_category.trim() || form.category;

      const payload = {
        name: form.name,
        description: form.description,
        price: 0,
        metadata: {
          category: finalCategory,
          technical_notes: form.technical_notes,
          color: form.color,
          goal: form.goal ? parseCurrency(form.goal) : null,
          goal_active: form.goal_active,
          image: form.image || undefined,
          seller_goals: Object.fromEntries(
            Object.entries(form.seller_goals)
              .filter(([_, val]) => val !== "")
              .map(([id, val]) => [id, parseCurrency(val)])
          ),
        } as any,
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", editingId);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase.from("products").insert(payload as any);
        if (error) throw error;
        toast.success("Produto adicionado");
      }
      setIsModalOpen(false);
      setEditingId(null);
      setImagePreview("");
      setForm(blankForm);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Produto removido"); load(); }
  }

  async function deleteCategory(cat: string) {
    if (DEFAULT_CATEGORIES.includes(cat)) {
      toast.error("Categorias padrão não podem ser excluídas."); return;
    }
    const affected = items.filter(p => (p as any).metadata?.category === cat);
    if (affected.length > 0) {
      const ok = confirm(`Excluir a categoria "${cat}"?\n\n${affected.length} produto(s) serão movidos para "Geral".`);
      if (!ok) return;
    }
    // Bulk-update affected products
    for (const p of affected) {
      await supabase.from("products").update({
        metadata: { ...(p as any).metadata, category: "Geral" }
      }).eq("id", p.id);
    }
    if (filterCat === cat) setFilterCat("Todos");
    toast.success(`Categoria "${cat}" excluída`);
    load();
  }

  async function renameCategory(oldCat: string, newCat: string) {
    const trimmed = newCat.trim();
    if (!trimmed || trimmed === oldCat) { setRenamingCat(null); return; }
    if (allCategories.includes(trimmed)) {
      toast.error(`A categoria "${trimmed}" já existe.`); return;
    }
    const affected = items.filter(p => (p as any).metadata?.category === oldCat);
    for (const p of affected) {
      await supabase.from("products").update({
        metadata: { ...(p as any).metadata, category: trimmed }
      }).eq("id", p.id);
    }
    if (filterCat === oldCat) setFilterCat(trimmed);
    setRenamingCat(null);
    toast.success(`"${oldCat}" renomeada para "${trimmed}"`);
    load();
  }

  function openEdit(p: any) {
    setEditingId(p.id);
    setImagePreview((p as any).metadata?.image || "");
    setForm({
      name: p.name, description: p.description || "",
      category: (p as any).metadata?.category || "Software",
      technical_notes: (p as any).metadata?.technical_notes || "",
      color: (p as any).metadata?.color || "#3ecf8e",
      goal: (p as any).metadata?.goal ? formatCurrencyBRL((p as any).metadata.goal) : "",
      goal_active: (p as any).metadata?.goal_active || false,
      image: (p as any).metadata?.image || "",
      new_category: "",
      seller_goals: Object.fromEntries(
        Object.entries((p as any).metadata?.seller_goals || {}).map(([id, val]) => [id, formatCurrencyBRL(val as number)])
      ),
    });
    setIsModalOpen(true);
  }

  const categories = ["Todos", ...allCategories];
  const filtered = items.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "Todos" || p.metadata?.category === filterCat;
    return matchSearch && matchCat;
  });

  if (!canManage) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
        <Shield className="h-6 w-6 text-destructive/50" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">Acesso restrito a gestores</p>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Produtos"
        subtitle="Catálogo de soluções disponíveis para vinculação no pipeline"
        actions={
          <Button onClick={() => { setEditingId(null); setImagePreview(""); setForm(blankForm); setIsModalOpen(true); }}
            className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs rounded-md gap-2">
            <Plus className="h-3.5 w-3.5" /> Novo Produto
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={String(items.length)} icon={<Boxes className="h-4 w-4" />} />
        <StatCard label="Com Meta" value={String(items.filter(p => p.metadata?.goal).length)} icon={<Target className="h-4 w-4" />} accent />
        <StatCard label="Sem Meta" value={String(items.filter(p => !p.metadata?.goal).length)} icon={<ShieldCheck className="h-4 w-4" />} warn />
        <StatCard label="Categorias" value={String(allCategories.length)} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Pesquisar produto..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 bg-card border-border text-xs" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={cn("h-7 px-3 rounded-md text-[11px] font-medium border transition-colors",
                filterCat === cat ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-[#3ecf8e]"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground")}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          <Button variant="outline" onClick={() => setIsCatModalOpen(true)}
            className="h-7 px-3 text-[11px] font-medium border-border bg-secondary gap-1.5 text-muted-foreground hover:text-foreground">
            <Settings2 className="h-3 w-3" /> Categorias
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 border border-dashed border-border rounded-lg">
          <Package className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
        </div>
      ) : (() => {
        const withGoal = filtered.filter(p => p.metadata?.goal_active && p.metadata?.goal);
        const withoutGoal = filtered.filter(p => !p.metadata?.goal_active || !p.metadata?.goal);
        return (
          <div className="space-y-8">
            {/* ── Com Meta Ativa ── */}
            {withGoal.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#3ecf8e] shadow-[0_0_6px_#3ecf8e]" />
                    <span className="text-xs font-semibold text-[#3ecf8e]">Com Meta Ativa</span>
                    <span className="h-5 min-w-5 px-1.5 rounded bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] text-[10px] font-bold flex items-center justify-center">
                      {withGoal.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-[#3ecf8e]/15" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {withGoal.map((p, i) => <ProductCard key={p.id} p={p} i={i} onEdit={openEdit} onDelete={remove} nav={nav} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ── Sem Meta ── */}
            {withoutGoal.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500/70" />
                    <span className="text-xs font-semibold text-muted-foreground">Sem Meta Configurada</span>
                    <span className="h-5 min-w-5 px-1.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold flex items-center justify-center">
                      {withoutGoal.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] text-muted-foreground italic">Edite o produto para ativar a meta</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {withoutGoal.map((p, i) => <ProductCard key={p.id} p={p} i={i} onEdit={openEdit} onDelete={remove} nav={nav} dimmed />)}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Category Manager Modal ── */}
      <Dialog open={isCatModalOpen} onOpenChange={v => { setIsCatModalOpen(v); setRenamingCat(null); }}>
        <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">Gerenciar Categorias</DialogTitle>
                <DialogDescription className="text-[11px] mt-0.5">
                  Renomeie ou exclua categorias personalizadas.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-2 max-h-[70vh] overflow-y-auto no-scrollbar">
            {/* Default (locked) */}
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pb-1">Padrão (bloqueadas)</p>
            {DEFAULT_CATEGORIES.map(cat => {
              const count = items.filter(p => p.metadata?.category === cat).length;
              return (
                <div key={cat} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border/50">
                  <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center shrink-0">
                    <Shield className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{cat}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{count} produto{count !== 1 ? "s" : ""}</span>
                  <span className="text-[9px] text-muted-foreground/50 font-medium border border-border/50 rounded px-1.5 py-0.5">bloqueada</span>
                </div>
              );
            })}

            {/* Custom */}
            {allCategories.filter(c => !DEFAULT_CATEGORIES.includes(c)).length > 0 && (
              <>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pb-1 pt-3">Personalizadas</p>
                {allCategories.filter(c => !DEFAULT_CATEGORIES.includes(c)).map(cat => {
                  const count = items.filter(p => p.metadata?.category === cat).length;
                  const isRenaming = renamingCat === cat;
                  return (
                    <div key={cat} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40 border border-border hover:border-border/80 transition-colors group">
                      <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center shrink-0">
                        <Boxes className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {isRenaming ? (
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") renameCategory(cat, renameValue);
                            if (e.key === "Escape") setRenamingCat(null);
                          }}
                          onBlur={() => renameCategory(cat, renameValue)}
                          className="h-7 flex-1 bg-background border-border text-sm"
                        />
                      ) : (
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{cat}</span>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{count} produto{count !== 1 ? "s" : ""}</span>
                      {count > 0 && !isRenaming && (
                        <span title={`${count} produto(s) nesta categoria`}>
                          <AlertTriangle className="h-3 w-3 text-yellow-500/70 shrink-0" />
                        </span>
                      )}
                      {!isRenaming && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setRenamingCat(cat); setRenameValue(cat); }}
                            className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                            title="Renomear"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat)}
                            className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {allCategories.filter(c => !DEFAULT_CATEGORIES.includes(c)).length === 0 && (
              <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                <Boxes className="h-6 w-6 opacity-30" />
                <p className="text-xs">Nenhuma categoria personalizada criada.</p>
                <p className="text-[10px] opacity-70">Adicione via "Nova Categoria" ao criar/editar um produto.</p>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border bg-muted/20 flex justify-end">
            <Button onClick={() => setIsCatModalOpen(false)} className="h-8 px-5 bg-secondary text-xs font-medium text-foreground hover:bg-accent border border-border">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-[#3ecf8e]/10 text-[#3ecf8e] flex items-center justify-center">
                <Package className="h-3.5 w-3.5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                <DialogDescription className="text-[11px] mt-0.5">Configure nome, categoria, meta e cor no gráfico.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[78vh] no-scrollbar">
            {/* Image upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Imagem do Produto</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
              {imagePreview ? (
                <div className="relative group rounded-lg overflow-hidden border border-border h-32">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImagePreview(""); setForm(f => ({ ...f, image: "" })); }}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#3ecf8e]/40 hover:bg-[#3ecf8e]/5 transition-colors text-muted-foreground hover:text-[#3ecf8e]">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-xs">Clique para selecionar imagem (max 2MB)</span>
                </button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Nome do Produto</Label>
              <Input required placeholder="Ex: FortShield EDR Pro" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="h-9 bg-background border-border text-sm" />
            </div>

            {/* Category + custom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v, new_category: "" })}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Nova Categoria</Label>
                <Input placeholder="Ex: Consulting" value={form.new_category}
                  onChange={e => setForm({ ...form, new_category: e.target.value })}
                  className="h-9 bg-background border-border text-xs" />
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3 w-3" /> Meta do Produto (BRL)
              </Label>
              <div className="relative">
                <Input type="text" placeholder="R$ 0,00" value={form.goal}
                  onChange={e => setForm({ ...form, goal: e.target.value })}
                  onBlur={e => setForm({ ...form, goal: formatCurrencyBRL(e.target.value) })}
                  className="h-9 px-3 bg-background border-border text-sm font-mono" />
              </div>
              <p className="text-[10px] text-muted-foreground">Valor alvo de receita para este produto no dashboard.</p>
            </div>

            {/* Ativar Meta toggle */}
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer select-none",
                form.goal_active
                  ? "bg-[#3ecf8e]/5 border-[#3ecf8e]/25"
                  : "bg-secondary/30 border-border"
              )}
              onClick={() => {
                const next = !form.goal_active;
                if (next && !form.goal) {
                  toast.warning("Defina um valor de meta antes de ativar.");
                  return;
                }
                setForm({ ...form, goal_active: next });
              }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                  form.goal_active ? "bg-[#3ecf8e]/15 text-[#3ecf8e]" : "bg-secondary text-muted-foreground"
                )}>
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Ativar Meta no Dashboard</p>
                  <p className="text-[10px] text-muted-foreground">
                    {form.goal_active
                      ? "Este produto aparecerá no gráfico de receita por produto"
                      : "Ative para incluir este produto no acompanhamento de metas"}
                  </p>
                </div>
              </div>
              <div className={cn(
                "h-5 w-9 rounded-full transition-colors relative shrink-0",
                form.goal_active ? "bg-[#3ecf8e]" : "bg-border"
              )}>
                <div className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  form.goal_active ? "translate-x-4" : "translate-x-0.5"
                )} />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Cor no Gráfico</Label>
              <div className="p-3 bg-secondary/40 border border-border rounded-lg">
                <ColorPicker value={form.color} onChange={c => setForm({ ...form, color: c })} />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: form.color }} />
                Esta cor aparecerá no gráfico de receita por produto no Dashboard.
              </div>
            </div>

             {/* Seller Goals */}
            <div className="space-y-3 p-4 bg-secondary/20 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold text-foreground">Metas por Vendedor</Label>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                Defina metas individuais para este produto. Se deixado em branco, o vendedor não terá meta específica para este produto.
              </p>
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2 no-scrollbar">
                {sellers.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-foreground flex-1 truncate">{formatDisplayName(s.full_name)}</span>
                    <div className="relative w-40">
                      <Input
                        placeholder="R$ 0,00"
                        value={form.seller_goals[s.id] || ""}
                        onChange={e => {
                          const val = e.target.value;
                          setForm(f => ({
                            ...f,
                            seller_goals: { ...f.seller_goals, [s.id]: val }
                          }));
                        }}
                        onBlur={e => {
                          const val = e.target.value;
                          if (!val) return;
                          setForm(f => ({
                            ...f,
                            seller_goals: { ...f.seller_goals, [s.id]: formatCurrencyBRL(val) }
                          }));
                        }}
                        className="h-8 px-3 bg-background border-border text-[11px] font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
              <Textarea placeholder="Resumo do produto para vendedores e clientes..." value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="bg-background border-border text-sm min-h-[70px] resize-none" />
            </div>

            {/* Tech notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Especificações Técnicas</Label>
              <Textarea placeholder="Detalhes técnicos, integrações e compliance..." value={form.technical_notes}
                onChange={e => setForm({ ...form, technical_notes: e.target.value })}
                className="bg-background border-border text-sm min-h-[70px] resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}
                className="flex-1 h-9 border-border text-xs text-muted-foreground">Cancelar</Button>
              <Button type="submit" disabled={busy}
                className="flex-[2] h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingId ? <RefreshCw className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {editingId ? "Salvar Alterações" : "Registrar Produto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, accent, warn }: { label: string; value: string; icon: React.ReactNode; accent?: boolean; warn?: boolean }) {
  return (
    <div className={cn("bg-card border rounded-lg p-4 flex items-center gap-3",
      accent ? "border-[#3ecf8e]/20" : warn ? "border-yellow-500/20" : "border-border")}>
      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0",
        accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : warn ? "bg-yellow-500/10 text-yellow-500" : "bg-secondary text-muted-foreground")}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold font-mono text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

function ProductCard({ p, i, onEdit, onDelete, nav, dimmed }: {
  p: any; i: number;
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  nav: any;
  dimmed?: boolean;
}) {
  const color = p.metadata?.color || "#3ecf8e";
  const hasGoal = !!p.metadata?.goal;
  const image = p.metadata?.image;

  return (
    <motion.div layout key={p.id}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.04, duration: 0.2 }}>
      <div className={cn(
        "group bg-card border rounded-lg transition-colors flex flex-col overflow-hidden",
        dimmed
          ? "border-border hover:border-yellow-500/20 opacity-75 hover:opacity-100"
          : "border-border hover:border-[#3ecf8e]/30"
      )}>
        {/* Color bar */}
        <div className="h-1 w-full" style={{ backgroundColor: dimmed ? "#444" : color }} />

        {/* Image */}
        {image && (
          <div className="h-28 overflow-hidden bg-secondary">
            <img src={image} alt={p.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: (dimmed ? "#444" : color) + "20", color: dimmed ? "#666" : color }}>
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 border"
                  style={{
                    borderColor: (dimmed ? "#666" : color) + "40",
                    color: dimmed ? "#666" : color,
                    backgroundColor: (dimmed ? "#444" : color) + "10"
                  }}>
                  {p.metadata?.category || "Geral"}
                </Badge>
                {dimmed
                  ? <span className="text-[9px] text-yellow-500/80 font-semibold flex items-center gap-0.5">⚠ Meta inativa</span>
                  : <span className="text-[9px] text-[#3ecf8e] font-bold flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Meta ativa</span>
                }
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(p)} className="h-7 w-7 rounded-md hover:bg-accent">
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)} className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col gap-3">
          {p.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{p.description}</p>}

          {/* Goal value + progress (only for "com meta" section) */}
          {!dimmed && hasGoal && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                <span>Meta do produto</span>
                <span className="font-mono font-bold text-foreground">
                  {Number(p.metadata.goal).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: "0%", backgroundColor: color }} />
              </div>
            </div>
          )}

          {/* CTA for "sem meta" */}
          {dimmed && (
            <button onClick={() => onEdit(p)}
              className="text-[10px] text-yellow-500/70 hover:text-yellow-400 font-medium flex items-center gap-1 transition-colors w-fit">
              <Target className="h-3 w-3" /> Configurar meta →
            </button>
          )}

          {p.metadata?.technical_notes && (
            <div className="bg-secondary/50 border border-border rounded-md p-2.5">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mb-1">Especificações</p>
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{p.metadata.technical_notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dimmed ? "#444" : color }} />
            <span className="text-[10px] text-muted-foreground font-mono">{dimmed ? "—" : color}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => nav({ to: "/pipeline" })}
            className="h-7 w-7 rounded-md hover:text-[#3ecf8e] transition-colors">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
