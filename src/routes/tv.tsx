import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { fetchTeamMetrics, fetchRanking, STAGES, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import {
  Activity, Trophy, TrendingUp, Target, Zap,
  Calendar, ArrowUpRight, User, CheckCircle2,
  BarChart3, Kanban, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import logo from "../public/logo.png";

export const Route = createFileRoute("/tv")({
  head: () => ({ meta: [{ title: "Monitor TV — FortSecure" }] }),
  component: TV,
});

const SLIDE_LABELS = ["Resumo", "KPIs", "Ranking", "Funil", "Vitórias", "Pipeline"];
const SLIDE_COUNT = 6;
const SLIDE_INTERVAL = 15000;

function TV() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number; value: number; color: string }[]>([]);
  const [recentWins, setRecentWins] = useState<any[]>([]);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading]);

  async function load() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const [m, r, oppsRes, winsRes, topRes, meetRes] = await Promise.all([
      fetchTeamMetrics(), fetchRanking(),
      supabase.from("opportunities").select("stage, value"),
      supabase.from("opportunities").select("id, title, value, closed_at, profiles(full_name, avatar_url)").eq("stage", "ganho").order("closed_at", { ascending: false }).limit(5),
      supabase.from("opportunities").select("id, title, value, stage, profiles(full_name, avatar_url)").not("stage", "in", '("ganho","perdido")').order("value", { ascending: false }).limit(5),
      supabase.from("meetings").select("*", { count: "exact", head: true }).gte("scheduled_at", startOfMonth)
    ]);
    setMetrics(m); setRanking(r); setRecentWins(winsRes.data ?? []); setTopDeals(topRes.data ?? []); setMeetingsCount(meetRes.count ?? 0);
    const opps = oppsRes.data ?? [];
    setFunnel(STAGES.map(s => ({ stage: s.label, count: opps.filter(o => o.stage === s.key).length, value: opps.filter(o => o.stage === s.key).reduce((sum, o) => sum + Number(o.value), 0), color: s.color })));
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 2 * 60 * 1000);
    const rot = setInterval(() => setSlide(s => (s + 1) % SLIDE_COUNT), SLIDE_INTERVAL);
    const clk = setInterval(() => setTime(new Date()), 1000);
    const ch = supabase.channel("tv-rt").on("postgres_changes", { event: "*", schema: "public" }, load).subscribe();
    return () => { clearInterval(int); clearInterval(rot); clearInterval(clk); supabase.removeChannel(ch); };
  }, []);

  if (!metrics) return (
    <div className="min-h-screen bg-[#0f0f0f] grid place-items-center">
      <div className="flex flex-col items-center gap-6">
        <Zap className="h-12 w-12 text-[#3ecf8e] animate-pulse" />
        <p className="text-sm font-medium text-[#a3a3a3] uppercase tracking-widest">Sincronizando dados...</p>
      </div>
    </div>
  );

  const slides = [
    <SlideExecutiveSummary key="exec" m={metrics} meetingsCount={meetingsCount} />,
    <SlideKPIs key="kpi" m={metrics} />,
    <SlideRanking key="rank" rows={ranking} />,
    <SlideFunnel key="funnel" funnel={funnel} m={metrics} />,
    <SlideRecentWins key="wins" wins={recentWins} />,
    <SlideTopDeals key="top" deals={topDeals} />,
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#ededed] flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-[#1f1f1f] shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 bg-[#3ecf8e] rounded-lg flex items-center justify-center cursor-pointer" onClick={() => nav({ to: "/dashboard" })}>
            <img src={logo} alt="FortSecure" className="h-5 w-5 object-contain" />
          </div>
          <div>
            <div className="text-base font-semibold text-[#ededed] tracking-tight">FortSecure CRM</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
              <span className="text-[10px] text-[#a3a3a3] uppercase tracking-widest font-medium">
                Tempo Real · {SLIDE_LABELS[slide]} ({slide + 1}/{SLIDE_COUNT})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Slide nav pills */}
          <div className="flex items-center gap-1.5 bg-[#171717] border border-[#2e2e2e] rounded-lg px-3 py-2">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className={cn("h-1.5 rounded-full transition-all duration-500 cursor-pointer",
                  slide === i ? "w-8 bg-[#3ecf8e]" : "w-1.5 bg-[#2e2e2e] hover:bg-[#404040]"
                )} />
            ))}
          </div>

          {/* Clock */}
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-[#ededed] tracking-tighter tabular-nums leading-none">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              <span className="text-sm text-[#a3a3a3] ml-1">{time.toLocaleTimeString("pt-BR", { second: "2-digit" })}</span>
            </div>
            <div className="text-[10px] text-[#737373] uppercase tracking-widest mt-1 font-medium">
              {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
          </div>
        </div>
      </header>

      {/* Slide Area */}
      <main className="flex-1 overflow-hidden p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            {slides[slide]}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ──────────────── Slide: Executive Summary ──────────────── */
function SlideExecutiveSummary({ m, meetingsCount }: any) {
  return (
    <div className="h-full flex flex-col gap-6">
      <SlideTitle label="Status Executivo" sub="Visão consolidada do mês" />
      <div className="grid grid-cols-3 gap-5 flex-1">
        {/* Main attainment */}
        <div className="col-span-2 bg-[#171717] border border-[#2e2e2e] rounded-xl p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-6 right-6 text-[#3ecf8e] opacity-5">
            <Target className="h-32 w-32" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#a3a3a3] uppercase tracking-widest mb-2">Atingimento de Meta Mensal</p>
            <div className="text-[10rem] font-bold text-[#3ecf8e] leading-none tracking-tighter font-mono">
              {m.attainment.toFixed(0)}%
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-2 w-full bg-[#262626] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, m.attainment)}%` }}
                transition={{ duration: 1.2, ease: "circOut" }}
                className="h-full bg-[#3ecf8e] rounded-full"
              />
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-[#737373] uppercase tracking-widest font-medium">Realizado</p>
                <p className="text-2xl font-bold font-mono text-[#ededed]">{formatCurrency(m.revenue)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#737373] uppercase tracking-widest font-medium">Meta</p>
                <p className="text-2xl font-bold font-mono text-[#a3a3a3]">{formatCurrency(m.goal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Side KPIs */}
        <div className="flex flex-col gap-5">
          <TVStatCard icon={<Kanban className="h-5 w-5" />} label="Pipeline Ativo" value={formatCurrency(m.pipelineValue)} sub={`${m.pipelineCount} oportunidades`} />
          <TVStatCard icon={<Calendar className="h-5 w-5" />} label="Reuniões no Mês" value={String(meetingsCount)} sub="Agendamentos confirmados" accent />
          <TVStatCard icon={<TrendingUp className="h-5 w-5" />} label="Conversão" value={`${m.conversion?.toFixed(1) ?? 0}%`} sub="Proposta → Fechado" />
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Slide: KPIs ──────────────── */
function SlideKPIs({ m }: any) {
  const kpis = [
    { label: "Receita Total", value: formatCurrency(m.revenue), sub: "Fechamentos do mês", icon: <TrendingUp className="h-5 w-5" />, accent: true },
    { label: "Forecast", value: formatCurrency(m.forecast ?? 0), sub: "Previsão ponderada", icon: <Zap className="h-5 w-5" />, accent: false },
    { label: "Vendido Hoje", value: formatCurrency(m.todayRevenue ?? 0), sub: "Tempo real", icon: <ArrowUpRight className="h-5 w-5" />, accent: true },
    { label: "Atividades", value: String(m.activitiesPending ?? 0), sub: "Tarefas pendentes", icon: <Activity className="h-5 w-5" />, accent: false },
    { label: "Conversão", value: `${m.conversion?.toFixed(1) ?? 0}%`, sub: "Taxa de eficiência", icon: <BarChart3 className="h-5 w-5" />, accent: true },
    { label: "Reuniões", value: String(m.meetingsCount ?? 0), sub: "Mês corrente", icon: <Clock className="h-5 w-5" />, accent: false },
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      <SlideTitle label="Placar de KPIs" sub="Indicadores operacionais em tempo real" />
      <div className="grid grid-cols-3 gap-5 flex-1">
        {kpis.map(k => (
          <TVStatCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} accent={k.accent} large />
        ))}
      </div>
    </div>
  );
}

/* ──────────────── Slide: Ranking ──────────────── */
function SlideRanking({ rows }: { rows: RankingRow[] }) {
  return (
    <div className="h-full flex flex-col gap-6">
      <SlideTitle label="Ranking de Performance" sub="Classificação por receita gerada" />
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {rows.slice(0, 6).map((r, i) => (
          <motion.div key={r.user_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
            className={cn("flex items-center gap-5 p-5 rounded-xl border transition-all",
              i === 0 ? "bg-[#3ecf8e]/5 border-[#3ecf8e]/20" : "bg-[#171717] border-[#2e2e2e]"
            )}>
            <span className={cn("text-3xl font-bold font-mono w-12 text-center tabular-nums", i === 0 ? "text-[#3ecf8e]" : "text-[#404040]")}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <Avatar className="h-12 w-12 rounded-lg border border-[#2e2e2e]">
              <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-[#262626] text-sm font-bold text-[#ededed]">{r.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-[#ededed] truncate flex items-center gap-2">
                {r.full_name}
                {i === 0 && <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />}
              </div>
              <div className="text-xs text-[#737373] mt-0.5">{r.attainment?.toFixed(0) ?? 0}% da meta · {r.closed_count} negócios</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-[#ededed]">{formatCurrency(r.closed_value)}</div>
              <div className="text-[10px] text-[#3ecf8e] uppercase tracking-widest mt-0.5 font-medium">{r.points} XP</div>
            </div>
          </motion.div>
        ))}
        {rows.length === 0 && <EmptyState text="Nenhum dado de ranking disponível" />}
      </div>
    </div>
  );
}

/* ──────────────── Slide: Funnel ──────────────── */
function SlideFunnel({ funnel, m }: any) {
  const max = Math.max(...funnel.map((f: any) => f.value), 1);
  return (
    <div className="h-full flex flex-col gap-6">
      <SlideTitle label="Funil de Vendas" sub="Distribuição de oportunidades por estágio" />
      <div className="grid grid-cols-[1fr_280px] gap-6 flex-1">
        <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl p-6 flex flex-col gap-5 justify-center">
          {funnel.map((f: any, i: number) => (
            <motion.div key={f.stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[#a3a3a3] font-medium">{f.stage}</span>
                  <Badge variant="outline" className="text-[10px] border-[#2e2e2e] text-[#737373] bg-transparent">{f.count}</Badge>
                </div>
                <span className="font-mono font-semibold text-[#ededed]">{formatCurrency(f.value)}</span>
              </div>
              <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(f.value / max) * 100}%` }}
                  transition={{ duration: 1, ease: "circOut", delay: i * 0.08 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: f.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-[#3ecf8e]/5 border border-[#3ecf8e]/15 rounded-xl p-6 flex flex-col justify-center flex-1">
            <p className="text-xs text-[#a3a3a3] uppercase tracking-widest font-medium mb-2">Taxa de Conversão</p>
            <div className="text-7xl font-bold text-[#3ecf8e] leading-none font-mono">{m.conversion?.toFixed(1) ?? 0}%</div>
          </div>
          <div className="bg-[#171717] border border-[#2e2e2e] rounded-xl p-6 flex flex-col justify-center flex-1">
            <p className="text-xs text-[#a3a3a3] uppercase tracking-widest font-medium mb-2">Total no Pipeline</p>
            <div className="text-3xl font-bold text-[#ededed] leading-none font-mono">{formatCurrency(m.pipelineValue)}</div>
            <div className="text-xs text-[#737373] mt-1">{m.pipelineCount} oportunidades</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Slide: Recent Wins ──────────────── */
function SlideRecentWins({ wins }: { wins: any[] }) {
  return (
    <div className="h-full flex flex-col gap-6">
      <SlideTitle label="Vitórias Recentes" sub="Últimos negócios fechados" />
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {wins.map((w, i) => (
          <motion.div key={w.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
            className="flex items-center gap-5 p-5 bg-[#3ecf8e]/5 border border-[#3ecf8e]/15 rounded-xl">
            <div className="h-12 w-12 rounded-lg bg-[#3ecf8e] flex items-center justify-center text-2xl shrink-0">💰</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-[#ededed] truncate">{w.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-5 w-5 border border-[#2e2e2e]">
                  <AvatarImage src={w.profiles?.avatar_url} />
                  <AvatarFallback className="text-[9px] bg-[#262626] text-[#ededed]">{w.profiles?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-[#3ecf8e] font-medium">{w.profiles?.full_name}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold font-mono text-[#ededed]">{formatCurrency(w.value)}</div>
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#3ecf8e] uppercase tracking-widest font-medium">
                <CheckCircle2 className="h-3 w-3" /> Fechado
              </div>
            </div>
          </motion.div>
        ))}
        {wins.length === 0 && <EmptyState text="Monitorando fechamentos em tempo real..." />}
      </div>
    </div>
  );
}

/* ──────────────── Slide: Top Deals ──────────────── */
function SlideTopDeals({ deals }: { deals: any[] }) {
  return (
    <div className="h-full flex flex-col gap-6">
      <SlideTitle label="Destaques do Pipeline" sub="Maiores oportunidades em andamento" />
      <div className="flex flex-col gap-3 flex-1 overflow-hidden">
        {deals.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="flex items-center gap-5 p-5 bg-[#171717] border border-[#2e2e2e] rounded-xl hover:border-[#3ecf8e]/20 transition-all">
            <span className="text-4xl font-bold font-mono text-[#2e2e2e] w-12 text-center tabular-nums">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-[#ededed] truncate">{d.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-5 w-5 border border-[#2e2e2e]">
                  <AvatarImage src={d.profiles?.avatar_url} />
                  <AvatarFallback className="text-[9px] bg-[#262626] text-[#ededed]">{d.profiles?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-[#a3a3a3]">{d.profiles?.full_name}</span>
                <Badge variant="outline" className="text-[9px] border-[#2e2e2e] text-[#737373] bg-transparent capitalize ml-1">{d.stage}</Badge>
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-[#ededed] shrink-0">{formatCurrency(d.value)}</div>
          </motion.div>
        ))}
        {deals.length === 0 && <EmptyState text="Nenhuma oportunidade ativa" />}
      </div>
    </div>
  );
}

/* ──────────────── Shared Components ──────────────── */
function SlideTitle({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 pb-2 border-b border-[#1f1f1f]">
      <div className="h-5 w-1 bg-[#3ecf8e] rounded-full" />
      <div>
        <h2 className="text-xl font-semibold text-[#ededed]">{label}</h2>
        <p className="text-xs text-[#737373] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function TVStatCard({ icon, label, value, sub, accent = false, large = false }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean; large?: boolean;
}) {
  return (
    <div className={cn("bg-[#171717] border rounded-xl p-5 flex flex-col justify-between", accent ? "border-[#3ecf8e]/15" : "border-[#2e2e2e]", large && "flex-1")}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">{label}</p>
        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-[#262626] text-[#737373]")}>{icon}</div>
      </div>
      <div className={cn("font-bold font-mono leading-none tracking-tight", large ? "text-4xl" : "text-3xl", accent ? "text-[#3ecf8e]" : "text-[#ededed]")}>{value}</div>
      <p className="text-xs text-[#737373] mt-2">{sub}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center border border-dashed border-[#2e2e2e] rounded-xl">
      <p className="text-sm text-[#737373] uppercase tracking-widest font-medium">{text}</p>
    </div>
  );
}
