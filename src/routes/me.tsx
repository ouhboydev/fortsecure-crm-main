import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAppSettings } from "@/lib/sales";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  TrendingUp, Target, Award, Plus, Zap,
  PhoneCall, Mail, Users, ListTodo,
  CheckCircle2, Clock, Loader2, ArrowUpRight,
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
  tarefa:   { icon: ListTodo, color: "text-[#a3a3a3]", bg: "bg-[#262626]" },
  ligacao:  { icon: PhoneCall, color: "text-[#3ecf8e]", bg: "bg-[#3ecf8e]/10" },
  email:    { icon: Mail, color: "text-[#1eaedb]", bg: "bg-[#1eaedb]/10" },
  reuniao:  { icon: Users, color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10" },
  followup: { icon: Target, color: "text-[#a78bfa]", bg: "bg-[#a78bfa]/10" },
};

function MyPanel() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [rank, setRank] = useState<string>("--");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", type: "tarefa", due_date: "", is_public: false });

  async function load() {
    if (!user) return;
    const [oppsRes, actsRes, badgeRes, settings, rankRes] = await Promise.all([
      supabase.from("opportunities").select("*").eq("owner_id", user.id),
      supabase.from("activities").select("*").eq("owner_id", user.id).order("due_date", { ascending: true }).limit(5),
      supabase.from("badges").select("*, badges(*)").eq("user_id", user.id),
      fetchAppSettings(),
      supabase.rpc("get_ranking"),
    ]);

    const opps = oppsRes.data ?? [];
    const won = opps.filter(o => o.stage === "ganho");
    const revenue = won.reduce((sum, o) => sum + Number(o.value), 0);
    const pipe = opps.filter(o => !["ganho", "perdido"].includes(o.stage)).reduce((sum, o) => sum + Number(o.value), 0);
    const rate = Number(settings.commission_rate || 15);
    const commission = (revenue * rate) / 100;
    const points = won.length;

    if (rankRes.data) {
      const ranking = rankRes.data as any[];
      const myIndex = ranking.findIndex(r => r.user_id === user.id);
      if (myIndex !== -1) setRank(`#${String(myIndex + 1).padStart(2, "0")}`);
    }

    setMetrics({ revenue, pipeline: pipe, count: won.length, points, commission });
    setActivities(actsRes.data ?? []);
    setBadges(badgeRes.data ?? []);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Olá, {displayName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aqui está a sua performance individual.</p>
        </div>
        {/* Status pill */}
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ranking</p>
            <p className="text-base font-bold font-mono text-foreground">{rank}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">XP</p>
            <p className="text-base font-bold font-mono text-[#3ecf8e]">{metrics.points}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <Badge className="bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/20 text-[9px] font-semibold uppercase tracking-wide">
            Vendedor Ativo
          </Badge>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Receita Liquidada"
          value={formatCurrency(metrics.revenue)}
          sub={`${metrics.count} negócio${metrics.count !== 1 ? "s" : ""} ganho${metrics.count !== 1 ? "s" : ""}`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent
        />
        <KpiCard
          label="Volume em Negociação"
          value={formatCurrency(metrics.pipeline)}
          sub="Pipeline ativo"
          icon={<Target className="h-4 w-4" />}
        />
        <KpiCard
          label="Comissões Estimadas"
          value={formatCurrency(metrics.commission)}
          sub={`Taxa de ${metrics.revenue > 0 ? ((metrics.commission / metrics.revenue) * 100).toFixed(1) : 15}%`}
          icon={<Award className="h-4 w-4" />}
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        {/* Left: Activities */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Atividades Recentes</h2>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="h-7 px-3 gap-1.5 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-[10px] rounded-md"
            >
              <Plus className="h-3 w-3" /> Nova Atividade
            </Button>
          </div>

          {/* Activity list */}
          <div className="divide-y divide-border">
            {activities.map(a => {
              const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.tarefa;
              const Icon = cfg.icon;
              const isDone = a.status === "concluida";
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors group">
                  {/* Type icon */}
                  <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", cfg.bg, cfg.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", isDone ? "line-through text-muted-foreground" : "text-foreground")}>{a.title}</p>
                    {a.due_date && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(a.due_date).toLocaleDateString("pt-BR")} · {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>

                  {/* Badge type */}
                  <Badge variant="outline" className="text-[9px] border-border text-muted-foreground hidden sm:flex shrink-0">
                    {cfg.icon === ListTodo ? "Tarefa" : a.type}
                  </Badge>

                  {/* Complete button */}
                  <button
                    onClick={() => completeActivity(a.id, a.status)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                      isDone ? "bg-[#3ecf8e] border-[#3ecf8e] text-black" : "border-border text-transparent hover:border-[#3ecf8e] hover:text-[#3ecf8e]"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {activities.length === 0 && (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                </div>
                Nenhuma atividade registrada
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Badges */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Especializações</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {badges.slice(0, 4).map(b => (
                <div key={b.id} className="bg-secondary border border-border rounded-md p-3 flex flex-col items-center text-center hover:border-[#3ecf8e]/30 transition-all group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{b.badges?.icon || "🏅"}</div>
                  <div className="text-[10px] font-semibold text-foreground leading-tight">{b.badges?.name || "Conquista"}</div>
                </div>
              ))}
              {badges.length === 0 && (
                <div className="col-span-2 py-8 text-center text-[10px] text-muted-foreground border border-dashed border-border rounded-md">
                  Nenhuma especialização desbloqueada
                </div>
              )}
            </div>
          </div>

          {/* Next level progress */}
          <div className="bg-[#3ecf8e]/5 border border-[#3ecf8e]/15 rounded-lg p-5 relative overflow-hidden group">
            <div className="absolute right-4 top-4 text-[#3ecf8e]/10 group-hover:text-[#3ecf8e]/15 transition-colors">
              <Zap className="h-16 w-16" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-[#3ecf8e]" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-[#3ecf8e] transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Próximo Escalão</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Faltam <span className="text-[#3ecf8e] font-semibold">{Math.max(0, 5 - metrics.count)} negócios</span> para atingir <span className="text-foreground font-medium">Especialista III</span>.
              </p>
              <div className="h-1.5 w-full bg-background rounded-full mt-4 overflow-hidden border border-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (metrics.count / 5) * 100)}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                  className="h-full bg-[#3ecf8e] rounded-full"
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-muted-foreground">{metrics.count} negócios</span>
                <span className="text-[9px] text-muted-foreground">Meta: 5</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo Rápido</h2>
            {[
              { label: "Taxa de Conversão", value: metrics.count > 0 ? `${((metrics.count / Math.max(1, metrics.count + 2)) * 100).toFixed(0)}%` : "0%", color: "text-[#3ecf8e]" },
              { label: "Ticket Médio", value: metrics.count > 0 ? formatCurrency(metrics.revenue / metrics.count) : "—", color: "text-foreground" },
              { label: "Comissão / Negócio", value: metrics.count > 0 ? formatCurrency(metrics.commission / metrics.count) : "—", color: "text-foreground" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className={cn("text-xs font-semibold font-mono", item.color)}>{item.value}</span>
              </div>
            ))}
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

function KpiCard({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={cn("bg-card border rounded-lg p-5 hover:border-[#3ecf8e]/20 transition-colors group", accent ? "border-[#3ecf8e]/15" : "border-border")}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center transition-colors", accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-secondary text-muted-foreground group-hover:text-[#3ecf8e]")}>
          {icon}
        </div>
      </div>
      <p className={cn("text-2xl font-bold font-mono tracking-tight", accent ? "text-[#3ecf8e]" : "text-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
