import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, DollarSign, Activity, Users as UsersIcon,
  RefreshCw, PhoneCall, PieChart as PieChartIcon,
  Calendar, User, Target, ArrowUpRight, Clock, MapPin, Users
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  RadialBarChart, RadialBar
} from "recharts";
import { cn, formatDisplayName } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/layout/AppShell";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import { WidgetCard } from "@/components/ui-kit/WidgetCard";

export const Route = createFileRoute("/dashboard")({
  component: () => <AppShell><Dashboard /></AppShell>,
});

const STAGE_COLORS: Record<string, string> = {
  prospect: "#71717a",
  qualificado: "#3ecf8e",
  proposta: "#1eaedb",
  negociacao: "#f59e0b",
  ganho: "#3ecf8e",
};
const STAGES = [
  { key: "prospect", label: "Prospect", color: "#71717a" },
  { key: "qualificado", label: "Qualificado", color: "#3ecf8e" },
  { key: "proposta", label: "Proposta", color: "#1eaedb" },
  { key: "negociacao", label: "Negociação", color: "#f59e0b" },
  { key: "ganho", label: "Fechado", color: "#3ecf8e" },
];

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#171717", border: "1px solid #2e2e2e", borderRadius: "8px", fontSize: "12px" },
  itemStyle: { color: "#ededed" },
  labelStyle: { color: "#ededed", fontWeight: "bold", marginBottom: "4px" },
};

function Dashboard() {
  const { isManager, isAdmin } = useAuth();
  const canFilter = isManager || isAdmin;

  const [isSyncing, setIsSyncing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [sellerData, setSellerData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [meetingCount, setMeetingCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [sellers, setSellers] = useState<any[]>([]);
  const [fieldActivities, setFieldActivities] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<"all" | "reuniao" | "visita">("all");
  const [focusedOpps, setFocusedOpps] = useState<any[]>([]);
  const getQuarterIndex = (month: number) => Math.floor(month / 3);
  const [selectedPeriod, setSelectedPeriod] = useState(getQuarterIndex(new Date().getMonth()).toString());

  // Quarter countdown (days until end of selected quarter)
  const daysUntilEndOfQuarter = (() => {
    const now = new Date();
    const q = parseInt(selectedPeriod);
    const endMonth = q * 3 + 2;
    const endOfQ = new Date(now.getFullYear(), endMonth + 1, 0, 23, 59, 59);
    const diff = endOfQ.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  // Quarter → 3 months (0-indexed)
  const QUARTER_MONTHS: Record<string, number[]> = {
    "0": [0, 1, 2],   // Q1: Jan, Fev, Mar
    "1": [3, 4, 5],   // Q2: Abr, Mai, Jun
    "2": [6, 7, 8],   // Q3: Jul, Ago, Set
    "3": [9, 10, 11], // Q4: Out, Nov, Dez
  };
  const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
  const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  async function load() {
    setIsSyncing(true);
    try {
      const now = new Date();
      const selectedQ = parseInt(selectedPeriod);
      const qMonths: number[] = [];
      for (let i = 0; i <= selectedQ; i++) {
        qMonths.push(...QUARTER_MONTHS[i.toString()]);
      }

      const firstMonth = qMonths[0];
      const lastMonth = qMonths[qMonths.length - 1];
      const firstDay = new Date(now.getFullYear(), firstMonth, 1).toISOString();
      const lastDay = new Date(now.getFullYear(), lastMonth + 1, 0, 23, 59, 59).toISOString();

      // For goal lookup we pass the months (1-indexed)
      const goalMonths = qMonths.map(m => m + 1);

      const [oppsRes, profilesRes, goalsRes, meetingsRes, settingsRes, activitiesRes, rolesRes, prodsRes] = await Promise.all([
        supabase.from("opportunities").select("*"),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("goals").select("target_amount, user_id, month").eq("year", now.getFullYear()),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("scheduled_at", firstDay).lte("scheduled_at", lastDay),
        supabase.from("app_settings").select("*").eq("key", "global_revenue_goal").single(),
        supabase.from("activities").select("*, profiles(full_name)").eq("type", "reuniao").gte("due_date", firstDay).lte("due_date", lastDay).order("due_date", { ascending: false }).limit(50),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("products").select("*"),
      ]);

      if (oppsRes.error) throw oppsRes.error;

      const allProfiles = profilesRes.data || [];
      const allRoles = rolesRes.data || [];

      const sellersWithRoles = allProfiles.map(p => ({
        ...p,
        role: allRoles.find(r => r.user_id === p.id)?.role || 'vendedor'
      }));

      setSellers(sellersWithRoles.filter((p: any) => {
        return p.role === 'vendedor';
      }));

      let opps = oppsRes.data || [];
      if (selectedSeller !== "all") {
        opps = opps.filter(o => o.owner_id === selectedSeller);
      }

      // Revenue Calculation: Cumulative up to the selected period
      const periodWonOpps = opps.filter(o =>
        o.stage === "ganho" && o.closed_at &&
        qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
        new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
      );

      const revenue = periodWonOpps.reduce((s, o) => s + Number(o.value), 0);

      const pipelineValue = opps.filter(o => o.stage !== "ganho" && o.stage !== "perdido").reduce((s, o) => s + Number(o.value), 0);
      const pipelineCount = opps.filter(o => o.stage !== "ganho" && o.stage !== "perdido").length;
      const weighted = opps.filter(o => o.stage !== "ganho" && o.stage !== "perdido").reduce((s, o) => s + (Number(o.value) * (Number(o.probability || 0) / 100)), 0);

      const annualHqGoal = settingsRes.data?.value ? Number(settingsRes.data.value) : 7500000;
      const hqGoal = annualHqGoal; // Annual goal is fixed (no prorating)

      const sellerGoal = selectedSeller !== "all"
        ? (goalsRes.data || [])
          .filter(g => g.user_id === selectedSeller && (g.month === 0 || goalMonths.includes(g.month)))
          .reduce((sum, g) => {
            if (g.month === 0) return sum + Number(g.target_amount); // Annual meta
            return sum + Number(g.target_amount);
          }, 0)
        : 0;

      const realMeta = selectedSeller === "all" ? hqGoal : (sellerGoal || 0);
      const attainment = realMeta > 0 ? Math.round((revenue / realMeta) * 100) : 0;

      setMetrics({ revenue, pipelineValue, pipelineCount, weighted, goal: realMeta, attainment });
      setMeetingCount(meetingsRes.count || 0);

      // Field activities (reuniões & visitas do tracker)
      const acts = (activitiesRes.data || []) as any[];
      const filteredActs = selectedSeller !== "all" ? acts.filter((a: any) => a.owner_id === selectedSeller) : acts;
      setFieldActivities(filteredActs);
      setVisitCount(filteredActs.filter((a: any) => a.type === "visita" || a.metadata?.log_subtype === "visit").length);
      setMeetingCount(filteredActs.filter((a: any) => a.type === "reuniao" || a.metadata?.log_subtype === "meeting").length);

      const proposalCount = opps.filter(o => ["proposta", "negociacao", "ganho", "perdido"].includes(o.stage)).length;
      const winCount = opps.filter(o => o.stage === "ganho").length;
      setConversionRate(proposalCount > 0 ? (winCount / proposalCount) * 100 : 0);

      setFunnelData(STAGES.map(s => {
        const stageOpps = opps.filter(o => {
          if (o.stage !== s.key) return false;
          // If stage is 'ganho' (fechado) or 'perdido', filter by date
          if (s.key === "ganho" || s.key === "perdido") {
            return o.closed_at &&
              qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
              new Date(o.closed_at).getUTCFullYear() === now.getFullYear();
          }
          // Otherwise show active deals in this stage
          return true;
        });
        return {
          name: s.label,
          value: stageOpps.reduce((sum, o) => sum + Number(o.value), 0),
          count: stageOpps.length,
          color: s.color,
        };
      }));

      // Ranking: only vendedor, filtered by selected period
      const sData = sellersWithRoles
        .filter((p: any) => p.role === 'vendedor')
        .map(p => {
          const pWonOpps = (oppsRes.data || []).filter(o =>
            o.owner_id === p.id &&
            o.stage === "ganho" &&
            o.closed_at &&
            qMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
            new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
          );
          return {
            name: formatDisplayName(p.full_name || "").split(" ")[0],
            value: pWonOpps.reduce((s, o) => s + Number(o.value), 0),
          };
        }).sort((a, b) => b.value - a.value).slice(0, 5);
      setSellerData(sData);


      // Quarter trend: show the 3 months of the selected quarter
      const monthlyHqGoal = settingsRes.data?.value ? Number(settingsRes.data.value) / 12 : 500000;
      const trend = qMonths.map((mIndex) => {
        const d = new Date(now.getFullYear(), mIndex, 1);
        const allOpps = selectedSeller === "all" ? (oppsRes.data || []) : (oppsRes.data || []).filter(o => o.owner_id === selectedSeller);
        const mOpps = allOpps.filter(o =>
          o.stage === "ganho" && o.closed_at &&
          new Date(o.closed_at).getUTCMonth() === mIndex &&
          new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
        );
        const personalMeta = (goalsRes.data || []).find(g =>
          g.month === mIndex + 1 && selectedSeller !== "all" && g.user_id === selectedSeller
        )?.target_amount;
        return {
          name: MONTH_SHORT[mIndex],
          Realizado: mOpps.reduce((s, o) => s + Number(o.value), 0),
          "Meta Empresa": monthlyHqGoal,
          ...(selectedSeller !== "all" && { "Meta Pessoal": Number(personalMeta || 0) }),
        };
      });
      setTrendData(trend);

      // ── Product revenue breakdown (strictly quarterly) ──
      const prods = (prodsRes.data || []) as any[];
      const allOppsForProducts = (oppsRes.data || []) as any[];
      const specificQMonths = QUARTER_MONTHS[selectedPeriod];

      const productBreakdown = prods
        .filter(prod => prod.metadata?.goal_active)
        .map(prod => {
          const linked = allOppsForProducts.filter(o =>
            o.metadata?.product_id === prod.id &&
            o.stage === "ganho" &&
            o.closed_at &&
            (selectedSeller === "all" || o.owner_id === selectedSeller) &&
            specificQMonths.includes(new Date(o.closed_at).getUTCMonth()) &&
            new Date(o.closed_at).getUTCFullYear() === now.getFullYear()
          );

          const sGoal = (selectedSeller !== "all" && prod.metadata?.seller_goals?.[selectedSeller]);

          // Use explicit quarterly meta from product metadata (goal_q1, goal_q2, etc.)
          const qKey = `goal_q${parseInt(selectedPeriod) + 1}`;
          const quarterlyMeta = prod.metadata?.[qKey] ? Number(prod.metadata[qKey]) : 0;

          return {
            name: prod.name,
            Receita: linked.reduce((s: number, o: any) => s + Number(o.value), 0),
            Meta: quarterlyMeta,
            color: prod.metadata?.color ?? "#3ecf8e",
          };
        })
        .sort((a, b) => b.Receita - a.Receita);
      setProductData(productBreakdown);

      // Foco Comercial (Proposta & Negociação)
      const focus = opps.filter(o => ["proposta", "negociacao"].includes(o.stage));
      setFocusedOpps(focus);
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("db-changes").on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedSeller, selectedPeriod]);

  if (!metrics) return null;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1600px] mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance de vendas em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          {canFilter && (
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger className="w-[170px] h-9 bg-card border-border text-sm">
                <User className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Time Completo</SelectItem>
                {sellers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{formatDisplayName(s.full_name || "")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px] h-9 bg-card border-border text-sm">
              <Calendar className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Q1 · Jan — Mar</SelectItem>
              <SelectItem value="1">Q2 · Abr — Jun</SelectItem>
              <SelectItem value="2">Q3 · Jul — Set</SelectItem>
              <SelectItem value="3">Q4 · Out — Dez</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-card border-border" onClick={load} disabled={isSyncing}>
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin text-[#3ecf8e]")} />
          </Button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {selectedSeller === "all" ? (
          <DashKpi
            label="Receita (Anual)"
            value={formatCurrency(metrics.revenue)}
            hint={`Meta: ${formatCurrency(metrics.goal)}`}
            icon={<DollarSign className="h-4 w-4" />}
            trend={metrics.attainment}
            accent
            featured
          />
        ) : null}
        <DashKpi
          label="Forecast"
          value={metrics.pipelineCount}
          hint={formatCurrency(metrics.pipelineValue)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent={selectedSeller !== "all"}
          featured={selectedSeller !== "all"}
          className={selectedSeller !== "all" ? "lg:col-span-2" : ""}
        />
        <DashKpi label="Reuniões" value={meetingCount} hint="No período" icon={<PhoneCall className="h-4 w-4" />} />
        <DashKpi label="Visitas" value={visitCount} hint="No período" icon={<MapPin className="h-4 w-4" />} />
        <DashKpi label="Conversão" value={`${conversionRate.toFixed(1)}%`} hint="Proposta → Fechado" icon={<PieChartIcon className="h-4 w-4" />} />

        {/* Countdown - Always visible */}
        <div className="bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-lg p-4 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Clock className="h-16 w-16 text-[#3ecf8e]" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="h-3.5 w-3.5 text-[#3ecf8e]" />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fim do Trimestre</p>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold font-mono text-[#3ecf8e]">{daysUntilEndOfQuarter}</p>
            <span className="text-[10px] font-bold text-[#3ecf8e]/70">dias</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {QUARTER_LABELS[parseInt(selectedPeriod)]} · {daysUntilEndOfQuarter === 0 ? 'Período Encerrado' : daysUntilEndOfQuarter === 1 ? 'Último dia!' : 'Restantes'}
          </p>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Field Activities Widget */}
        <WidgetCard featured gridFade={0.3} className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-medium text-foreground">Atividades do Time</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reuniões e visitas registradas no período</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={activityFilter}
                onChange={e => setActivityFilter(e.target.value as any)}
                className="text-[10px] font-mono text-muted-foreground bg-secondary border border-border rounded px-2 py-1 focus:outline-none"
              >
                <option value="all">Todos ({fieldActivities.length})</option>
                <option value="reuniao">Reuniões ({fieldActivities.filter((a: any) => a.type === "reuniao").length})</option>
                <option value="visita">Visitas ({fieldActivities.filter((a: any) => a.type === "visita" || a.metadata?.log_subtype === "visit").length})</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-border overflow-y-auto h-[280px]">
            {(() => {
              const filtered = activityFilter === "all" ? fieldActivities
                : activityFilter === "reuniao" ? fieldActivities.filter((a: any) => a.type === "reuniao")
                  : fieldActivities.filter((a: any) => a.type === "visita" || a.metadata?.log_subtype === "visit");
              if (filtered.length === 0) return (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <MapPin className="h-6 w-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Nenhuma atividade no período</p>
                </div>
              );
              return filtered.map((a: any) => {
                const isVisit = a.type === "visita" || a.metadata?.log_subtype === "visit";
                const sellerName = a.profiles?.full_name
                  ? formatDisplayName(a.profiles.full_name).split(" ").slice(0, 2).join(" ")
                  : "Vendedor";
                const date = new Date(a.due_date);
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      isVisit ? "bg-[#1eaedb]/10 text-[#1eaedb]" : "bg-[#f59e0b]/10 text-[#f59e0b]"
                    )}>
                      {isVisit ? <MapPin className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {a.title?.split(": ")[1] || a.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{sellerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-medium text-foreground">
                        {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                      isVisit ? "bg-[#1eaedb]/10 text-[#1eaedb]" : "bg-[#f59e0b]/10 text-[#f59e0b]"
                    )}>
                      {isVisit ? "Visita" : "Reunião"}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </WidgetCard>

        {/* Funil de Vendas */}
        <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Funil de Vendas</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Distribuição por etapa do pipeline</p>
          </div>
          <div className="p-5 flex flex-col justify-center gap-3 flex-1">
            {funnelData.map((f: any) => {
              const maxVal = Math.max(...funnelData.map((x: any) => x.value), 1);
              const pct = maxVal > 0 ? (f.value / maxVal) * 100 : 0;
              return (
                <div key={f.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="text-muted-foreground font-medium">{f.name}</span>
                      <span className="text-[#3a3a3a] font-mono text-[10px]">{f.count}</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">{formatCurrency(f.value)}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: f.color }}
                    />
                  </div>
                </div>
              );
            })}
            {funnelData.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">Sem dados de pipeline</p>
            )}
          </div>
          <div className="px-5 pb-4 border-t border-border/30 pt-3 flex justify-between text-[10px] text-muted-foreground">
            <span>Atingimento: <span className="font-mono text-foreground">{metrics.attainment}%</span></span>
            <span>Conversão: <span className="font-mono text-foreground">{conversionRate.toFixed(1)}%</span></span>
          </div>
        </div>
      </div>

      {/* ── Product Performance Widget ── */}
      {productData.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-foreground">Performance por Produto</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Receita vs Meta · {QUARTER_LABELS[parseInt(selectedPeriod)]}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#3ecf8e] shrink-0" /> Receita
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2e2e2e] border border-[#3e3e3e] shrink-0" /> Meta
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="px-5 pt-5 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData} barGap={6} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#737373", fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + "…" : v}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                    return String(v);
                  }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.02)", radius: 4 } as any}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = d.Meta > 0 ? Math.round((d.Receita / d.Meta) * 100) : 0;
                    const gap = d.Meta - d.Receita;
                    const isOver = pct >= 100;
                    return (
                      <div className="bg-[#171717] border border-[#2a2a2a] rounded-lg p-3 shadow-2xl min-w-[180px]">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2a2a2a]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <p className="text-xs font-bold text-foreground">{d.name}</p>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between gap-10">
                            <span className="text-[10px] text-muted-foreground">Receita</span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: d.color }}>{formatCurrency(d.Receita)}</span>
                          </div>
                          <div className="flex justify-between gap-10">
                            <span className="text-[10px] text-muted-foreground">Meta</span>
                            <span className="text-[10px] font-mono font-semibold text-foreground">{formatCurrency(d.Meta)}</span>
                          </div>
                          <div className="flex justify-between gap-10 pt-1.5 border-t border-[#2a2a2a]">
                            <span className="text-[10px] text-muted-foreground">Atingimento</span>
                            <span className={cn("text-[11px] font-black", isOver ? "text-[#3ecf8e]" : "text-yellow-400")}>{pct}%</span>
                          </div>
                          {!isOver && gap > 0 && (
                            <p className="text-[9px] text-muted-foreground/70 italic pt-0.5">
                              Faltam {formatCurrency(gap)}
                            </p>
                          )}
                          {isOver && <p className="text-[9px] text-[#3ecf8e] italic pt-0.5">🎯 Meta superada!</p>}
                        </div>
                      </div>
                    );
                  }}
                />
                {/* Background bar = Meta */}
                <Bar dataKey="Meta" fill="#262626" radius={[4, 4, 0, 0]} />
                {/* Foreground bar = Receita with product color */}
                <Bar dataKey="Receita" radius={[4, 4, 0, 0]}>
                  {productData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Attainment cards */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {productData.map((p: any) => {
              const pct = p.Meta > 0 ? Math.min(Math.round((p.Receita / p.Meta) * 100), 999) : 0;
              const isOver = pct >= 100;
              return (
                <div key={p.name} className="bg-secondary/20 border border-border/50 rounded-lg p-3 hover:border-border transition-colors">
                  {/* Name + badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-[11px] font-semibold text-foreground truncate">{p.name}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded shrink-0",
                      isOver ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-yellow-500/10 text-yellow-400"
                    )}>
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 bg-secondary rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isOver ? p.color : "#f59e0b" }}
                    />
                  </div>

                  {/* Values */}
                  <div className="flex justify-between items-baseline">
                    <span className="text-[12px] font-bold font-mono" style={{ color: p.color }}>
                      {formatCurrency(p.Receita)}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      / {formatCurrency(p.Meta)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Ranking */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Ranking de Vendas</h2>
          </div>
          <div className="p-5 space-y-3">
            {sellerData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={cn("text-xs font-bold font-mono w-5", i === 0 ? "text-[#3ecf8e]" : "text-muted-foreground")}>{i + 1}.</span>
                <span className="text-sm text-foreground flex-1 truncate">{s.name}</span>
                <span className={cn("text-xs font-semibold font-mono tabular-nums", i === 0 ? "text-[#3ecf8e]" : "text-foreground")}>
                  {formatCurrency(s.value)}
                </span>
              </div>
            ))}
            {sellerData.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>}
          </div>
        </div>

        {/* Foco Comercial - Mini Kanban (Only when seller selected) */}
        {selectedSeller !== "all" && (
          <div className="lg:col-span-4 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#3ecf8e]" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Foco Comercial</h2>
              </div>
              <Badge variant="outline" className="text-[10px] bg-[#3ecf8e]/10 border-[#3ecf8e]/20 text-[#3ecf8e]">
                {focusedOpps.length} Oportunidades Ativas
              </Badge>
            </div>
            <div className="grid grid-cols-2 h-[260px] divide-x divide-border">
              {["proposta", "negociacao"].map(stageKey => {
                const stage = STAGES.find(s => s.key === stageKey);
                const stageOpps = focusedOpps.filter(o => o.stage === stageKey);
                return (
                  <div key={stageKey} className="flex flex-col h-full overflow-hidden">
                    <div className="px-4 py-2 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stage?.label}</span>
                      <span className="text-[10px] font-mono text-foreground font-bold">{formatCurrency(stageOpps.reduce((s, o) => s + Number(o.value), 0))}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar bg-card/30">
                      {stageOpps.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center gap-2 opacity-30">
                          <Clock className="h-5 w-5" />
                          <span className="text-[9px] uppercase font-bold">Vazio</span>
                        </div>
                      )}
                      {stageOpps.map(o => (
                        <div key={o.id} className="p-3 bg-secondary/40 border border-border/50 rounded-lg hover:border-[#3ecf8e]/30 transition-all group">
                          <p className="text-[10px] font-bold text-foreground line-clamp-1 mb-1">{o.client_name}</p>
                          <div className="flex justify-between items-end">
                            <span className="text-[11px] font-black text-[#3ecf8e] font-mono">{formatCurrency(o.value)}</span>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                              <ArrowUpRight className="h-2.5 w-2.5" />
                              {o.probability}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



      </div>
    </div>
  );
}

function DashKpi({ label, value, hint, icon, trend, accent = false, featured = false, className }: {
  label: string; value: string | number; hint: string; icon: React.ReactNode; trend?: number; accent?: boolean; featured?: boolean; className?: string;
}) {
  return (
    <WidgetCard
      featured={featured}
      className={cn(
        "bg-card border rounded-lg p-4 transition-all duration-300 group relative",
        accent
          ? "border-[#3ecf8e]/40 shadow-[0_0_15px_rgba(62,207,142,0.1)] bg-gradient-to-br from-[#3ecf8e]/5 to-transparent"
          : "border-border hover:border-[#3ecf8e]/20",
        className
      )}
    >
      {accent && (
        <div className="absolute top-2 right-2 flex gap-1">
          <div className="h-1 w-1 rounded-full bg-[#3ecf8e] animate-pulse" />
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          accent ? "text-[#3ecf8e]" : "text-muted-foreground"
        )}>{label}</p>
        <div className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
          accent ? "bg-[#3ecf8e] text-[#000]" : "bg-secondary text-muted-foreground group-hover:text-[#3ecf8e]"
        )}>
          {icon}
        </div>
      </div>
      <p className={cn(
        "text-2xl font-black font-mono tracking-tight",
        accent ? "text-[#3ecf8e] drop-shadow-[0_0_8px_rgba(62,207,142,0.3)]" : "text-foreground"
      )}>{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {trend !== undefined && (
          <span className={cn("text-[10px] font-medium", trend >= 100 ? "text-[#3ecf8e]" : trend >= 60 ? "text-[#f59e0b]" : "text-muted-foreground")}>
            {trend}%
          </span>
        )}
        <p className={cn("text-[10px] truncate font-medium", accent ? "text-[#3ecf8e]/70" : "text-muted-foreground")}>{hint}</p>
      </div>
    </WidgetCard>
  );
}
