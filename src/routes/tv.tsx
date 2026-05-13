import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { fetchTeamMetrics, fetchRanking, STAGES, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import { Trophy, TrendingUp, Target, Zap, Activity, CheckCircle2, ArrowUpRight, Flame, ChevronRight, ChevronLeft, Maximize, Minimize, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Legend, LineChart, Line
} from "recharts";
import logo from "../public/logo.png";

export const Route = createFileRoute("/tv")({
  head: () => ({ meta: [{ title: "TV — FortSecure" }] }),
  component: TV,
});

function getQuarterLabel() {
  const m = new Date().getMonth();
  return `Q${Math.floor(m / 3) + 1}`;
}

function RadialRing({ pct, color: customColor }: { pct: number; color?: string }) {
  const r = 80, cx = 100, cy = 100;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct, 100) / 100 * circ;
  const color = customColor || (pct >= 100 ? "#3ecf8e" : pct >= 60 ? "#f59e0b" : "#e53e3e");
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth="14" />
      <motion.circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.6, ease: "circOut" }}
        transform={`rotate(-90 ${cx} ${cy})`}
        filter="url(#glow)"
      />
      <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="34" fontWeight="800" fontFamily="monospace">
        {Math.round(pct)}%
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize="11" fontFamily="sans-serif" letterSpacing="2">
        ATINGIMENTO
      </text>
    </svg>
  );
}function WinsTicker({ wins }: { wins: any[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!wins.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % wins.length), 4000);
    return () => clearInterval(t);
  }, [wins.length]);
  if (!wins.length) return (
    <div className="flex items-center gap-3 text-muted-foreground/40 text-sm font-bold tracking-tight">
      <Zap className="h-4 w-4" /> Aguardando fechamentos...
    </div>
  );
  const w = wins[idx];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, type: "spring" }}
        className="flex items-center gap-4">
        <span className="text-xl drop-shadow-md">💰</span>
        <span className="text-primary font-black text-sm truncate max-w-[280px] tracking-tight">{w.title}</span>
        <span className="text-muted-foreground font-bold text-xs shrink-0">{w.profiles?.full_name}</span>
        <span className="ml-auto font-mono font-black text-foreground text-base shrink-0 tracking-tighter">{formatCurrency(w.value)}</span>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Slide 1: Visão Geral (KPIs) ──
function SlideOverview({ metrics, q }: { metrics: any; q: string }) {
  return (
    <div className="flex-1 p-8 relative z-10 flex flex-col gap-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-1 drop-shadow-[0_0_8px_rgba(62,207,142,0.5)]">Command Center</p>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">Visão Geral {q}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
        <KpiBox label="Receita Total" value={formatCurrency(metrics.revenue)} sub="Valor líquido ganho" icon={<TrendingUp className="h-5 w-5" />} accent />
        <KpiBox label="Pipeline Ativo" value={formatCurrency(metrics.pipelineValue)} sub={`${metrics.pipelineCount} oportunidades`} icon={<Activity className="h-5 w-5" />} />
        <KpiBox label="Forecast" value={formatCurrency(metrics.forecast ?? 0)} sub="Previsão de fechamento" icon={<Zap className="h-5 w-5" />} />
        <KpiBox label="Taxa Conversão" value={`${(metrics.conversion ?? 0).toFixed(1)}%`} sub="Média da equipe" icon={<ArrowUpRight className="h-5 w-5" />} accent />
      </div>

      <div className="grid grid-cols-3 gap-6 h-40">
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
          <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2 relative z-10">Gap para Meta</p>
          <p className="text-4xl font-mono font-black text-destructive/90 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)] relative z-10 tracking-tighter">{formatCurrency(Math.max(0, metrics.goal - metrics.revenue))}</p>
        </div>
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
          <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2 relative z-10">Receita Hoje</p>
          <p className="text-4xl font-mono font-black text-primary drop-shadow-[0_0_15px_rgba(62,207,142,0.3)] relative z-10 tracking-tighter">{formatCurrency(metrics.todayRevenue)}</p>
        </div>
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
          <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2 relative z-10">Dias Restantes</p>
          <p className="text-4xl font-mono font-black text-foreground relative z-10 tracking-tighter">
            {Math.ceil((new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3 + 3, 0).getTime() - new Date().getTime()) / (1000 * 3600 * 24))}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Slide Novo: Grid de Produtos (Layout Premium) ──
function SlideProductGrid({ products }: { products: any[] }) {
  return (
    <div className="flex-1 p-8 relative z-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-1 drop-shadow-[0_0_8px_rgba(62,207,142,0.5)]">Portfólio</p>
          <h2 className="text-4xl font-black text-foreground tracking-tighter">Performance por Solução</h2>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-card/60 backdrop-blur-md border border-border/50 rounded-full shadow-lg">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(62,207,142,0.8)]" />
          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{products.length} Ativos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-[calc(100%-100px)]">
        {products.slice(0, 6).map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.6, type: "spring", stiffness: 100 }}
            className="relative bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden group"
          >
            {/* Ambient Glow */}
            <div
              className="absolute -top-24 -right-24 w-56 h-56 blur-[80px] opacity-20 transition-opacity duration-700 group-hover:opacity-40 pointer-events-none"
              style={{ backgroundColor: p.color }}
            />

            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em]">Produto</p>
                <h3 className="text-2xl font-black text-foreground leading-tight tracking-tighter max-w-[200px]">{p.name}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-foreground/5 border border-foreground/10 text-foreground shadow-xl">
                <Package className="h-6 w-6" />
              </div>
            </div>

            <div className="flex items-center gap-8 my-6 relative z-10">
              <div className="w-36 h-36 shrink-0 drop-shadow-2xl">
                <RadialRing pct={p.pct} color={p.color} />
              </div>
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Realizado</p>
                  <p className="text-3xl font-mono font-black text-foreground tabular-nums tracking-tighter drop-shadow-md">{formatCurrency(p.realized)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Objetivo</p>
                  <p className="text-lg font-mono font-bold text-muted-foreground/60 tabular-nums">{formatCurrency(p.goal)}</p>
                </div>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="relative z-10 pt-5 border-t border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Atingimento Global</span>
                <span className="text-xs font-mono font-black drop-shadow-[0_0_5px_currentColor]" style={{ color: p.color }}>{Math.round(p.pct)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: p.color, boxShadow: `0 0 15px ${p.color}60` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, p.pct)}%` }}
                  transition={{ duration: 1.5, delay: i * 0.1 + 0.5, ease: "circOut" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-4 text-muted-foreground/20">
            <Package className="h-16 w-16" />
            <p className="text-lg font-medium tracking-tight">Sem metas de produtos configuradas</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slide 3: Performance Mix (Ranking + Funil) ──
function SlidePerformanceMix({ ranking, funnel, metrics }: { ranking: RankingRow[]; funnel: any[]; metrics: any }) {
  const funnelMax = Math.max(...funnel.map(f => f.value), 1);
  return (
    <div className="flex-1 grid grid-cols-2 gap-8 p-8 relative z-10">
      {/* Ranking */}
      <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 blur-[80px] pointer-events-none" />
        <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between shrink-0 bg-white/[0.01] relative z-10">
          <div>
            <p className="text-xs text-warning uppercase tracking-[0.3em] font-black mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">Classificação</p>
            <h2 className="text-2xl font-black text-foreground tracking-tighter">Ranking de Vendas</h2>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Trophy className="h-6 w-6 text-warning" />
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col divide-y divide-border/30 relative z-10">
          {ranking.slice(0, 7).map((r, i) => (
            <motion.div key={r.user_id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, type: "spring" }}
              className={cn("flex items-center gap-4 px-6 py-3.5 transition-colors", i === 0 ? "bg-warning/5" : "hover:bg-white/[0.02]")}>
              <span className={cn("text-3xl font-black font-mono w-10 text-center tabular-nums shrink-0",
                i === 0 ? "text-warning drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]" : i === 1 ? "text-muted-foreground/80" : i === 2 ? "text-orange-400/80" : "text-muted-foreground/20")}>
                {i + 1}
              </span>
              <Avatar className="h-10 w-10 rounded-xl border border-border/50 shrink-0 shadow-lg">
                <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-xs font-bold text-foreground">{r.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-foreground truncate flex items-center gap-2 tracking-tight">
                  {r.full_name}{i === 0 && <Flame className="h-4 w-4 text-warning shrink-0" />}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, r.attainment ?? 0)}%` }}
                      transition={{ duration: 1.5, ease: "circOut", delay: i * 0.08 }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono font-bold shrink-0">{(r.attainment ?? 0).toFixed(0)}%</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black font-mono text-foreground tracking-tighter">{formatCurrency(r.closed_value)}</p>
                <p className="text-[10px] text-primary font-black mt-1 uppercase tracking-[0.1em]">{r.points} XP</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Funil */}
      <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] flex flex-col p-8 gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-1 drop-shadow-[0_0_8px_rgba(62,207,142,0.5)]">Pipeline</p>
          <h2 className="text-2xl font-black text-foreground tracking-tighter">Funil de Vendas</h2>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-8 relative z-10">
          {funnel.map((f, i) => (
            <motion.div key={f.stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-md shrink-0 shadow-sm" style={{ backgroundColor: f.color }} />
                  <span className="text-muted-foreground font-bold text-base tracking-tight">{f.stage}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground/60 font-mono text-xs font-bold">{f.count}</span>
                </div>
                <span className="font-mono font-black text-foreground text-lg tracking-tighter">{formatCurrency(f.value)}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ backgroundColor: f.color, boxShadow: `0 0 10px ${f.color}40` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(f.value / funnelMax) * 100}%` }}
                  transition={{ duration: 1.5, ease: "circOut", delay: i * 0.1 }} />
              </div>
            </motion.div>
          ))}
        </div>
        <div className="border-t border-border/50 pt-6 grid grid-cols-2 gap-6 relative z-10">
          <div className="bg-white/[0.02] rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">Conversão</p>
            <p className="text-3xl font-black font-mono text-warning drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] tracking-tighter">{(metrics.conversion ?? 0).toFixed(1)}%</p>
          </div>
          <div className="bg-white/[0.02] rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-1">Forecast</p>
            <p className="text-3xl font-black font-mono text-foreground tracking-tighter">{formatCurrency(metrics.forecast ?? 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide 4: Evolução de Receita (Bulletproof Line Chart) ──
function SlideGoalVsRevenue({ metrics, chartData, q }: { metrics: any; chartData: any[]; q: string }) {
  const fmt = (v: number) => {
    if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
    return `R$${v}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl px-5 py-4 shadow-2xl">
        <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-3">Dia {label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-3 mb-2 last:mb-0">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
            <p className="text-base font-mono font-black" style={{ color: p.color }}>
              {p.name === "receita" ? "Realizado" : "Meta"}: {formatCurrency(p.value)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Activity className="h-16 w-16 text-primary animate-pulse opacity-20" />
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest font-black">Aguardando dados de performance...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-10 flex flex-col items-center justify-center min-h-0 overflow-hidden relative z-10">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-end justify-between mb-12 shrink-0">
        <div>
          <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-2 drop-shadow-[0_0_8px_rgba(62,207,142,0.5)]">Performance Executive {q}</p>
          <h2 className="text-5xl font-black text-foreground tracking-tighter">Evolução de Meta</h2>
        </div>

        <div className="flex items-center gap-12 bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-6 shadow-2xl">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Realizado</p>
            <p className="text-4xl font-black font-mono text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(62,207,142,0.4)]">{formatCurrency(metrics.revenue)}</p>
          </div>
          <div className="h-16 w-px bg-border/50" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Meta Global</p>
            <p className="text-4xl font-black font-mono text-foreground opacity-50 tracking-tighter">{formatCurrency(metrics.goal)}</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="w-full max-w-6xl relative bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] p-8 shadow-2xl" style={{ height: '450px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
              axisLine={{ stroke: "var(--border)", opacity: 0.5 }}
              tickLine={false}
              dy={15}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              width={85}
            />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="meta"
              name="meta"
              stroke="var(--muted-foreground)"
              strokeWidth={3}
              strokeDasharray="8 6"
              fill="transparent"
              dot={false}
              activeDot={false}
              opacity={0.4}
            />

            <Area
              type="monotone"
              dataKey="receita"
              name="receita"
              stroke="var(--primary)"
              strokeWidth={5}
              fill="url(#colorRevenue)"
              dot={{ r: 6, fill: 'var(--card)', stroke: 'var(--primary)', strokeWidth: 3 }}
              activeDot={{ r: 10, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 4 }}
              connectNulls
              style={{ filter: "drop-shadow(0px 10px 15px rgba(62,207,142,0.3))" }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="absolute top-8 right-8 flex flex-col gap-4 bg-background/50 backdrop-blur-md p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4 justify-end">
            <span className="text-[10px] text-foreground uppercase font-black tracking-[0.2em]">Receita Realizada</span>
            <div className="h-2 w-12 rounded-full bg-primary shadow-[0_0_15px_rgba(62,207,142,0.5)]" />
          </div>
          <div className="flex items-center gap-4 justify-end">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">Meta Projetada</span>
            <div className="h-[3px] w-12 border-t-4 border-dashed border-muted-foreground/40" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3 opacity-40 bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
        <Activity className="h-4 w-4 text-primary animate-pulse" />
        <p className="text-[10px] text-foreground uppercase tracking-[0.2em] font-black">Monitoramento de Meta em Tempo Real</p>
      </div>
    </div>
  );
}

const SLIDES = ["overview", "produtos", "performance", "objetivo"] as const;
const SLIDE_DURATION = 15000; // 15s per slide

function TV() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [recentWins, setRecentWins] = useState<any[]>([]);
  const [productGoals, setProductGoals] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());
  const [slide, setSlide] = useState(0);
  const [productIdx, setProductIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ticks, setTicks] = useState(0); // For timing non-achievement slides

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading]);

  async function load() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const qMonths = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];

    const [oppsRes, profilesRes, goalsRes, rolesRes, settingsRes, prodsRes, activitiesRes] = await Promise.all([
      supabase.from("opportunities").select("*"),
      supabase.from("profiles").select("id, full_name, avatar_url, points"),
      supabase.from("goals").select("*").eq("year", now.getFullYear()),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("app_settings").select("*").eq("key", "global_revenue_goal").single(),
      supabase.from("products").select("*"),
      supabase.from("activities").select("*"),
    ]);

    const opps = (oppsRes.data || []) as any[];
    const allProfiles = (profilesRes.data || []) as any[];
    const roles = (rolesRes.data || []) as any[];
    const sellerIds = roles.filter(r => r.role === 'vendedor').map(r => r.user_id);
    const sellers = allProfiles.filter(p => sellerIds.includes(p.id));

    // Cumulative Revenue
    const periodWonOpps = opps.filter(o =>
      o.stage === "ganho" && o.closed_at &&
      qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
      new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
    );
    const revenue = periodWonOpps.reduce((s, o) => s + Number(o.value), 0);

    // Today's Revenue
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayRevenue = opps.filter(o => o.stage === "ganho" && o.closed_at && o.closed_at >= startDay).reduce((s, o) => s + Number(o.value), 0);

    // Pipeline
    const pipeline = opps.filter(o => !["ganho", "perdido"].includes(o.stage));
    const pipelineValue = pipeline.reduce((s, o) => s + Number(o.value), 0);
    const weighted = pipeline.reduce((s, o) => s + (Number(o.value) * (o.probability || 0)) / 100, 0);

    // Goal calculation (Strictly Quarterly)
    const annualHqGoal = settingsRes.data?.value ? Number(settingsRes.data.value) : 7500000;
    const goal = (annualHqGoal / 12) * qMonths.length; // Will be 3 months

    const proposalOpps = opps.filter(o => ["proposta", "negociacao", "ganho", "perdido"].includes(o.stage));
    const conversion = proposalOpps.length > 0 ? (opps.filter(o => o.stage === "ganho").length / proposalOpps.length) * 100 : 0;

    const m = {
      revenue, todayRevenue, pipelineValue, weighted, goal,
      attainment: goal > 0 ? (revenue / goal) * 100 : 0,
      conversion,
      pipelineCount: pipeline.length,
      forecast: revenue + weighted,
    };

    setMetrics(m);

    // Ranking (Cumulative YTD)
    const rData = sellers.map(p => {
      const pWonOpps = opps.filter(o =>
        o.owner_id === p.id && o.stage === "ganho" && o.closed_at &&
        qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
        new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
      );
      const pClosedVal = pWonOpps.reduce((s, o) => s + Number(o.value), 0);
      const pGoalRes = (goalsRes.data || []).find(g => g.user_id === p.id && g.month === 0);
      const pGoal = pGoalRes ? (Number(pGoalRes.target_amount) / 12) * qMonths.length : (goal / sellers.length);

      return {
        user_id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        points: p.points || 0,
        closed_value: pClosedVal,
        attainment: pGoal > 0 ? (pClosedVal / pGoal) * 100 : 0
      };
    }).sort((a, b) => b.points - a.points || b.closed_value - a.closed_value);

    setRanking(rData as any);
    setRecentWins(opps.filter(o => o.stage === "ganho").map(o => ({ ...o, profiles: allProfiles.find(p => p.id === o.owner_id) })).slice(0, 8));

    setFunnel(STAGES.map(s => ({
      stage: s.label, color: s.color,
      count: opps.filter(o => o.stage === s.key).length,
      value: opps.filter(o => o.stage === s.key).reduce((sum, o) => sum + Number(o.value), 0),
    })));

    // Product goals for the cumulative period
    const activeProds = (prodsRes.data || []).filter((p: any) => p.metadata?.goal_active);
    const pGoals = activeProds.map((p: any) => {
      const pOpps = opps.filter(o =>
        o.metadata?.product_id === p.id &&
        o.stage === "ganho" &&
        o.closed_at &&
        qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
        new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
      );
      const realized = pOpps.reduce((sum, o) => sum + Number(o.value), 0);
      const qKey = `goal_q${quarter + 1}`;
      const pGoal = Number(p.metadata?.[qKey] || 0);
      return {
        name: p.name,
        realized,
        goal: pGoal,
        pct: pGoal > 0 ? (realized / pGoal) * 100 : 0,
        color: p.metadata?.color || "#3ecf8e"
      };
    });
    setProductGoals(pGoals);

    // Daily cumulative revenue chart data for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyGoal = m.goal / daysInMonth;
    const monthWins = opps.filter(o =>
      o.stage === "ganho" && o.closed_at &&
      new Date(o.closed_at).getMonth() === now.getMonth() &&
      new Date(o.closed_at).getFullYear() === now.getFullYear()
    );
    let cumRevenue = 0;
    const cd: any[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayWins = monthWins.filter(o => new Date(o.closed_at!).getDate() === d);
      cumRevenue += dayWins.reduce((s: number, o: any) => s + Number(o.value), 0);
      cd.push({
        day: d,
        label: `${d}/${now.getMonth() + 1}`,
        receita: d <= now.getDate() ? cumRevenue : null,
        meta: Math.round(dailyGoal * d),
      });
    }
    setChartData(cd);
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 2 * 60 * 1000);
    const clk = setInterval(() => setTime(new Date()), 1000);
    const ch = supabase.channel("tv-rt").on("postgres_changes", { event: "*", schema: "public" }, load).subscribe();
    return () => { clearInterval(int); clearInterval(clk); supabase.removeChannel(ch); };
  }, []);

  // Auto-advance logic (Simple 15s per slide)
  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_DURATION);
    return () => clearInterval(t);
  }, [autoPlay]);

  if (!metrics) return (
    <div className="dark min-h-screen bg-background grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <Zap className="h-14 w-14 text-primary" />
        </motion.div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Inicializando aplicação...</p>
      </div>
    </div>
  );

  const q = getQuarterLabel();
  const currentSlideName = SLIDES[slide];

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      <div className="fixed inset-0 pointer-events-none opacity-40" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "64px 64px"
      }} />
      <motion.div 
        className="fixed top-0 left-1/4 right-1/4 h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none"
        animate={{ opacity: [0.2, 0.4, 0.2], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent z-50" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-border/50 shrink-0 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(62,207,142,0.3)] cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={() => nav({ to: "/dashboard" })}>
            <img src={logo} alt="FortSecure" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tighter">FortSecure</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Live · {q} {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 mx-16 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl px-6 py-3 overflow-hidden shadow-lg">
          <div className="flex items-center gap-3 mb-1.5">
            <Flame className="h-4 w-4 text-warning shrink-0" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Últimos Fechamentos</span>
          </div>
          <WinsTicker wins={recentWins} />
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={toggleFullscreen}
            className="h-10 w-10 rounded-xl bg-card/40 backdrop-blur-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:shadow-[0_0_15px_rgba(62,207,142,0.2)] transition-all"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <div className="text-right">
            <div className="text-4xl font-black font-mono text-foreground tabular-nums leading-none tracking-tighter">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              <span className="text-xl text-muted-foreground/40 ml-1">{time.toLocaleTimeString("pt-BR", { second: "2-digit" })}</span>
            </div>
            <div className="text-[10px] text-primary uppercase tracking-[0.2em] mt-1.5 font-black">
              {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
          </div>
        </div>
      </header>

      {/* Slide indicators */}
      <div className="relative z-10 flex items-center justify-center gap-2 py-2 bg-background/60">
        {SLIDES.map((s, i) => (
          <button
            key={s}
            onClick={() => { setSlide(i); setAutoPlay(false); setTimeout(() => setAutoPlay(true), 30000); }}
            className={cn("h-1 rounded-full transition-all duration-300", i === slide ? "w-8 bg-primary" : "w-4 bg-muted hover:bg-muted-foreground/30")}
          />
        ))}
        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className={cn("ml-4 text-[10px] px-2 py-0.5 rounded border font-mono", autoPlay ? "border-primary/30 text-primary" : "border-border text-muted-foreground")}
        >
          {autoPlay ? "AUTO" : "MANUAL"}
        </button>
      </div>

      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div key={slide} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.4 }} className="flex flex-col flex-1">
          {currentSlideName === "overview" && <SlideOverview metrics={metrics} q={q} />}
          {currentSlideName === "produtos" && <SlideProductGrid products={productGoals} />}
          {currentSlideName === "performance" && <SlidePerformanceMix ranking={ranking} funnel={funnel} metrics={metrics} />}
          {currentSlideName === "objetivo" && <SlideGoalVsRevenue metrics={metrics} chartData={chartData} q={q} />}
        </motion.div>
      </AnimatePresence>

      {/* Nav arrows */}
      <div className="fixed bottom-16 right-6 z-20 flex gap-2">
        <button onClick={() => { setSlide(s => (s - 1 + SLIDES.length) % SLIDES.length); setAutoPlay(false); }}
          className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => { setSlide(s => (s + 1) % SLIDES.length); setAutoPlay(false); }}
          className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between px-8 py-2.5 border-t border-border bg-background/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Dados em tempo real · Supabase Realtime</span>
        </div>
        <div className="flex items-center gap-4">
          <FunnelPill label="Pipeline" value={formatCurrency(metrics.pipelineValue)} />
          <FunnelPill label="Negócios" value={String(metrics.pipelineCount)} />
          <FunnelPill label="Conversão" value={`${(metrics.conversion ?? 0).toFixed(1)}%`} />
          <FunnelPill label={`Atingimento ${q}`} value={`${Math.round(metrics.attainment)}%`} accent />
        </div>
        <span className="text-[10px] text-muted-foreground/40 font-medium">FortSecure CRM · André Firmino</span>
      </footer>
    </div>
  );
}

function KpiBox({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={cn("bg-card/40 backdrop-blur-md border rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden group transition-all duration-500",
      accent ? "border-primary/30 shadow-[0_0_30px_-10px_rgba(62,207,142,0.15)]" : "border-border/50 hover:border-border")}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</p>
        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center",
          accent ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(62,207,142,0.2)]" : "bg-muted text-muted-foreground")}>
          {icon}
        </div>
      </div>
      <div className={cn("text-4xl font-black font-mono leading-none tracking-tighter relative z-10",
        accent ? "text-primary drop-shadow-[0_0_15px_rgba(62,207,142,0.4)]" : "text-foreground")}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-2 relative z-10 font-medium">{sub}</p>}
    </div>
  );
}

function MetaRow({ label, value, accent = false, color: customColor }: { label: string; value: string; accent?: boolean; color?: string }) {
  const color = customColor || "#3ecf8e";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">{label}</span>
      <span className={cn("text-sm font-bold font-mono", accent ? "" : "text-foreground")} style={accent ? { color } : {}}>{value}</span>
    </div>
  );
}

function FunnelPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border",
      accent ? "border-primary/30 bg-primary/10 shadow-[0_0_15px_-5px_rgba(62,207,142,0.3)]" : "border-border/50 bg-card/50 backdrop-blur-md")}>
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">{label}</span>
      <span className={cn("text-sm font-mono font-black", accent ? "text-primary drop-shadow-[0_0_10px_rgba(62,207,142,0.5)]" : "text-foreground")}>{value}</span>
    </div>
  );
}
