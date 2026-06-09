import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus, Phone, Users, Target, Loader2,
  Calendar as CalendarIcon, MapPin, PhoneCall, Search,
  X, Pencil, Clock, CheckCircle2, Circle, ArrowUpRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/tracker")({
  head: () => ({ meta: [{ title: "Tracker de Atividades — FortSecure" }] }),
  component: () => <AppShell><TrackerPage /></AppShell>,
});

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CFG = {
  ligacao: { label: "Ligação",  icon: Phone,    color: "#3ecf8e", bg: "bg-[#3ecf8e]/10 text-[#3ecf8e]" },
  reuniao: { label: "Reunião",  icon: Users,    color: "#f59e0b", bg: "bg-[#f59e0b]/10 text-[#f59e0b]" },
  visita:  { label: "Visita",   icon: MapPin,   color: "#1eaedb", bg: "bg-[#1eaedb]/10 text-[#1eaedb]" },
} as const;

const PRIORITY_CFG = {
  baixa: { label: "Baixa",  color: "text-muted-foreground border-border" },
  media: { label: "Média",  color: "text-amber-400 border-amber-400/30 bg-amber-400/5" },
  alta:  { label: "Alta",   color: "text-red-400 border-red-400/30 bg-red-400/5" },
} as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

function TrackerPage() {
  const { user, isManager } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logType, setLogType] = useState<"call" | "visit" | "meeting">("call");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  const [outcome, setOutcome] = useState("");
  const [relatedOpportunity, setRelatedOpportunity] = useState("");
  const [opps, setOpps] = useState<any[]>([]);

  useEffect(() => {
    async function loadOpps() {
      if (!user) return;
      const { data } = await supabase.from("opportunities").select("id, title").eq("owner_id", user.id);
      setOpps(data || []);
    }
    loadOpps();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*, profiles(full_name), opportunities(title)")
        .in("type", ["ligacao", "reuniao", "visita"])
        .order("due_date", { ascending: false });
      if (error) throw error;
      const all = (data || []).filter(item => isManager || item.owner_id === user.id);
      setItems(all);
    } catch {
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user, isManager]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const dbType = logType === "call" ? "ligacao" : logType === "meeting" ? "reuniao" : "visita";
      const label = logType === "call" ? "Call" : logType === "meeting" ? "Reunião" : "Visita";
      const payload = {
        owner_id: user.id,
        title: `${label}: ${clientName}`,
        type: dbType,
        due_date: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        description,
        status: "concluida",
        opportunity_id: relatedOpportunity || null,
        metadata: { priority, outcome, log_subtype: logType },
      };
      if (editingId) {
        const { error } = await supabase.from("activities").update(payload as any).eq("id", editingId);
        if (error) throw error;
        toast.success("Registro atualizado!");
      } else {
        const { error } = await supabase.from("activities").insert(payload as any);
        if (error) throw error;
        toast.success("Atividade registrada!");
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(a: any) {
    setEditingId(a.id);
    setLogType(a.metadata?.log_subtype || (a.type === "visita" ? "visit" : a.type === "reuniao" ? "meeting" : "call"));
    setClientName(a.title.split(": ")[1] || a.title);
    setDescription(a.description || "");
    setScheduledTime(a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : "");
    setPriority(a.metadata?.priority || "media");
    setOutcome(a.metadata?.outcome || "");
    setRelatedOpportunity(a.opportunity_id || "");
    setIsModalOpen(true);
  }

  function openNew() {
    setEditingId(null);
    setLogType("call");
    setClientName("");
    setDescription("");
    setScheduledTime(new Date().toISOString().slice(0, 16));
    setPriority("media");
    setOutcome("");
    setRelatedOpportunity("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setClientName("");
    setDescription("");
    setScheduledTime("");
    setOutcome("");
    setRelatedOpportunity("");
  }

  // Derived data
  const calls = items.filter(a => a.type === "ligacao");
  const meetings = items.filter(a => a.type === "reuniao");
  const visits = items.filter(a => a.type === "visita");
  const withOutcome = items.filter(a => a.metadata?.outcome?.length > 0);

  const filtered = items.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q);
    const matchType = filterType === "all" || a.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col gap-0 h-full max-w-[1400px] mx-auto">

      {/* ── Header banner ── */}
      <div className="px-6 lg:px-8 pt-8 pb-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center shrink-0">
              <PhoneCall className="h-4 w-4 text-[#3ecf8e]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Tracker de Atividades</h1>
              <p className="text-sm text-muted-foreground">Registro de ligações, visitas e reuniões</p>
            </div>
          </div>
          <Button
            onClick={openNew}
            className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 px-6 lg:px-8 py-6 overflow-y-auto pb-16">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total de Logs", value: items.length, icon: PhoneCall, accent: false },
            { label: "Ligações",      value: calls.length,    icon: Phone,    accent: "#3ecf8e" },
            { label: "Reuniões",      value: meetings.length, icon: Users,    accent: "#f59e0b" },
            { label: "Visitas",       value: visits.length,   icon: MapPin,   accent: "#1eaedb" },
          ].map(s => {
            const Icon = s.icon;
            const accentStyle = s.accent
              ? { backgroundColor: `${s.accent}15`, color: s.accent as string }
              : undefined;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    !s.accent && "bg-secondary text-muted-foreground"
                  )}
                  style={accentStyle}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-xl font-black font-mono" style={s.accent ? { color: s.accent as string } : undefined}>{s.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Layout ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Feed principal */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrar logs..."
                  className="w-full h-9 pl-9 pr-8 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                {[
                  { key: "all", label: "Todos" },
                  { key: "ligacao", label: "Calls" },
                  { key: "reuniao", label: "Reuniões" },
                  { key: "visita", label: "Visitas" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all",
                      filterType === f.key
                        ? "bg-[#3ecf8e] text-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >{f.label}</button>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <PhoneCall className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
                  <button onClick={openNew} className="text-xs text-[#3ecf8e] hover:underline mt-2">
                    Registrar primeira atividade
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  <AnimatePresence>
                    {filtered.map(a => {
                      const cfg = TYPE_CFG[a.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.ligacao;
                      const Icon = cfg.icon;
                      const pri = PRIORITY_CFG[a.metadata?.priority as keyof typeof PRIORITY_CFG];
                      return (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          onClick={() => openEdit(a)}
                          className="group flex items-center gap-4 px-5 py-4 hover:bg-secondary/10 transition-colors cursor-pointer"
                        >
                          {/* Icon */}
                          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", cfg.bg)}>
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-[#3ecf8e] transition-colors">
                                {a.title.split(": ")[1] || a.title}
                              </p>
                              {pri && (
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider shrink-0", pri.color)}>
                                  {pri.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {new Date(a.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                {" "}·{" "}
                                {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {a.opportunities?.title && (
                                <span className="text-[10px] text-[#3ecf8e] font-bold truncate">
                                  {a.opportunities.title}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Outcome + arrow */}
                          <div className="flex items-center gap-3 shrink-0">
                            {a.metadata?.outcome && (
                              <span className="hidden sm:block text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded max-w-[120px] truncate">
                                {a.metadata.outcome}
                              </span>
                            )}
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Mix de atividade */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Mix de Atividade</h3>
              <div className="space-y-4">
                {[
                  { label: "Ligações",         count: calls.length,    color: "#3ecf8e" },
                  { label: "Reuniões",         count: meetings.length, color: "#f59e0b" },
                  { label: "Visitas",          count: visits.length,   color: "#1eaedb" },
                  { label: "Com Desfecho",     count: withOutcome.length, color: "#a78bfa" },
                ].map(m => {
                  const pct = items.length > 0 ? (m.count / items.length) * 100 : 0;
                  return (
                    <div key={m.label} className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">{m.label}</span>
                        <span className="font-bold font-mono text-foreground">{m.count}</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Próximos compromissos */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                <CalendarIcon className="h-3.5 w-3.5 text-[#3ecf8e]" />
                <h3 className="text-xs font-semibold text-foreground">Próximos Compromissos</h3>
              </div>
              <div className="p-3 space-y-2">
                {items
                  .filter(a => a.status === "pendente" && ["reuniao", "visita"].includes(a.type) && new Date(a.due_date) >= new Date())
                  .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                  .slice(0, 5)
                  .map(a => {
                    const cfg = TYPE_CFG[a.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.reuniao;
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-[#3ecf8e]/30 transition-colors cursor-pointer" onClick={() => openEdit(a)}>
                        <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", cfg.bg)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{a.title.split(": ")[1] || a.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(a.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            {" "}·{" "}
                            {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                {items.filter(a => a.status === "pendente" && ["reuniao", "visita"].includes(a.type) && new Date(a.due_date) >= new Date()).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhum compromisso agendado</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={v => { if (!v) closeModal(); else setIsModalOpen(true); }}>
        <DialogContent className="max-w-lg bg-card border-border p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border">
            <DialogTitle className="text-base font-semibold">{editingId ? "Editar Registro" : "Novo Registro"}</DialogTitle>
            <DialogDescription className="text-xs">Registre os detalhes da sua interação comercial.</DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={logType} onValueChange={(v: any) => setLogType(v)}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="call">Ligação</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="visit">Visita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prioridade</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente / Empresa *</Label>
              <Input required value={clientName} onChange={e => setClientName(e.target.value)} className="h-9 bg-background border-border text-sm" placeholder="Nome do cliente ou empresa" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data e Hora</Label>
                <Input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="h-9 bg-background border-border text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Negócio Relacionado</Label>
                <Select value={relatedOpportunity} onValueChange={setRelatedOpportunity}>
                  <SelectTrigger className="h-9 bg-background border-border text-xs">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {opps.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Desfecho</Label>
              <Input value={outcome} onChange={e => setOutcome(e.target.value)} className="h-9 bg-background border-border text-sm" placeholder="Ex: Proposta enviada, Reunião agendada..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-background border-border text-sm min-h-[72px] resize-none" placeholder="Notas sobre a interação..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeModal} className="h-9 text-xs">Cancelar</Button>
              <Button type="submit" disabled={busy} className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {editingId ? "Salvar" : "Registrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
