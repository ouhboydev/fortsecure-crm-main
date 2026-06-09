import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAppSettings, fetchRanking } from "@/lib/sales";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  TrendingUp, Target, Award, Plus, Zap,
  PhoneCall, Mail, Users, ListTodo, MapPin,
  CheckCircle2, Clock, Loader2, ArrowUpRight, Package,
  BarChart2, ChevronRight,
} from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "Meu Painel — FortSecure" }] }),
  component: () => <AppShell><MyPanel /></AppShell>,
});

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  tarefa:   { icon: ListTodo,  color: "text-[#a3a3a3]", bg: "bg-[#262626]" },
  ligacao:  { icon: PhoneCall, color: "text-[#3ecf8e]", bg: "bg-[#3ecf8e]/10" },
  email:    { icon: Mail,      color: "text-[#1eaedb]", bg: "bg-[#1eaedb]/10" },
  reuniao:  { icon: Users,     color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10" },
  visita:   { icon: MapPin,    color: "text-[#1eaedb]", bg: "bg-[#1eaedb]/10" },
  followup: { icon: Target,    color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10" },
};

function MyPanel() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [rank, setRank] = useState<string>("--");
  const [productData, setProductData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pipelineOpps, setPipelineOpps] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", type: "tarefa", due_date: "", is_public: false });

  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const qMonths = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];

  async function load() {
    if (!user) return;
    const [oppsRes, actsRes, settings, rankRes, prodsRes] = await Promise.all([
      supabase.from("opportunities").select("*").eq("owner_id", user.id),
      supabase.from("activities").select("*").eq("owner_id", user.id).order("due_date", { ascending: true }).limit(8),
      fetchAppSettings(),
      fetchRanking(),
      supabase.from("products").select("*"),
    ]);

    const opps = oppsRes.data ?? [];
    const won = opps.filter(o =>
      o.stage === "ganho" &&
      o.closed_at &&
      qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
      new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
    );
    const revenue = won.reduce((sum, o) => sum + Number(o.value), 0);
    const pipe = opps.filter(o => !["ganho", "perdido"].includes(o.stage)).reduce((sum, o) => sum + Number(o.value), 0);
    const proposalCount = opps.filter(o => ["proposta", "negociacao", "ganho", "perdido"].includes(o.stage)).length;
    const conversionRate = proposalCount > 0 ? (won.length / proposalCount) * 100 : 0;

    if (rankRes) {
      const ranking = rankRes as any[];
      const myIndex = ranking.findIndex(r => r.user_id === user.id);
      if (myIndex !== -1) setRank(`#${String(myIndex + 1).padStart(2, "0")}`);
    }

    setMetrics({ revenue, pipeline: pipe, count: won.length, conversionRate });
    setActivities(actsRes.data ?? []);
    setPipelineOpps(opps.filter(o => ["proposta", "negociacao"].includes(o.stage)));

    const prods = (prodsRes.data || []) as any[];
    const breakdown = prods
      .filter(p => p.metadata?.goal_active)
      .map(p => {
        const linked = opps.filter(o =>
          (o as any).metadata?.product_id === p.id &&
          o.stage === "ganho" &&
          o.closed_at &&
          qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
          new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
        );
        const realized = linked.reduce((s: number, o: any) => s + Number(o.value), 0);
        const qKey = `goal_q${quarter + 1}`;
        const goal = Number(p.metadata?.[qKey] || 0);
        const pct = goal > 0 ? Math.min(Math.round((realized / goal) * 100), 999) : 0;
        return { name: p.name, realized, goal, pct, color: p.metadata?.color ?? "#3ecf8e" };
      })
      .sort((a, b) => b.realized - a.realized);
    setProductData(breakdown);
  }

  useEffect(() => { load(); }, [user]);

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !user) return;
    setBusy(true);
    try {
      await supabase.from("activities").insert({
        owner_id: user.id,
        title: form.title,
        type: form.type as any,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        description: form.is_public ? `[PÚBLICO] ${new Date().toISOString()}` : null,
        status: "pendente" as any,
      });
      toast.success("Atividade agendada!");
      setForm({ title: "", type: "tarefa", due_date: "", is_public: false });
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar");
    } finally {
      setBusy(false);
    }
  }

  async function completeActivity(id: string, status: string) {
    const next = status === "concluida" ? "pendente" : "concluida";
    await supabase.from("activities").update({ status: next }).eq("id", id);
    load();
  }

  if (!metrics) return (
    <div className="h-screen flex items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
    </div>
  );

  const displayName = formatDisplayName(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Vendedor");
  const firstName = displayName.split(" ")[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const pendingActs = activities.filter(a => a.status === "pendente");
  const doneActs = activities.filter(a => a.status === "concluida");

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Hero Banner ── */}
      <div className="relative px-6 lg:px-10 pt-8 pb-10 border-b border-border overflow-hidden bg-gradient-to-br from-card via-card to-[#3ecf8e]/5">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #3ecf8e 0%, transparent 60%)" }} />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 max-w-[1400px] mx-auto">
          {/* Left: Identity */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-secondary border-2 border-border flex items-center justify-center overflow-hidden shadow-xl">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-[#3ecf8e]">{firstName[0]}</span>
                )}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-lg bg-[#3ecf8e] text-black flex items-center justify-center text-[10px] font-black shadow-lg">
                {rank}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{greeting},</p>
              <h1 className="text-2xl font-black text-foreground tracking-tight leading-tight">{displayName}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                  <span className="text-[10px] text-[#3ecf8e] font-bold uppercase tracking-wider">Online</span>
                </span>
                <span className="text-xs text-muted-foreground">Q{quarter + 1} · {pendingActs.length} pendências</span>
              </div>
            </div>
          </div>

          {/* Right: Quick stats */}
          <div className="flex items-stretch gap-1 bg-secondary/40 border border-border rounded-xl p-1.5">
            {[
              { label: "Fechamentos", value: metrics.count, mono: true, accent: false },
              { label: "Ticket Médio", value: metrics.count > 0 ? formatCurrency(metrics.revenue / metrics.count).replace(",00","") : "R$ 0", mono: true, accent: true },
              { label: "Conversão", value: `${metrics.conversionRate.toFixed(1)}%`, mono: true, accent: false },
            ].map((s, i) => (
              <div key={s.label} className="flex flex-col items-center px-4 py-2.5 rounded-lg">
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">{s.label}</p>
                <p className={cn("text-lg font-black font-mono mt-0.5", s.accent ? "text-[#3ecf8e]" : "text-foreground")}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full pb-20">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Receita Liquidada",
              value: formatCurrency(metrics.revenue),
              sub: `${metrics.count} negócios ganhos este trimestre`,
              icon: TrendingUp,
              accent: "#3ecf8e",
            },
            {
              label: "Pipeline Ativo",
              value: formatCurrency(metrics.pipeline),
              sub: `${pipelineOpps.length} oportunidades em andamento`,
              icon: BarChart2,
              accent: "#1eaedb",
            },
            {
              label: "Taxa de Conversão",
              value: `${metrics.conversionRate.toFixed(1)}%`,
              sub: "Da proposta ao fechamento",
              icon: Target,
              accent: "#f59e0b",
            },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="bg-card border border-border rounded-xl p-5 hover:border-opacity-50 transition-all group"
                style={{ borderColor: `${k.accent}20` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${k.accent}15`, color: k.accent }}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black font-mono tracking-tight" style={{ color: k.accent }}>{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1.5">{k.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left column: products + pipeline */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* Product performance */}
            {productData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Performance por Produto</h2>
                    <p className="text-[10px] text-muted-foreground">Atingimento de metas — Q{quarter + 1}</p>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {productData.map(p => {
                    const isOver = p.pct >= 100;
                    return (
                      <div key={p.name} className="bg-secondary/20 border border-border/50 rounded-xl p-4 hover:border-opacity-50 transition-all" style={{ borderColor: `${p.color}25` }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full font-mono shrink-0",
                            isOver ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-secondary text-muted-foreground"
                          )}>
                            {p.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-background border border-border/30 rounded-full overflow-hidden mb-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(p.pct, 100)}%` }}
                            transition={{ duration: 1, ease: "backOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Realizado</p>
                            <p className="text-sm font-black font-mono" style={{ color: p.color }}>{formatCurrency(p.realized)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">Meta</p>
                            <p className="text-[11px] font-bold font-mono text-muted-foreground">{formatCurrency(p.goal)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mini Kanban */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["proposta", "negociacao"].map(stage => {
                const stageOpps = pipelineOpps.filter(o => o.stage === stage);
                const total = stageOpps.reduce((s, o) => s + Number(o.value), 0);
                const stageColor = stage === "proposta" ? "#3b82f6" : "#8b5cf6";
                return (
                  <div key={stage} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stageColor }} />
                        <h3 className="text-xs font-semibold text-foreground">
                          {stage === "proposta" ? "Em Proposta" : "Em Negociação"}
                        </h3>
                      </div>
                      <span className="text-[10px] font-black font-mono text-[#3ecf8e]">
                        {formatCurrency(total).replace(",00", "")}
                      </span>
                    </div>
                    <div className="flex-1 p-3 space-y-2 min-h-[120px]">
                      {stageOpps.map(o => (
                        <div
                          key={o.id}
                          onClick={() => window.location.href = "/pipeline"}
                          className="group bg-secondary/30 border border-border/50 rounded-xl p-3 hover:border-[#3ecf8e]/30 transition-all cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <p className="text-xs font-semibold text-foreground truncate pr-2">{o.client_name}</p>
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-[#3ecf8e] shrink-0 transition-colors" />
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mb-2">{o.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black font-mono text-[#3ecf8e]">{formatCurrency(o.value)}</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-1 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${o.probability}%`, backgroundColor: stageColor }} />
                              </div>
                              <span className="text-[9px] text-muted-foreground">{o.probability}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {stageOpps.length === 0 && (
                        <div className="h-full flex items-center justify-center py-8">
                          <p className="text-[10px] text-muted-foreground/50 italic uppercase tracking-widest">Vazio</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: agenda */}
          <div className="flex flex-col gap-0 bg-card border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ListTodo className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Agenda</h2>
                  <p className="text-[10px] text-muted-foreground">{pendingActs.length} pendentes · {doneActs.length} concluídas</p>
                </div>
              </div>
              <Button
                size="icon"
                onClick={() => setIsModalOpen(true)}
                className="h-7 w-7 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black rounded-lg"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Activity list */}
            <div className="flex-1 overflow-auto divide-y divide-border/40">
              {activities.map(a => {
                const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.tarefa;
                const Icon = cfg.icon;
                const isDone = a.status === "concluida";
                return (
                  <div key={a.id} className={cn("flex items-center gap-3 px-5 py-3.5 group transition-colors", isDone ? "opacity-50" : "hover:bg-secondary/20")}>
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg, cfg.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold truncate", isDone ? "line-through text-muted-foreground" : "text-foreground")}>{a.title}</p>
                      {a.due_date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(a.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          {" "}·{" "}
                          {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => completeActivity(a.id, a.status)}
                      className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                        isDone
                          ? "bg-[#3ecf8e] border-[#3ecf8e] text-black"
                          : "border-border text-transparent hover:border-[#3ecf8e]"
                      )}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {activities.length === 0 && (
                <div className="py-16 text-center">
                  <ListTodo className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">Sem atividades agendadas</p>
                  <button onClick={() => setIsModalOpen(true)} className="text-xs text-[#3ecf8e] hover:underline mt-2">
                    Criar primeira atividade
                  </button>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-3 border-t border-border">
              <button
                onClick={() => window.location.href = "/activities"}
                className="w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-[#3ecf8e] transition-colors py-1"
              >
                Ver Agenda Completa <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: nova atividade ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border border-border rounded-2xl p-0 overflow-hidden max-w-md">
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Nova Atividade</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Agende uma tarefa ou compromisso.</DialogDescription>
            </DialogHeader>
            <form onSubmit={addActivity} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Título *</Label>
                <Input required autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="O que precisa ser feito?" className="h-9 bg-secondary border-border text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-9 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="tarefa">Tarefa</SelectItem>
                      <SelectItem value="ligacao">Ligação</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Prazo</Label>
                  <Input type="datetime-local" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="h-9 bg-secondary border-border text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-secondary/50 border border-border rounded-lg">
                <Checkbox id="is_public" checked={form.is_public} onCheckedChange={v => setForm({ ...form, is_public: !!v })}
                  className="border-border data-[state=checked]:bg-[#3ecf8e] data-[state=checked]:text-black" />
                <Label htmlFor="is_public" className="text-xs text-muted-foreground cursor-pointer">Compartilhar com o time</Label>
              </div>
              <DialogFooter className="gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-9 text-xs">Cancelar</Button>
                <Button type="submit" disabled={busy} className="flex-[2] h-9 bg-[#3ecf8e] text-black font-semibold text-xs gap-2">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Confirmar
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
