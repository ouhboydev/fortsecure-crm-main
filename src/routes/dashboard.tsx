import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, DollarSign, Activity, Users as UsersIcon,
  RefreshCw, PhoneCall, PieChart as PieChartIcon,
  Calendar, User, Target, ArrowUpRight, MapPin, Users
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart,
  Pie, RadialBarChart, RadialBar
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
  prospect:   "#71717a",
  qualificado:"#3ecf8e",
  proposta:   "#1eaedb",
  negociacao: "#f59e0b",
  ganho:      "#3ecf8e",
};
const STAGES = [
  { key: "prospect",    label: "Prospect",    color: "#71717a" },
  { key: "qualificado", label: "Qualificado", color: "#3ecf8e" },
  { key: "proposta",    label: "Proposta",    color: "#1eaedb" },
  { key: "negociacao",  label: "Negociação",  color: "#f59e0b" },
  { key: "ganho",       label: "Fechado",     color: "#3ecf8e" },
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
  const [stageData, setStageData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [meetingCount, setMeetingCount] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [sellers, setSellers] = useState<any[]>([]);
  // Quarter helper: Q1=0,Q2=1,Q3=2,Q4=3 (index)
  const getQuarterIndex = (month: number) => Math.floor(month / 3); // month 0-11
  const [selectedPeriod, setSelectedPeriod] = useState(getQuarterIndex(new Date().getMonth()).toString());
  const [fieldActivities, setFieldActivities] = useState<any[]>([]);

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
      const qMonths = QUARTER_MONTHS[selectedPeriod] || [0, 1, 2];
      const firstMonth = qMonths[0];
      const lastMonth = qMonths[2];
      const firstDay = new Date(now.getFullYear(), firstMonth, 1).toISOString();
      const lastDay = new Date(now.getFullYear(), lastMonth + 1, 0, 23, 59, 59).toISOString();

      // For goal lookup we pass the 3 months (1-indexed)
      const goalMonths = qMonths.map(m => m + 1);

      const [oppsRes, profilesRes, goalsRes, meetingsRes, settingsRes, activitiesRes] = await Promise.all([
        supabase.from("opportunities").select("*"),
        supabase.from("profiles").select("id, full_name"),
        supabase.from("goals").select("target_amount, user_id, month").in("month", goalMonths).eq("year", now.getFullYear()),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("scheduled_at", firstDay).lte("scheduled_at", lastDay),
        supabase.from("app_settings").select("*").eq("key", "global_revenue_goal").single(),
        supabase.from("activities").select("*, profiles(full_name)").in("type", ["reuniao"]).gte("due_date", firstDay).lte("due_date", lastDay).order("due_date", { ascending: false }),
      ]);

      if (oppsRes.error) throw oppsRes.error;

      setSellers(profilesRes.data || []);

      let opps = oppsRes.data || [];
      if (selectedSeller !== "all") {
        opps = opps.filter(o => o.owner_id === selectedSeller);
      }

      // Revenue = sum of won deals closed in any of the 3 quarter months
      const revenue = opps.filter(o =>
        o.stage === "ganho" && o.closed_at &&
        qMonths.includes(new Date(o.closed_at).getMonth()) &&
        new Date(o.closed_at).getFullYear() === now.getFullYear()
      ).reduce((s, o) => s + Number(o.value), 0);

      const pipelineValue = opps.filter(o => o.stage !== "ganho" && o.stage !== "perdido").reduce((s, o) => s + Number(o.value), 0);
      const pipelineCount = opps.filter(o => o.stage !== "ganho" && o.stage !== "perdido").length;
      const weighted = opps.filter(o => o.stage !== "ganho" && o.stage !== "perdido").reduce((s, o) => s + (Number(o.value) * (Number(o.probability || 0) / 100)), 0);

      const hqGoal = settingsRes.data?.value ? Number(settingsRes.data.value) * 3 : 6000000; // quarterly = 3x monthly
      const sellerGoal = selectedSeller !== "all"
        ? goalMonths.reduce((sum, m) => sum + Number((goalsRes.data || []).find(g => g.user_id === selectedSeller && g.month === m)?.target_amount || 0), 0)
        : 0;
      const realMeta = selectedSeller === "all" ? hqGoal : (sellerGoal || hqGoal / Math.max(1, (profilesRes.data || []).length));

      setMetrics({ revenue, pipelineValue, pipelineCount, weighted, goal: realMeta, attainment: Math.round((revenue / realMeta) * 100) });
      setMeetingCount(meetingsRes.count || 0);

      // Field activities (reuniões & visitas from tracker)
      const acts = (activitiesRes.data || []);
      const filteredActs = selectedSeller !== "all" ? acts.filter((a: any) => a.owner_id === selectedSeller) : acts;
      setFieldActivities(filteredActs);

      const proposalCount = opps.filter(o => ["proposta", "negociacao", "ganho", "perdido"].includes(o.stage)).length;
      const winCount = opps.filter(o => o.stage === "ganho").length;
      setConversionRate(proposalCount > 0 ? (winCount / proposalCount) * 100 : 0);

      setFunnelData(STAGES.map(s => ({
        name: s.label,
        value: opps.filter(o => o.stage === s.key).reduce((sum, o) => sum + Number(o.value), 0),
        count: opps.filter(o => o.stage === s.key).length,
        color: s.color,
      })));

      const sData = (profilesRes.data || []).map(p => ({
        name: formatDisplayName(p.full_name || "").split(" ")[0],
        value: (oppsRes.data || []).filter(o => o.owner_id === p.id && o.stage === "ganho").reduce((s, o) => s + Number(o.value), 0),
      })).sort((a, b) => b.value - a.value).slice(0, 5);
      setSellerData(sData);

      setStageData(STAGES.map(s => ({
        name: s.label,
        value: opps.filter(o => o.stage === s.key).length,
        color: s.color,
      })));

      // Quarter trend: show the 3 months of the selected quarter
      const monthlyHqGoal = settingsRes.data?.value ? Number(settingsRes.data.value) : 2000000;
      const trend = qMonths.map((mIndex) => {
        const d = new Date(now.getFullYear(), mIndex, 1);
        const allOpps = selectedSeller === "all" ? (oppsRes.data || []) : (oppsRes.data || []).filter(o => o.owner_id === selectedSeller);
        const mOpps = allOpps.filter(o =>
          o.stage === "ganho" && o.closed_at &&
          new Date(o.closed_at).getMonth() === d.getMonth() &&
          new Date(o.closed_at).getFullYear() === d.getFullYear()
        );
        const personalMeta = (goalsRes.data || []).find(g =>
          g.month === d.getMonth() + 1 && selectedSeller !== "all" && g.user_id === selectedSeller
        )?.target_amount;
        return {
          name: MONTH_SHORT[mIndex],
          Realizado: mOpps.reduce((s, o) => s + Number(o.value), 0),
          "Meta Empresa": monthlyHqGoal,
          ...(selectedSeller !== "all" && { "Meta Pessoal": Number(personalMeta || 0) }),
        };
      });
      setTrendData(trend);
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
        <DashKpi label="Receita (Real)" value={formatCurrency(metrics.revenue)} hint={`Meta: ${formatCurrency(metrics.goal)}`} icon={<DollarSign className="h-4 w-4" />} trend={metrics.attainment} accent featured />
        <DashKpi label="Forecast Ponderado" value={formatCurrency(metrics.weighted)} hint="Pipeline probabilístico" icon={<Activity className="h-4 w-4" />} />
        <DashKpi label="Oportunidades" value={metrics.pipelineCount} hint={formatCurrency(metrics.pipelineValue)} icon={<TrendingUp className="h-4 w-4" />} />
        <DashKpi label="Reuniões" value={meetingCount + fieldActivities.filter((a: any) => a.metadata?.log_subtype === 'meeting').length} hint="Calendário + Tracker" icon={<PhoneCall className="h-4 w-4" />} />
        <DashKpi label="Visitas" value={fieldActivities.filter((a: any) => a.metadata?.log_subtype === 'visit').length} hint="Registradas no Tracker" icon={<MapPin className="h-4 w-4" />} />
        <DashKpi label="Conversão" value={`${conversionRate.toFixed(1)}%`} hint="Proposta → Fechado" icon={<PieChartIcon className="h-4 w-4" />} />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Quarterly area chart — FEATURED: grid no header, limpo no chart */}
        <WidgetCard featured gridFade={0.3} className="lg:col-span-2 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-medium text-foreground">Evolução — {QUARTER_LABELS[parseInt(selectedPeriod)]}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{["Jan · Fev · Mar","Abr · Mai · Jun","Jul · Ago · Set","Out · Nov · Dez"][parseInt(selectedPeriod)]}</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-[#3ecf8e] inline-block" />Realizado</span>
              <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t-2 border-dashed border-[#1eaedb] inline-block" />Empresa</span>
              {selectedSeller !== "all" && <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t-2 border-dashed border-[#f59e0b] inline-block" />Pessoal</span>}
            </div>
          </div>
          <div className="p-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#a3a3a3", fontSize: 11 }} tickFormatter={v => `R$${v / 1000}k`} width={52} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(Number(v))} />
                <Area type="monotone" dataKey="Realizado" stroke="#3ecf8e" strokeWidth={2} fillOpacity={1} fill="url(#colorReal)" />
                <Area type="monotone" dataKey="Meta Empresa" stroke="#1eaedb" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
                {selectedSeller !== "all" && (
                  <Area type="monotone" dataKey="Meta Pessoal" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" fill="none" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </WidgetCard>

        {/* Funnel bar chart — sem grid */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Funil por Valor</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Volume total por estágio</p>
          </div>
          <div className="p-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#a3a3a3", fontSize: 11 }} width={76} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.02)" }} formatter={(v: any) => formatCurrency(Number(v))} />
                <Bar dataKey="value" name="Valor" radius={[0, 4, 4, 0]} barSize={18}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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

        {/* Donut chart */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Distribuição de Deals</h2>
          </div>
          <div className="p-2 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageData} innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                  {stageData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#171717", border: "1px solid #2e2e2e", borderRadius: "8px", fontSize: "12px" }}
                  itemStyle={{ color: "#ededed" }}
                  labelStyle={{ color: "#ededed" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-1">
            {stageData.slice(0, 4).map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.name}
              </div>
            ))}
          </div>
        </div>

        {/* Attainment radial */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Atingimento Global</h2>
          </div>
          <div className="p-4 flex flex-col items-center justify-center h-[180px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="72%" outerRadius="100%" barSize={10} data={[{ value: Math.min(100, metrics.attainment), fill: metrics.attainment >= 100 ? "#3ecf8e" : metrics.attainment >= 60 ? "#f59e0b" : "#e53e3e" }]}>
                <RadialBar background={{ fill: "#262626" }} dataKey="value" cornerRadius={5} />
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#ededed" fontSize="22" fontWeight="700" fontFamily="monospace">
                  {metrics.attainment}%
                </text>
                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fill="#737373" fontSize="10">
                  da meta
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="px-5 pb-4 flex justify-between text-[10px] text-muted-foreground">
            <span>Realizado: <span className="text-foreground font-mono">{formatCurrency(metrics.revenue)}</span></span>
            <span>Meta: <span className="text-foreground font-mono">{formatCurrency(metrics.goal)}</span></span>
          </div>
        </div>

        {/* Field Activities — Atividades de Campo */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Atividades de Campo</h2>
            <span className="text-[10px] text-muted-foreground font-mono">{fieldActivities.length} no período</span>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto max-h-[230px]">
            {fieldActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma atividade registrada.</p>
            ) : (
              fieldActivities.map((a: any) => {
                const isVisit = a.metadata?.log_subtype === 'visit';
                const sellerName = a.profiles?.full_name
                  ? a.profiles.full_name.split(' ').slice(0, 2).join(' ')
                  : 'Vendedor';
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/40 border border-border/40">
                    <div className={cn(
                      "h-7 w-7 rounded flex items-center justify-center shrink-0",
                      isVisit ? "bg-[#1eaedb]/10 text-[#1eaedb]" : "bg-[#f59e0b]/10 text-[#f59e0b]"
                    )}>
                      {isVisit ? <MapPin className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{a.title.split(': ')[1] || a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{sellerName}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {' '}{new Date(a.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      "text-[9px] font-semibold uppercase tracking-wider shrink-0",
                      isVisit ? "text-[#1eaedb]" : "text-[#f59e0b]"
                    )}>{isVisit ? 'Visita' : 'Reunião'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System status */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Status da Operação</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Sincronização", status: "Ativa", ok: true },
              { label: "Realtime CDC", status: "Online", ok: true },
              { label: "Dados", status: isSyncing ? "Atualizando..." : "Sincronizado", ok: !isSyncing },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <span className={cn("h-1.5 w-1.5 rounded-full", item.ok ? "bg-[#3ecf8e] animate-pulse" : "bg-[#f59e0b]")} />
                  <span className={item.ok ? "text-[#3ecf8e]" : "text-[#f59e0b]"}>{item.status}</span>
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-border">
              <p className="text-[9px] text-muted-foreground font-mono">FortSecure CRM v4.2 · Cluster BR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashKpi({ label, value, hint, icon, trend, accent = false, featured = false }: {
  label: string; value: string | number; hint: string; icon: React.ReactNode; trend?: number; accent?: boolean; featured?: boolean;
}) {
  return (
    <WidgetCard featured={featured} className={cn("bg-card border rounded-lg p-4 hover:border-[#3ecf8e]/20 transition-colors group", accent ? "border-[#3ecf8e]/15" : "border-border")}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={cn("h-7 w-7 rounded-md flex items-center justify-center transition-colors", accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-secondary text-muted-foreground group-hover:text-[#3ecf8e]")}>
          {icon}
        </div>
      </div>
      <p className={cn("text-xl font-bold font-mono tracking-tight", accent ? "text-[#3ecf8e]" : "text-foreground")}>{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {trend !== undefined && (
          <span className={cn("text-[10px] font-medium", trend >= 100 ? "text-[#3ecf8e]" : trend >= 60 ? "text-[#f59e0b]" : "text-muted-foreground")}>
            {trend}%
          </span>
        )}
        <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
      </div>
    </WidgetCard>
  );
}
