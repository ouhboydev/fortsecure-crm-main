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
} from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  tarefa:  { icon: ListTodo,  color: "text-[#a3a3a3]", bg: "bg-[#262626]" },
  ligacao: { icon: PhoneCall, color: "text-[#3ecf8e]", bg: "bg-[#3ecf8e]/10" },
  email:   { icon: Mail,      color: "text-[#1eaedb]", bg: "bg-[#1eaedb]/10" },
  reuniao: { icon: Users,     color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10" },
  visita:  { icon: MapPin,    color: "text-[#1eaedb]", bg: "bg-[#1eaedb]/10" },
  followup:{ icon: Target,    color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10" },
};

function MyPanel() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [rank, setRank] = useState<string>("--");
  const [productData, setProductData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pipelineOpps, setPipelineOpps] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", type: "tarefa", due_date: "", is_public: false });

  // Current quarter months
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const qMonths = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
  const qLabel = `Q${quarter + 1}`;

  async function load() {
    if (!user) return;
    const [oppsRes, actsRes, badgeRes, settings, rankRes, prodsRes] = await Promise.all([
      supabase.from("opportunities").select("*").eq("owner_id", user.id),
      supabase.from("activities").select("*").eq("owner_id", user.id).order("due_date", { ascending: true }).limit(5),
      supabase.from("badges").select("*, badges(*)").eq("user_id", user.id),
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
    const points = won.length;

    // Conversion rate
    const proposalCount = opps.filter(o => ["proposta", "negociacao", "ganho", "perdido"].includes(o.stage)).length;
    const winCount = won.length;
    const conversionRate = proposalCount > 0 ? (winCount / proposalCount) * 100 : 0;

    if (rankRes.data) {
      const ranking = rankRes.data as any[];
      const myIndex = ranking.findIndex(r => r.user_id === user.id);
      if (myIndex !== -1) setRank(`#${String(myIndex + 1).padStart(2, "0")}`);
    }

    setMetrics({ revenue, pipeline: pipe, count: won.length, points, conversionRate });
    setActivities(actsRes.data ?? []);
    setBadges(badgeRes.data ?? []);
    setPipelineOpps(opps.filter(o => ["proposta", "negociacao"].includes(o.stage)));

    // Product performance for this user (current quarter)
    const prods = (prodsRes.data || []) as any[];
    const productBreakdown = prods
      .filter(prod => prod.metadata?.goal_active)
      .map(prod => {
        const linked = opps.filter(o =>
          (o as any).metadata?.product_id === prod.id &&
          o.stage === "ganho" &&
          o.closed_at &&
          qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
          new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
        );
        const realized = linked.reduce((s: number, o: any) => s + Number(o.value), 0);
        const qKey = `goal_q${quarter + 1}`;
        const quarterlyMeta = Number(prod.metadata?.[qKey] || 0);

        const pct = quarterlyMeta > 0 ? Math.min(Math.round((realized / quarterlyMeta) * 100), 999) : 0;
        return {
          name: prod.name,
          realized,
          goal: quarterlyMeta,
          pct,
          color: (prod as any).metadata?.color ?? "#3ecf8e",
        };
      })
      .sort((a, b) => b.realized - a.realized);
    setProductData(productBreakdown);
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
      <span className="text-sm text-muted-foreground">Carregando...</span>
    </div>
  );

  const displayName = formatDisplayName(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Vendedor");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="h-20 w-20 rounded-2xl bg-[#171717] border-2 border-border flex items-center justify-center overflow-hidden shadow-2xl transition-all group-hover:border-[#3ecf8e]/40">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <Users className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-lg bg-[#3ecf8e] text-black flex items-center justify-center font-black text-[10px] shadow-lg">
              {rank.replace("#", "")}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              {displayName}
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-md">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                <span className="text-[10px] text-[#3ecf8e] font-bold uppercase tracking-wider">Online</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Equipe FortSecure</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-secondary/30 border border-border p-2 rounded-xl">
          <div className="px-4 py-2">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Pontuação XP</p>
            <p className="text-xl font-black font-mono text-foreground">{metrics.points}</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="px-4 py-2">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Média Ticket</p>
            <p className="text-xl font-black font-mono text-[#3ecf8e]">
              {metrics.count > 0 ? formatCurrency(metrics.revenue / metrics.count).replace(",00", "") : "R$ 0"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Layout Grid ── */}
      <div className="flex flex-col gap-8">

        {/* Main KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="Receita Liquidada"
            value={formatCurrency(metrics.revenue)}
            sub={`${metrics.count} negócios ganhos`}
            icon={<TrendingUp className="h-4 w-4" />}
            accent
          />
          <KpiCard
            label="Fila de Negociação"
            value={formatCurrency(metrics.pipeline)}
            sub={`${pipelineOpps.length} oportunidades`}
            icon={<Target className="h-4 w-4" />}
          />
          <KpiCard
            label="Taxa de Conversão"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            sub="Média do período"
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left/Middle: Products & Kanban */}
          <div className="xl:col-span-2 flex flex-col gap-8">

            {/* ── Product Performance Grid ── */}
            {productData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Performance por Produto</h2>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Atingimento de metas do trimestre</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productData.map((p: any) => {
                    const isOver = p.pct >= 100;
                    return (
                      <div key={p.name} className="bg-secondary/30 border border-border/50 rounded-xl p-5 hover:border-[#3ecf8e]/30 transition-all group">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-2 w-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: p.color }} />
                            <span className="text-xs font-black text-foreground truncate">{p.name}</span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full font-mono",
                            isOver ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-yellow-500/10 text-yellow-500"
                          )}>
                            {p.pct}%
                          </span>
                        </div>
                        <div className="h-2 bg-background border border-border/50 rounded-full overflow-hidden mb-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(p.pct, 100)}%` }}
                            transition={{ duration: 1.2, ease: "backOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}40` }}
                          />
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Realizado</span>
                            <span className="text-sm font-black font-mono" style={{ color: p.color }}>{formatCurrency(p.realized)}</span>
                          </div>
                          <div className="flex flex-col items-end text-right">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Meta</span>
                            <span className="text-[11px] font-black font-mono text-foreground/70">{formatCurrency(p.goal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Mini Kanban (Foco Comercial) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["proposta", "negociacao"].map(stage => (
                <div key={stage} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                  <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-1.5 w-1.5 rounded-full", stage === "proposta" ? "bg-blue-500" : "bg-purple-500")} />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        {stage === "proposta" ? "Em Proposta" : "Em Negociação"}
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-background border-border font-mono font-bold text-[#3ecf8e]">
                      {formatCurrency(pipelineOpps.filter(o => o.stage === stage).reduce((s, o) => s + Number(o.value), 0)).replace(",00", "")}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-3 flex-1 min-h-[140px]">
                    {pipelineOpps.filter(o => o.stage === stage).map(o => (
                      <div key={o.id} className="bg-secondary/40 border border-border/50 rounded-xl p-3.5 hover:border-[#3ecf8e]/30 transition-all cursor-pointer group"
                        onClick={() => window.location.href = "/pipeline"}>
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <p className="text-xs font-bold text-foreground truncate">{o.client_name}</p>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#3ecf8e] transition-colors" />
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mb-3 leading-relaxed">{o.title}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                          <span className="text-[11px] font-black font-mono text-[#3ecf8e]">{formatCurrency(o.value)}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${o.probability}%` }} />
                            </div>
                            <span className="text-[9px] text-muted-foreground font-bold">{o.probability}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pipelineOpps.filter(o => o.stage === stage).length === 0 && (
                      <div className="h-full flex items-center justify-center py-10 opacity-40">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic">Vazio</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Agenda & Activities */}
          <div className="flex flex-col gap-8">
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-secondary/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <ListTodo className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Agenda</h2>
                  </div>
                </div>
                <Button
                  size="icon"
                  onClick={() => setIsModalOpen(true)}
                  className="h-8 w-8 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black rounded-lg transition-transform hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto no-scrollbar">
                <div className="divide-y divide-border/40">
                  {activities.map(a => {
                    const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.tarefa;
                    const Icon = cfg.icon;
                    const isDone = a.status === "concluida";
                    return (
                      <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent/20 transition-colors group">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", cfg.bg, cfg.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={cn("text-[11px] font-bold truncate tracking-tight", isDone ? "line-through text-muted-foreground" : "text-foreground")}>{a.title}</p>
                          {a.due_date && (
                            <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
                              {new Date(a.due_date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })} · {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => completeActivity(a.id, a.status)}
                          className={cn(
                            "h-6 w-6 rounded-full border flex items-center justify-center transition-all shrink-0",
                            isDone ? "bg-[#3ecf8e] border-[#3ecf8e] text-black" : "border-border text-transparent hover:border-[#3ecf8e] hover:text-[#3ecf8e]"
                          )}
                        >
                          <CheckCircle2 className={cn("h-3 w-3", isDone ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                        </button>
                      </div>
                    );
                  })}

                  {activities.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest italic opacity-40">Sem pendências</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border bg-secondary/10 shrink-0">
                <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-[#3ecf8e]" onClick={() => window.location.href = "/activities"}>
                  Ver Agenda Completa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Activity Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border rounded-xl p-0 overflow-hidden max-w-md shadow-xl">
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">Nova Atividade</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Agende uma tarefa ou compromisso.</DialogDescription>
            </DialogHeader>

            <form onSubmit={addActivity} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Título</Label>
                <Input
                  required autoFocus
                  placeholder="O que precisa ser feito?"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-9 bg-secondary border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Prazo</Label>
                  <Input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="h-9 bg-secondary border-border text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 bg-secondary border border-border rounded-md">
                <Checkbox
                  id="is_public"
                  checked={form.is_public}
                  onCheckedChange={v => setForm({ ...form, is_public: !!v })}
                  className="border-border data-[state=checked]:bg-[#3ecf8e] data-[state=checked]:text-black"
                />
                <Label htmlFor="is_public" className="text-xs text-muted-foreground cursor-pointer">Compartilhar com o time</Label>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-9 border-border text-xs text-muted-foreground">Cancelar</Button>
                <Button type="submit" disabled={busy} className="flex-[2] h-9 bg-[#3ecf8e] text-black font-semibold text-xs hover:bg-[#3ecf8e]/90 gap-2">
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

function KpiCard({ label, value, sub, icon, accent = false, accentColor }: {
  label: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean; accentColor?: string;
}) {
  return (
    <div className={cn("bg-card border rounded-lg p-5 hover:border-[#3ecf8e]/20 transition-colors group", accent ? "border-[#3ecf8e]/15" : "border-border")}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
          accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-secondary text-muted-foreground group-hover:text-[#3ecf8e]",
          accentColor && `bg-opacity-10 ${accentColor}`
        )}>
          {icon}
        </div>
      </div>
      <p className={cn(
        "text-2xl font-bold font-mono tracking-tight",
        accent ? "text-[#3ecf8e]" : (accentColor || "text-foreground")
      )}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
