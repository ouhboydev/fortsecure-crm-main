import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, fetchRanking } from "@/lib/sales";
import {
  Plus, Search, Filter, MoreVertical,
  Clock, AlertCircle, CheckCircle2,
  ArrowRight, DollarSign, User as UserIcon,
  Loader2, Kanban, LayoutGrid, List, RefreshCw, X, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline de Vendas — FortSecure" }] }),
  component: () => <AppShell><SalesPipeline /></AppShell>,
});

function SalesPipeline() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<any[]>([]);
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
    const { data } = await supabase.from("opportunities").select("*, profiles(full_name)");
    setOpps(data ?? []);
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
        value: Number(form.value),
        stage: form.stage as any,
        probability: Number(form.probability),
        description: form.description,
        metadata: {
          expected_closing: form.expected_closing,
          source: form.source,
          product_id: form.product_id,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone
        },
        closed_at: (form.stage === 'ganho' || form.stage === 'perdido') ? new Date().toISOString() : null
      } as any;

      if (editingId) {
        const { error } = await supabase.from("opportunities").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Oportunidade atualizada");
      } else {
        const { error } = await supabase.from("opportunities").insert(payload);
        if (error) throw error;
        toast.success("Oportunidade criada");
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
      description: o.description || ""
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

  const handleProbabilityChange = (prob: number) => {
    let stage = form.stage;
    if (prob >= 100) stage = 'ganho';
    else if (prob >= 80) stage = 'negociacao';
    else if (prob >= 60) stage = 'proposta';
    else if (prob >= 40) stage = 'qualificado';
    else if (prob >= 5) stage = 'prospect';
    else if (prob <= 0) stage = 'perdido';
    setForm(prev => ({ ...prev, probability: prob, stage }));
  };

  async function onDragEnd(result: any) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;

    // Define probability and closed_at based on stage
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

    // Optimistic update
    const updated = opps.map(o => o.id === draggableId ? { ...o, stage: newStage, probability, closed_at: closedAt } : o);
    setOpps(updated);

    const { error } = await supabase
      .from("opportunities")
      .update({ 
        stage: newStage,
        probability,
        closed_at: closedAt
      })
      .eq("id", draggableId);

    if (error) {
      toast.error("Erro ao mover oportunidade");
      load(); // Rollback
    } else {
      toast.success(newStage === 'ganho' ? "Negócio FECHADO! Receita atualizada." : "Estágio atualizado");
    }
  }

  async function deleteOpp(id: string) {
    if (!confirm("Excluir esta oportunidade permanentemente?")) return;
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Oportunidade removida");
      load();
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-8 md:p-10 border-b border-border bg-card/20 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 max-w-[1800px] mx-auto">
          <PageHeader title="Pipeline de Vendas" subtitle="Gerencie e acompanhe oportunidades através do funil de vendas" />
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary z-10" />
              <Input
                placeholder="Filtrar negócios..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-6 bg-secondary/50 border-border rounded-xl text-sm text-foreground focus:ring-primary focus:border-primary/50 transition-all w-72 placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex bg-secondary border border-border p-1 rounded-xl">
              <Button
                variant={view === 'kanban' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setView('kanban')}
                className={cn("rounded-lg", view === 'kanban' && "bg-card text-foreground")}
              >
                <Kanban className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setView('list')}
                className={cn("rounded-lg", view === 'list' && "bg-card text-foreground")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={openNew} className="h-14 px-8 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center gap-3">
              <Plus className="h-5 w-5" /> Registrar Negócio
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-8 md:p-10 max-w-[1800px] mx-auto w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : view === 'kanban' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full overflow-x-auto pb-6 no-scrollbar">
              {STAGES.map((s) => (
                <Droppable key={s.key} droppableId={s.key}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "w-80 shrink-0 flex flex-col bg-secondary/30 border border-border/50 rounded-2xl overflow-hidden shadow-sm transition-colors",
                        snapshot.isDraggingOver && "bg-secondary/50 border-primary/20"
                      )}
                    >
                      <div className="p-5 border-b border-border/80 flex items-center justify-between bg-secondary/10">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: s.color, color: s.color }} />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{s.label}</h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-secondary border-border text-muted-foreground px-2 py-0.5">
                          {filtered.filter(o => o.stage === s.key).length}
                        </Badge>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                        {filtered.filter(o => o.stage === s.key).map((o, index) => (
                          <Draggable key={o.id} draggableId={o.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "bg-card/40 backdrop-blur-sm border border-border p-5 rounded-xl hover:border-primary/50 hover:bg-card/60 transition-all cursor-pointer group shadow-sm relative",
                                  snapshot.isDragging && "border-primary/50 bg-card shadow-2xl scale-[1.02] z-50 rotate-1"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 truncate">{o.client_name}</div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={(e) => { e.stopPropagation(); openEdit(o); }} className="p-1 hover:text-foreground text-muted-foreground/60 transition-colors">
                                      <MoreVertical className="h-3 w-3" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteOpp(o.id); }} className="p-1 hover:text-red-500 text-muted-foreground/60 transition-colors">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                <div onClick={() => openEdit(o)} className="text-[15px] font-bold text-foreground mb-4 leading-tight group-hover:text-primary transition-colors">{o.title}</div>
                                
                                <div className="mb-5 space-y-2">
                                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                                    <span>Probabilidade</span>
                                    <span className="text-primary">{o.probability || 0}%</span>
                                  </div>
                                  <Progress value={o.probability || 0} className="h-1 bg-secondary shadow-inner" />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <div className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">Valor</div>
                                    <div className="text-sm font-black text-foreground font-mono">{formatCurrency(o.value)}</div>
                                  </div>
                                  <div className="flex -space-x-2">
                                    <div className="h-7 w-7 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:border-primary/20 transition-all shadow-md">
                                      {o.profiles?.full_name?.[0] || 'A'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {filtered.filter(o => o.stage === s.key).length === 0 && (
                          <div className="h-32 border border-dashed border-border rounded-xl flex items-center justify-center text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Estágio Vazio</div>
                        )}
                      </div>
                      <div className="p-5 border-t border-border/80 bg-secondary/20 space-y-3">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
                          <span className="opacity-40">Total Bruto</span>
                          <span className="text-foreground/80 font-mono">{formatCurrency(filtered.filter(o => o.stage === s.key).reduce((sum, o) => sum + Number(o.value), 0))}</span>
                        </div>
                        <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center justify-between">
                          <span>Ponderado</span>
                          <span className="font-mono">{formatCurrency(filtered.filter(o => o.stage === s.key).reduce((sum, o) => sum + (Number(o.value) * (Number(o.probability || 0) / 100)), 0))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-card/30 border border-border rounded-2xl overflow-hidden shadow-xl">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border">
                  <TableHead className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Cliente</TableHead>
                  <TableHead className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Oportunidade</TableHead>
                  <TableHead className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Estágio</TableHead>
                  <TableHead className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor</TableHead>
                  <TableHead className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(o => (
                  <TableRow key={o.id} onClick={() => openEdit(o)} className="border-border/50 hover:bg-secondary/40 cursor-pointer group">
                    <TableCell className="px-8 py-5 text-sm font-bold text-foreground group-hover:text-primary transition-colors">{o.client_name}</TableCell>
                    <TableCell className="px-8 py-5 text-sm text-muted-foreground font-medium">{o.title}</TableCell>
                    <TableCell className="px-8 py-5">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-secondary border-border text-muted-foreground">
                        {STAGES.find(s => s.key === o.stage)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-sm font-bold text-foreground tabular-nums">{formatCurrency(o.value)}</TableCell>
                    <TableCell className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">{o.profiles?.full_name[0]}</div>
                        <span className="text-sm text-muted-foreground font-medium">{o.profiles?.full_name}</span>
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
        <DialogContent className="bg-background border border-border/50 rounded-[48px] p-0 overflow-hidden max-w-5xl shadow-[0_0_120px_rgba(0,0,0,0.6)] border-none">
          <div className="flex h-[850px] md:h-[800px] flex-col md:flex-row">
            {/* Left Strategic Side */}
            <div className="w-full md:w-[320px] bg-secondary/30 border-r border-border/50 p-12 flex flex-col justify-between relative hidden md:flex">
               <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
               <div className="relative z-10 space-y-12">
                  <div className="h-20 w-20 bg-background border border-border rounded-3xl flex items-center justify-center text-primary shadow-2xl">
                    <Kanban className="h-10 w-10" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black tracking-tighter uppercase italic text-foreground leading-tight">
                       Cadastro de <span className="text-primary">Negócio</span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.4em] leading-relaxed">Registro Delta-Prime // Pipeline v4.0</p>
                  </div>
                  
                  <div className="space-y-6 pt-10 border-t border-border/30">
                     <div className="flex items-center gap-4 text-primary">
                        <Target className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Painel de Oportunidade</span>
                     </div>
                     <p className="text-[10px] text-muted-foreground/30 leading-relaxed uppercase font-black tracking-widest italic">O valor do negócio impacta diretamente as projeções de meta de receita no Comando HQ.</p>
                  </div>
               </div>

               <div className="relative z-10 flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 italic">Sincronização Ativa</span>
               </div>
            </div>

            {/* Main Form Body */}
            <div className="flex-1 p-10 md:p-16 overflow-y-auto no-scrollbar bg-card/10 backdrop-blur-3xl relative">
              <div className="absolute top-0 right-0 p-8 md:p-10 flex items-center gap-4 hidden md:flex">
                 <Badge variant="outline" className="bg-secondary/50 border-border text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full">Informações Base</Badge>
              </div>

              <form onSubmit={handleSubmit} className="space-y-12 mt-6 md:mt-0">
                <section className="space-y-8">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_10px_#10b981]" />
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Dados do Cliente</h4>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Empresa / Lead</Label>
                        <Input 
                           required 
                           placeholder="Nome do cliente"
                           value={form.client_name}
                           onChange={e => setForm({...form, client_name: e.target.value})}
                           className="h-16 px-6 bg-secondary/40 border-border rounded-[20px] text-lg font-black italic tracking-tight focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Título do Negócio</Label>
                        <Input 
                           required 
                           placeholder="Ex: Licenciamento Anual"
                           value={form.title}
                           onChange={e => setForm({...form, title: e.target.value})}
                           className="h-16 px-6 bg-secondary/40 border-border rounded-[20px] text-sm font-bold focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Estágio no Funil</Label>
                         <Select value={form.stage} onValueChange={handleStageChange}>
                           <SelectTrigger className="h-16 bg-secondary/40 border-border rounded-[20px] text-xs font-black uppercase tracking-widest px-6">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="bg-card border-border">
                             {STAGES.map(s => (
                                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-3">
                         <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Probabilidade Estimada (%)</Label>
                         <Input 
                            type="number"
                            min="0" max="100"
                            value={form.probability}
                            onChange={e => handleProbabilityChange(Number(e.target.value))}
                            className="h-16 px-6 bg-secondary/40 border-border rounded-[20px] text-lg font-mono font-bold focus:ring-primary/20 transition-all outline-none"
                         />
                       </div>
                    </div>
                </section>

                <section className="space-y-8 pt-8 border-t border-border/30">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="h-1 w-12 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Financeiro & Metadados</h4>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Valor Projetado (Net)</Label>
                        <div className="relative group">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/20 italic group-focus-within:text-primary transition-colors">R$</span>
                           <Input 
                              required 
                              type="number"
                              placeholder="0,00"
                              value={form.value}
                              onChange={e => setForm({...form, value: e.target.value})}
                              className="h-18 pl-16 bg-secondary/40 border-border rounded-[24px] text-2xl font-black font-mono focus:ring-primary/20 transition-all outline-none"
                           />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Data de Fechamento (P70)</Label>
                        <Input 
                           type="date"
                           value={form.expected_closing}
                           onChange={e => setForm({...form, expected_closing: e.target.value})}
                           className="h-18 px-6 bg-secondary/40 border-border rounded-[24px] text-sm font-bold focus:ring-blue-500/20 transition-all outline-none"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Origem do Lead</Label>
                        <Select value={form.source} onValueChange={v => setForm({...form, source: v})}>
                          <SelectTrigger className="h-16 bg-secondary/40 border-border rounded-[20px] text-xs font-black uppercase tracking-widest px-6">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Inbound">Inbound Marketing</SelectItem>
                            <SelectItem value="Outbound">Outbound (SDR)</SelectItem>
                            <SelectItem value="Indicacao">Indicação / Parceiro</SelectItem>
                            <SelectItem value="Evento">Evento / Feira</SelectItem>
                            <SelectItem value="Direto">Contato Direto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">E-mail do Decisor</Label>
                        <Input 
                           type="email"
                           placeholder="ceo@empresa.com"
                           value={form.contact_email}
                           onChange={e => setForm({...form, contact_email: e.target.value})}
                           className="h-16 px-6 bg-secondary/40 border-border rounded-[20px] text-sm font-medium focus:ring-blue-500/20 transition-all outline-none"
                        />
                      </div>
                   </div>
                </section>

                <section className="space-y-6 pt-8 border-t border-border/30">
                   <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Observações e Destaques</Label>
                   <Textarea 
                     placeholder="Detalhes críticos do negócio, objeções enfrentadas e plano de ação..."
                     value={form.description}
                     onChange={e => setForm({...form, description: e.target.value})}
                     className="bg-secondary/40 border-border rounded-[32px] p-8 text-sm font-medium leading-relaxed min-h-[140px] focus:ring-primary/20 transition-all outline-none resize-none shadow-inner"
                   />
                </section>

                <div className="pt-10 flex gap-6">
                   <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-20 rounded-[24px] border-border text-[11px] font-black uppercase tracking-widest hover:bg-secondary transition-all text-muted-foreground/30">Cancelar</Button>
                   <Button 
                    type="submit" 
                    disabled={busy}
                    className="flex-[2] h-20 bg-primary text-primary-foreground rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-4"
                   >
                     {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : editingId ? <RefreshCw className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                     {editingId ? 'Sincronizar Atualização' : 'Efetivar Oportunidade'}
                   </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
