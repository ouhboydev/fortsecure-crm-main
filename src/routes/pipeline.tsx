import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency, Section } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES } from "@/lib/sales";
import {
  Plus, Search,
  Clock, Loader2, Kanban, List, X, Target, Package, ShieldCheck
} from "lucide-react";
import { cn, parseCurrency, formatCurrencyBRL } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — FortSecure" }] }),
  component: () => <AppShell><SalesPipeline /></AppShell>,
});

function SalesPipeline() {
  const { user, isManager, isAdmin } = useAuth();
  const canManage = isManager || isAdmin;
  const [opps, setOpps] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    title: "",
    value: "",
    stage: "prospect",
    probability: 20,
    expected_closing: "",
    source: "",
    product_id: "",
    contact_email: "",
    contact_phone: "",
    description: ""
  });

  async function load() {
    setLoading(true);
    const [oppsRes, prodsRes] = await Promise.all([
      supabase.from("opportunities").select("*, profiles(full_name)"),
      supabase.from("products").select("id, name, metadata").order("name"),
    ]);
    setOpps(oppsRes.data ?? []);
    setProducts(prodsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = opps.filter(o =>
    o.client_name.toLowerCase().includes(search.toLowerCase()) ||
    o.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: user.id,
        client_name: form.client_name,
        title: form.title,
        value: parseCurrency(form.value),
        stage: form.stage as any,
        probability: Number(form.probability),
        description: form.description,
        metadata: {
          expected_closing: form.expected_closing,
          source: form.source,
          product_id: form.product_id,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
        },
        closed_at: (form.stage === 'ganho' || form.stage === 'perdido') ? new Date().toISOString() : null
      } as any;

      if (editingId) {
        const { error } = await supabase.from("opportunities").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Negócio atualizado");
      } else {
        const { error } = await supabase.from("opportunities").insert(payload);
        if (error) throw error;
        toast.success("Negócio registrado");
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm({ client_name: "", title: "", value: "", stage: "prospect", probability: 20, expected_closing: "", source: "Direto", product_id: "", contact_email: "", contact_phone: "", description: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const openNew = () => {
    setEditingId(null);
    setForm({ client_name: "", title: "", value: "", stage: "prospect", probability: 20, expected_closing: "", source: "Direto", product_id: "", contact_email: "", contact_phone: "", description: "" });
    setIsModalOpen(true);
  };

  const openEdit = (o: any) => {
    setEditingId(o.id);
    setForm({
      client_name: o.client_name,
      title: o.title,
      value: String(o.value),
      stage: o.stage,
      probability: o.probability || 20,
      expected_closing: o.metadata?.expected_closing || "",
      source: o.metadata?.source || "Direto",
      product_id: o.metadata?.product_id || "",
      contact_email: o.metadata?.contact_email || "",
      contact_phone: o.metadata?.contact_phone || "",
      description: o.description || "",
    });
    setIsModalOpen(true);
  };

  const handleStageChange = (newStage: string) => {
    let prob = form.probability;
    switch (newStage) {
      case 'prospect': prob = 20; break;
      case 'qualificado': prob = 40; break;
      case 'proposta': prob = 60; break;
      case 'negociacao': prob = 80; break;
      case 'ganho': prob = 100; break;
      case 'perdido': prob = 0; break;
    }
    setForm(prev => ({ ...prev, stage: newStage, probability: prob }));
  };

  async function onDragEnd(result: any) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;

    const now = new Date().toISOString();
    let probability = 0;
    let closedAt = null;

    switch (newStage) {
      case 'prospect': probability = 20; break;
      case 'qualificado': probability = 40; break;
      case 'proposta': probability = 60; break;
      case 'negociacao': probability = 80; break;
      case 'ganho': probability = 100; closedAt = now; break;
      case 'perdido': probability = 0; closedAt = now; break;
    }

    const updated = opps.map(o => o.id === draggableId ? { ...o, stage: newStage, probability, closed_at: closedAt } : o);
    setOpps(updated);

    const { error } = await supabase.from("opportunities").update({ stage: newStage, probability, closed_at: closedAt }).eq("id", draggableId);
    if (error) { toast.error("Erro ao mover negócio"); load(); }
  }

  async function deleteOpp(id: string) {
    if (!confirm("Excluir negócio?")) return;
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Removido"); load(); }
  }

  return (
    <div className="flex flex-col h-screen max-w-[1600px] mx-auto overflow-hidden">
      <div className="p-6 lg:p-8 shrink-0">
        <PageHeader
          title="Pipeline de Vendas"
          subtitle="Gerencie suas oportunidades comerciais."
          actions={
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 w-48 bg-card border-border text-xs"
                />
              </div>
              <div className="flex bg-secondary border border-border p-1 rounded-md">
                <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('kanban')} className="h-7 w-7 rounded-sm">
                  <Kanban className="h-3.5 w-3.5" />
                </Button>
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')} className="h-7 w-7 rounded-sm">
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button onClick={openNew} className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-xs rounded-md shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-2" /> Novo Negócio
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#3ecf8e]" />
          </div>
        ) : view === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full overflow-x-auto pb-4 no-scrollbar">
              {STAGES.map((s) => (
                <Droppable key={s.key} droppableId={s.key}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "w-72 shrink-0 flex flex-col bg-card/40 border border-border rounded-lg overflow-hidden",
                        snapshot.isDraggingOver && "bg-[#3ecf8e]/5"
                      )}
                    >
                      <div className="p-4 border-b border-border flex items-center justify-between bg-card/80">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</h3>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">{filtered.filter(o => o.stage === s.key).length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                        {filtered.filter(o => o.stage === s.key).map((o, index) => (
                          <Draggable key={o.id} draggableId={o.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openEdit(o)}
                                className={cn(
                                  "bg-background border border-border rounded-lg hover:border-[#3ecf8e]/40 transition-all cursor-pointer group shadow-sm overflow-hidden flex flex-col",
                                  snapshot.isDragging && "shadow-xl border-[#3ecf8e]/50 rotate-1"
                                )}
                              >
                                {/* Color Tag (Top bar) */}
                                <div className="h-1 w-full" style={{ backgroundColor: s.color }} />

                                <div className="p-4 flex flex-col gap-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] truncate">
                                        {o.client_name}
                                      </span>
                                      <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                                        {o.title}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteOpp(o.id); }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>

                                  {/* Info Tags */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {o.metadata?.expected_closing && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-secondary/50 border-border font-medium gap-1 text-muted-foreground">
                                        <Clock className="h-2.5 w-2.5" />
                                        {new Date(o.metadata.expected_closing).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      </Badge>
                                    )}
                                    {o.metadata?.source && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-primary/5 border-primary/20 font-bold text-[#3ecf8e] uppercase tracking-wider">
                                        {o.metadata.source}
                                      </Badge>
                                    )}
                                    {o.metadata?.product_id && (() => {
                                      const prod = products.find(p => p.id === o.metadata.product_id);
                                      return prod ? (
                                        <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-blue-500/5 border-blue-500/20 font-bold text-blue-400 gap-1">
                                          <Package className="h-2.5 w-2.5" />
                                          {prod.name}
                                        </Badge>
                                      ) : null;
                                    })()}
                                    {o.metadata?.product_id && (() => {
                                      const prod = products.find(p => p.id === o.metadata.product_id);
                                      return prod?.metadata?.goal_active ? (
                                        <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-[#3ecf8e]/5 border-[#3ecf8e]/20 font-bold text-[#3ecf8e] gap-1">
                                          <Target className="h-2.5 w-2.5" /> Meta Ativa
                                        </Badge>
                                      ) : null;
                                    })()}
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                      <span>Sucesso</span>
                                      <span>{o.probability || 0}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                                      <div className="h-full bg-[#3ecf8e] transition-all duration-500 shadow-[0_0_8px_rgba(62,207,142,0.3)]" style={{ width: `${o.probability || 0}%` }} />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-3 border-t border-border mt-1">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] text-muted-foreground font-medium">Valor Estimado</span>
                                      <span className="text-sm font-black text-foreground font-mono tabular-nums">
                                        {formatCurrency(o.value)}
                                      </span>
                                    </div>
                                    <div className="h-7 w-7 rounded-lg bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-foreground shadow-inner">
                                      {o.profiles?.full_name?.[0] || 'A'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-muted-foreground">Negócio</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-muted-foreground">Estágio</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-muted-foreground">Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(o => (
                  <TableRow key={o.id} onClick={() => openEdit(o)} className="border-border hover:bg-accent cursor-pointer group">
                    <TableCell className="text-sm font-semibold text-foreground">{o.client_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-bold bg-secondary border-none">{STAGES.find(s => s.key === o.stage)?.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-bold font-mono">{formatCurrency(o.value)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold uppercase">{o.profiles?.full_name[0]}</div>
                        <span className="text-xs text-muted-foreground font-medium">{o.profiles?.full_name}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-6 border-b border-border bg-muted/50">
            <DialogTitle className="text-lg font-semibold">{editingId ? "Editar Negócio" : "Registrar Oportunidade"}</DialogTitle>
            <DialogDescription className="text-xs">Preencha os dados técnicos da oportunidade comercial.</DialogDescription>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[70vh] no-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Cliente / Empresa</Label>
                  <Input required value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="h-9 bg-background border-border text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Título do Negócio</Label>
                  <Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="h-9 bg-background border-border text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Estágio</Label>
                  <Select value={form.stage} onValueChange={handleStageChange}>
                    <SelectTrigger className="h-9 bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Probabilidade (%)</Label>
                  <Input type="number" value={form.probability} onChange={e => setForm({ ...form, probability: Number(e.target.value) })} className="h-9 bg-background border-border text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Valor (BRL)</Label>
                  <Input 
                    required 
                    type="text" 
                    placeholder="R$ 0,00"
                    value={form.value} 
                    onChange={e => setForm({ ...form, value: e.target.value })}
                    onBlur={e => setForm({ ...form, value: formatCurrencyBRL(e.target.value) })}
                    className="h-9 bg-background border-border text-sm font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Previsão de Fechamento</Label>
                  <Input type="date" value={form.expected_closing} onChange={e => setForm({ ...form, expected_closing: e.target.value })} className="h-9 bg-background border-border text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Produto Vinculado</Label>
                <Select value={form.product_id || "none"} onValueChange={v => setForm({ ...form, product_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs">
                    <Package className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Selecionar produto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Nenhum produto vinculado</SelectItem>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.metadata?.category ? `· ${p.metadata.category}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.product_id && (() => {
                const linkedProd = products.find(p => p.id === form.product_id);
                if (!linkedProd) return null;
                const hasGoal = !!linkedProd.metadata?.goal_active;
                const hasGoalValue = !!linkedProd.metadata?.goal;
                return (
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-xs",
                    hasGoal && hasGoalValue
                      ? "bg-[#3ecf8e]/5 border-[#3ecf8e]/20 text-[#3ecf8e]"
                      : "bg-yellow-500/5 border-yellow-500/20 text-yellow-500"
                  )}>
                    <Target className="h-4 w-4 shrink-0" />
                    <div>
                      {hasGoal && hasGoalValue
                        ? <><span className="font-semibold">Meta ativa</span> <span className="text-[10px] opacity-80">— {Number(linkedProd.metadata.goal).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span></>
                        : hasGoal
                          ? <><span className="font-semibold">Meta ativa, mas sem valor definido</span> <span className="text-[10px] opacity-80">— configure em Produtos</span></>
                          : <><span className="font-semibold">Meta inativa neste produto</span> <span className="text-[10px] opacity-80">— ative em Produtos para aparecer no dashboard</span></>}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Observações Técnicas</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-background border-border text-sm min-h-[80px]" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs">Cancelar</Button>
                <Button type="submit" disabled={busy} className="bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-xs px-6">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Salvar Alterações" : "Efetivar Negócio"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

