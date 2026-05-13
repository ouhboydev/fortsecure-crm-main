import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency, Section } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES } from "@/lib/sales";
import {
  Plus, Search,
  Clock, Loader2, Kanban, List, X, Target, Package, ShieldCheck, Calendar,
  ChevronRight, Phone, Mail, User, ArrowUpRight
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
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    customer_id: "",
    title: "",
    value: "",
    stage: "prospect",
    probability: 20,
    expected_closing: "",
    source: "",
    product_id: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    owner_id: "",
    closed_at: ""
  });
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  async function load() {
    setLoading(true);
    const [oppsRes, prodsRes, custRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("opportunities").select("*, profiles(full_name)"),
      supabase.from("products").select("id, name, metadata").order("name"),
      supabase.from("customers" as any).select("id, name, company").order("name"),
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase.from("user_roles").select("user_id, role")
    ]);

    const validRoles = ["vendedor", "gestor"];
    const allowedUserIds = (rolesRes.data ?? [])
      .filter(r => validRoles.includes(r.role))
      .map(r => r.user_id);

    setOpps(oppsRes.data ?? []);
    setProducts(prodsRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setSellers((profilesRes.data ?? []).filter(p => allowedUserIds.includes(p.id)));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = opps.filter(o => {
    const matchesSearch = o.client_name.toLowerCase().includes(search.toLowerCase()) ||
      o.title.toLowerCase().includes(search.toLowerCase());
    const matchesSeller = selectedSellerId === "all" || o.owner_id === selectedSellerId;
    const matchesStage = selectedStage === "all" || o.stage === selectedStage;
    return matchesSearch && matchesSeller && matchesStage;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: form.owner_id || user.id,
        client_name: form.client_name,
        customer_id: form.customer_id || null,
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
        closed_at: (form.stage === 'ganho' || form.stage === 'perdido') 
          ? (form.closed_at ? new Date(form.closed_at).toISOString() : new Date().toISOString()) 
          : null
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
      setForm({ client_name: "", customer_id: "", title: "", value: "", stage: "prospect", probability: 20, expected_closing: "", source: "Direto", product_id: "", contact_email: "", contact_phone: "", description: "", owner_id: "", closed_at: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const openNew = () => {
    setEditingId(null);
    setForm({ client_name: "", customer_id: "", title: "", value: "", stage: "prospect", probability: 20, expected_closing: "", source: "Direto", product_id: "", contact_email: "", contact_phone: "", description: "", owner_id: user?.id || "", closed_at: "" });
    setIsModalOpen(true);
  };

  const openEdit = (o: any) => {
    setEditingId(o.id);
    setForm({
      client_name: o.client_name,
      customer_id: o.customer_id || "",
      title: o.title,
      value: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(o.value || 0),
      stage: o.stage,
      probability: o.probability || 20,
      expected_closing: o.metadata?.expected_closing || "",
      source: o.metadata?.source || "Direto",
      product_id: o.metadata?.product_id || "",
      contact_email: o.metadata?.contact_email || "",
      contact_phone: o.metadata?.contact_phone || "",
      description: o.description || "",
      owner_id: o.owner_id || "",
      closed_at: o.closed_at ? o.closed_at.split('T')[0] : "",
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
    setForm(prev => ({ 
      ...prev, 
      stage: newStage, 
      probability: prob,
      closed_at: (newStage === 'ganho' || newStage === 'perdido') ? (prev.closed_at || new Date().toISOString().split('T')[0]) : ""
    }));
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
              {canManage && (
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger className="h-9 w-48 bg-card border-border text-xs">
                    <SelectValue placeholder="Filtrar por Vendedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todos os Vendedores</SelectItem>
                    {sellers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="h-9 w-40 bg-card border-border text-xs">
                  <SelectValue placeholder="Estágio" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">Todos os Estágios</SelectItem>
                  {STAGES.map(s => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <div className="flex-1 overflow-y-auto min-h-0 px-6 lg:px-8 pb-8 scrollbar-custom">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#3ecf8e]" />
          </div>
        ) : view === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 h-full overflow-x-auto pb-6 scrollbar-custom">
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
          <div className="bg-card border border-border rounded-lg overflow-y-auto shadow-sm max-h-full scrollbar-custom">
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
        <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden rounded-2xl shadow-2xl">
          <DialogHeader className="p-8 border-b border-border bg-muted/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ecf8e]/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />
            <div className="relative z-10">
              <DialogTitle className="text-xl font-bold tracking-tight">
                {editingId ? "Editar Negócio" : "Registrar Oportunidade"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Configure os detalhes técnicos e financeiros do negócio.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-8 overflow-y-auto max-h-[75vh] scrollbar-custom">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section: Cliente */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Identificação do Cliente</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Vincular Cliente</Label>
                    <Select 
                      value={form.customer_id || "new"} 
                      onValueChange={v => {
                        if (v === "new") {
                          setForm(f => ({ ...f, customer_id: "" }));
                        } else {
                          const c = customers.find(x => x.id === v);
                          setForm(f => ({ ...f, customer_id: v, client_name: c?.name || f.client_name }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background/50 border-border text-xs focus:ring-[#3ecf8e]/20">
                        <SelectValue placeholder="Selecionar cliente..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="new" className="text-xs">-- Digitar nome manualmente --</SelectItem>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">{c.name} {c.company ? `(${c.company})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Nome do Cliente/Empresa</Label>
                    <Input 
                      required 
                      value={form.client_name} 
                      onChange={e => setForm({ ...form, client_name: e.target.value })} 
                      className="h-10 bg-background/50 border-border text-sm focus-visible:ring-[#3ecf8e]/20" 
                      placeholder="Ex: Nome da Empresa ou Pessoa"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Detalhes do Negócio */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Detalhes da Oportunidade</h3>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Vendedor Responsável</Label>
                    <Select 
                      disabled={!canManage}
                      value={form.owner_id} 
                      onValueChange={v => setForm({ ...form, owner_id: v })}
                    >
                      <SelectTrigger className="h-10 bg-background/50 border-border text-xs focus:ring-[#3ecf8e]/20">
                        <SelectValue placeholder="Selecionar vendedor..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {sellers.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Estágio Comercial</Label>
                    <Select value={form.stage} onValueChange={handleStageChange}>
                      <SelectTrigger className="h-10 bg-background/50 border-border text-xs focus:ring-[#3ecf8e]/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {STAGES.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Probabilidade (%)</Label>
                    <Input 
                      type="number" 
                      value={form.probability} 
                      onChange={e => setForm({ ...form, probability: Number(e.target.value) })} 
                      className="h-10 bg-background/50 border-border text-sm font-mono focus-visible:ring-[#3ecf8e]/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Previsão de Fechamento</Label>
                    <div className="relative">
                      <Input 
                        type="date" 
                        value={form.expected_closing} 
                        onChange={e => setForm({ ...form, expected_closing: e.target.value })} 
                        className="h-10 bg-background/50 border-border text-sm font-mono focus-visible:ring-[#3ecf8e]/20 pl-10" 
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Valor Estimado (BRL)</Label>
                  <div className="relative">
                    <Input 
                      required 
                      type="text" 
                      placeholder="0,00"
                      value={form.value} 
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "");
                        if (!v) {
                          setForm(f => ({ ...f, value: "" }));
                          return;
                        }
                        const amount = parseInt(v) / 100;
                        const formatted = new Intl.NumberFormat("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(amount);
                        setForm(f => ({ ...f, value: formatted }));
                      }}
                      className="h-12 bg-background/50 border-border text-xl font-black text-[#3ecf8e] font-mono tracking-tighter pl-12 focus-visible:ring-[#3ecf8e]/20" 
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold text-sm">R$</span>
                  </div>
                </div>
              </div>

              {(form.stage === 'ganho' || form.stage === 'perdido') && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#3ecf8e]" />
                    <Label className="text-xs font-black text-foreground uppercase tracking-[0.1em]">Finalização do Negócio</Label>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-[#3ecf8e]">Data do Fechamento Efetivo</Label>
                      <Input 
                        type="date" 
                        required
                        value={form.closed_at} 
                        onChange={e => setForm({ ...form, closed_at: e.target.value })} 
                        className="h-10 bg-background border-[#3ecf8e]/30 text-sm font-mono text-foreground focus-visible:ring-[#3ecf8e]/20" 
                      />
                      <p className="text-[10px] text-muted-foreground/70 leading-relaxed italic mt-1">
                        * Esta data define em qual período o negócio será contabilizado no dashboard.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Section: Produto e Meta */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Produto e Metas</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Produto Vinculado</Label>
                    <Select value={form.product_id || "none"} onValueChange={v => setForm({ ...form, product_id: v === "none" ? "" : v })}>
                      <SelectTrigger className="h-10 bg-background/50 border-border text-xs focus:ring-[#3ecf8e]/20">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Selecionar produto..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="none" className="text-xs font-medium italic">Nenhum produto vinculado</SelectItem>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
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
                        "flex items-start gap-4 p-4 rounded-xl border transition-all",
                        hasGoal && hasGoalValue
                          ? "bg-[#3ecf8e]/5 border-[#3ecf8e]/10"
                          : "bg-orange-500/5 border-orange-500/10"
                      )}>
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                          hasGoal && hasGoalValue ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-orange-500/10 text-orange-500"
                        )}>
                          <Target className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <p className={cn(
                            "text-xs font-bold uppercase tracking-wide",
                            hasGoal && hasGoalValue ? "text-[#3ecf8e]" : "text-orange-500"
                          )}>
                            {hasGoal && hasGoalValue ? "Meta de Venda Ativa" : hasGoal ? "Meta sem Valor" : "Meta Inativa"}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {hasGoal && hasGoalValue
                              ? <>Esta venda contribuirá para o atingimento da meta de <span className="font-bold text-foreground">{Number(linkedProd.metadata.goal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> deste produto.</>
                              : hasGoal
                                ? "O produto tem meta habilitada, mas o valor do objetivo não foi definido nas configurações."
                                : "Este produto não possui monitoramento de metas ativo. As vendas não aparecerão nos rankings de produtos do dashboard."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Observações Técnicas / Notas</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })} 
                  placeholder="Descreva detalhes adicionais, requisitos do cliente ou próximos passos..."
                  className="bg-background/50 border-border text-sm min-h-[100px] focus-visible:ring-[#3ecf8e]/20 p-4 leading-relaxed" 
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs font-medium hover:bg-muted/50">
                  Descartar
                </Button>
                <Button type="submit" disabled={busy} className="bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-bold text-xs px-8 h-10 shadow-lg shadow-[#3ecf8e]/10">
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

