import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { fetchTeamMetrics, fetchRanking, STAGES, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import { Trophy, TrendingUp, Target, Zap, Activity, CheckCircle2, ArrowUpRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "../public/logo.png";

export const Route = createFileRoute("/tv")({
  head: () => ({ meta: [{ title: "TV — FortSecure" }] }),
  component: TV,
});

/* ── helpers ── */
function getQuarterLabel() {
  const m = new Date().getMonth();
  return `Q${Math.floor(m / 3) + 1}`;
}

/* ── radial ring ── */
function RadialRing({ pct }: { pct: number }) {
  const r = 80, cx = 100, cy = 100;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct, 100) / 100 * circ;
  const color = pct >= 100 ? "#3ecf8e" : pct >= 60 ? "#f59e0b" : "#e53e3e";
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
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" fill="#737373" fontSize="11" fontFamily="sans-serif" letterSpacing="2">
        ATINGIMENTO
      </text>
    </svg>
  );
}

/* ── ticker for recent wins ── */
function WinsTicker({ wins }: { wins: any[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!wins.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % wins.length), 4000);
    return () => clearInterval(t);
  }, [wins.length]);
  if (!wins.length) return (
    <div className="flex items-center gap-3 text-[#3a3a3a] text-sm">
      <Zap className="h-4 w-4" /> Aguardando fechamentos...
    </div>
  );
  const w = wins[idx];
  return (
    <AnimatePresence mode="wait">
      <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
        className="flex items-center gap-3">
        <span className="text-base">💰</span>
        <span className="text-[#3ecf8e] font-semibold text-sm truncate max-w-[220px]">{w.title}</span>
        <span className="text-[#737373] text-xs shrink-0">{w.profiles?.full_name}</span>
        <span className="ml-auto font-mono font-bold text-[#ededed] text-sm shrink-0">{formatCurrency(w.value)}</span>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── main ── */
function TV() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [recentWins, setRecentWins] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading]);

  async function load() {
    const [m, r, oppsRes, winsRes] = await Promise.all([
      fetchTeamMetrics(), fetchRanking(),
      supabase.from("opportunities").select("stage, value"),
      supabase.from("opportunities").select("id, title, value, closed_at, profiles(full_name, avatar_url)")
        .eq("stage", "ganho").order("closed_at", { ascending: false }).limit(8),
    ]);
    setMetrics(m); setRanking(r); setRecentWins(winsRes.data ?? []);
    const opps = oppsRes.data ?? [];
    setFunnel(STAGES.map(s => ({
      stage: s.label, color: s.color,
      count: opps.filter(o => o.stage === s.key).length,
      value: opps.filter(o => o.stage === s.key).reduce((sum, o) => sum + Number(o.value), 0),
    })));
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 2 * 60 * 1000);
    const clk = setInterval(() => setTime(new Date()), 1000);
    const ch = supabase.channel("tv-rt").on("postgres_changes", { event: "*", schema: "public" }, load).subscribe();
    return () => { clearInterval(int); clearInterval(clk); supabase.removeChannel(ch); };
  }, []);

  if (!metrics) return (
    <div className="min-h-screen bg-[#080808] grid place-items-center">
      <div className="flex flex-col items-center gap-5">
        <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <Zap className="h-14 w-14 text-[#3ecf8e]" />
        </motion.div>
        <p className="text-xs font-medium text-[#a3a3a3] uppercase tracking-widest">Inicializando aplicação...</p>
      </div>
    </div>
  );

  const funnelMax = Math.max(...funnel.map(f => f.value), 1);
  const q = getQuarterLabel();

  return (
    <div className="min-h-screen bg-[#080808] text-[#ededed] flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── grid bg ── */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
        backgroundSize: "48px 48px"
      }} />

      {/* ── scanline top accent ── */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3ecf8e]/60 to-transparent z-50" />

      {/* ══════════ HEADER ══════════ */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-[#161616] shrink-0 bg-[#080808]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 bg-[#3ecf8e] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#3ecf8e]/90 transition-colors"
            onClick={() => nav({ to: "/dashboard" })}>
            <img src={logo} alt="FortSecure" className="h-5 w-5 object-contain" />
          </div>
          <div>
            <div className="text-base font-bold text-[#ededed] tracking-tight">FortSecure <span className="text-[#3ecf8e]"></span></div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
              <span className="text-[10px] text-[#737373] uppercase tracking-widest font-medium">Live · {q} {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* ── wins ticker ── */}
        <div className="flex-1 mx-12 bg-[#0e0e0e] border border-[#1e1e1e] rounded-lg px-5 py-2.5 overflow-hidden">
          <div className="flex items-center gap-3 mb-1">
            <Flame className="h-3 w-3 text-[#f59e0b] shrink-0" />
            <span className="text-[9px] text-[#737373] uppercase tracking-widest font-bold">Últimos Fechamentos</span>
          </div>
          <WinsTicker wins={recentWins} />
        </div>

        <div className="text-right shrink-0">
          <div className="text-3xl font-bold font-mono text-[#ededed] tabular-nums leading-none tracking-tighter">
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            <span className="text-lg text-[#404040] ml-0.5">{time.toLocaleTimeString("pt-BR", { second: "2-digit" })}</span>
          </div>
          <div className="text-[10px] text-[#505050] uppercase tracking-widest mt-1 font-medium">
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </div>
        </div>
      </header>

      {/* ══════════ MAIN GRID ══════════ */}
      <main className="flex-1 p-6 grid gap-4 relative z-10"
        style={{ gridTemplateColumns: "320px 1fr 280px", gridTemplateRows: "1fr 1fr" }}>

        {/* ── [A] Atingimento radial — span 1 row ── */}
        <div className="row-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3ecf8e]/3 to-transparent pointer-events-none rounded-2xl" />
          <div>
            <p className="text-[10px] text-[#505050] uppercase tracking-widest font-bold">Meta {q}</p>
            <h2 className="text-base font-semibold text-[#ededed] mt-0.5">Atingimento Global</h2>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="w-52 h-52">
              <RadialRing pct={metrics.attainment} />
            </div>
          </div>

          <div className="space-y-3 border-t border-[#1a1a1a] pt-4">
            <MetaRow label="Realizado" value={formatCurrency(metrics.revenue)} accent />
            <MetaRow label="Meta" value={formatCurrency(metrics.goal)} />
            <MetaRow label="Forecast" value={formatCurrency(metrics.forecast ?? 0)} />
            <MetaRow label="Conversão" value={`${(metrics.conversion ?? 0).toFixed(1)}%`} />
          </div>
        </div>

        {/* ── [B] KPI strip ── */}
        <div className="grid grid-cols-4 gap-3">
          <KpiBox label="Receita" value={formatCurrency(metrics.revenue)} icon={<TrendingUp className="h-4 w-4" />} accent />
          <KpiBox label="Pipeline" value={formatCurrency(metrics.pipelineValue)} sub={`${metrics.pipelineCount} opps`} icon={<Activity className="h-4 w-4" />} />
          <KpiBox label="Forecast" value={formatCurrency(metrics.forecast ?? 0)} icon={<Zap className="h-4 w-4" />} />
          <KpiBox label="Conversão" value={`${(metrics.conversion ?? 0).toFixed(1)}%`} icon={<ArrowUpRight className="h-4 w-4" />} accent />
        </div>

        {/* ── [C] Ranking — right col span 2 rows ── */}
        <div className="row-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] text-[#505050] uppercase tracking-widest font-bold">Classificação</p>
              <h2 className="text-sm font-semibold text-[#ededed]">Ranking de Vendas</h2>
            </div>
            <Trophy className="h-5 w-5 text-yellow-500/60" />
          </div>
          <div className="flex-1 overflow-hidden flex flex-col divide-y divide-[#131313]">
            {ranking.slice(0, 7).map((r, i) => (
              <motion.div key={r.user_id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className={cn("flex items-center gap-3 px-4 py-3 transition-colors group",
                  i === 0 ? "bg-[#3ecf8e]/4" : "hover:bg-[#111]")}>
                <span className={cn("text-xl font-black font-mono w-8 text-center tabular-nums shrink-0",
                  i === 0 ? "text-[#3ecf8e]" : i === 1 ? "text-[#a0a0a0]" : i === 2 ? "text-[#cd7f32]" : "text-[#2e2e2e]")}>
                  {i + 1}
                </span>
                <Avatar className="h-8 w-8 rounded-lg border border-[#1e1e1e] shrink-0">
                  <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-[#1a1a1a] text-[10px] font-bold text-[#ededed]">{r.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#ededed] truncate flex items-center gap-1.5">
                    {r.full_name}
                    {i === 0 && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-[#3ecf8e]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, r.attainment ?? 0)}%` }}
                        transition={{ duration: 1, ease: "circOut", delay: i * 0.06 }} />
                    </div>
                    <span className="text-[9px] text-[#505050] font-mono shrink-0">{(r.attainment ?? 0).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-[#ededed]">{formatCurrency(r.closed_value)}</p>
                  <p className="text-[9px] text-[#3ecf8e] font-bold mt-0.5">{r.points} XP</p>
                </div>
              </motion.div>
            ))}
            {ranking.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-xs text-[#404040]">Sem dados de ranking</div>
            )}
          </div>
        </div>

        {/* ── [D] Funil ── */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-5 flex flex-col gap-3">
          <div className="shrink-0">
            <p className="text-[10px] text-[#505050] uppercase tracking-widest font-bold">Pipeline</p>
            <h2 className="text-sm font-semibold text-[#ededed]">Funil de Vendas</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {funnel.map((f, i) => (
              <motion.div key={f.stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                    <span className="text-[#a3a3a3] font-medium">{f.stage}</span>
                    <span className="text-[#3a3a3a] font-mono text-[10px]">{f.count}</span>
                  </div>
                  <span className="font-mono font-semibold text-[#ededed]">{formatCurrency(f.value)}</span>
                </div>
                <div className="h-1.5 bg-[#141414] rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: f.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(f.value / funnelMax) * 100}%` }}
                    transition={{ duration: 1.1, ease: "circOut", delay: i * 0.07 }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="relative z-10 flex items-center justify-between px-8 py-2.5 border-t border-[#111] bg-[#080808]/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
          <span className="text-[10px] text-[#404040] uppercase tracking-widest font-medium">Dados em tempo real · Supabase Realtime</span>
        </div>
        <div className="flex items-center gap-4">
          <FunnelPill label="Pipeline" value={formatCurrency(metrics.pipelineValue)} />
          <FunnelPill label="Negócios" value={String(metrics.pipelineCount)} />
          <FunnelPill label={`Atingimento ${q}`} value={`${Math.round(metrics.attainment)}%`} accent />
        </div>
        <span className="text-[10px] text-[#2e2e2e] font-medium">FortSecure CRM · André Firmino</span>
      </footer>
    </div>
  );
}

/* ── sub-components ── */
function KpiBox({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={cn("bg-[#0d0d0d] border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden",
      accent ? "border-[#3ecf8e]/20" : "border-[#1a1a1a]")}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-[#3ecf8e]/5 to-transparent pointer-events-none" />}
      <div className="flex items-center justify-between mb-3 relative">
        <p className="text-[10px] font-bold text-[#505050] uppercase tracking-widest">{label}</p>
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center",
          accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-[#141414] text-[#505050]")}>
          {icon}
        </div>
      </div>
      <div className={cn("text-2xl font-black font-mono leading-none tracking-tight relative",
        accent ? "text-[#3ecf8e]" : "text-[#ededed]")}>{value}</div>
      {sub && <p className="text-[10px] text-[#505050] mt-1.5 relative">{sub}</p>}
    </div>
  );
}

function MetaRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-[#505050] uppercase tracking-widest font-medium">{label}</span>
      <span className={cn("text-sm font-bold font-mono", accent ? "text-[#3ecf8e]" : "text-[#ededed]")}>{value}</span>
    </div>
  );
}

function FunnelPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-md border",
      accent ? "border-[#3ecf8e]/20 bg-[#3ecf8e]/5" : "border-[#1a1a1a] bg-[#0d0d0d]")}>
      <span className="text-[9px] text-[#505050] uppercase tracking-widest font-bold">{label}</span>
      <span className={cn("text-xs font-mono font-bold", accent ? "text-[#3ecf8e]" : "text-[#ededed]")}>{value}</span>
    </div>
  );
}
