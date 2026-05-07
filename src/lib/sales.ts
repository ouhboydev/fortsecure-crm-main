import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "./utils";

export interface RankingRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  points: number;
  closed_value: number;
  closed_count: number;
  pipeline_value: number;
  goal: number;
  attainment: number;
}

export async function fetchAppSettings(): Promise<Record<string, any>> {
  const { data } = await supabase.from("app_settings").select("*");
  const map: Record<string, any> = {
    commission_rate: 15,
    tax_rate: 18,
    global_revenue_goal: 2000000,
  };
  data?.forEach(s => {
    map[s.key] = s.value;
  });
  return map;
}

export async function fetchRanking(): Promise<RankingRow[]> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const start = new Date(year, month - 1, 1).toISOString();

  const [profilesRes, oppsRes, goalsRes, rolesRes, settings] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, points"),
    supabase.from("opportunities").select("owner_id, value, stage, closed_at"),
    supabase.from("goals").select("user_id, target_amount").eq("month", month).eq("year", year),
    supabase.from("user_roles").select("user_id, role"),
    fetchAppSettings()
  ]);

  const allProfiles = profilesRes.data ?? [];
  const roles = rolesRes.data ?? [];
  const admins = roles.filter(r => r.role === 'admin').map(r => r.user_id);
  
  const profiles = allProfiles.filter(p => !admins.includes(p.id));
  const opps = oppsRes.data ?? [];
  const goals = goalsRes.data ?? [];

  return profiles
    .map((p) => {
      const myOpps = opps.filter((o) => o.owner_id === p.id);
      const closed = myOpps.filter((o) => o.stage === "ganho" && o.closed_at && o.closed_at >= start);
      const closed_value = closed.reduce((s, o) => s + Number(o.value), 0);
      const pipeline = myOpps.filter((o) => !["ganho", "perdido"].includes(o.stage));
      const pipeline_value = pipeline.reduce((s, o) => s + Number(o.value), 0);
      const goal = Number(goals.find((g) => g.user_id === p.id)?.target_amount ?? 0);
      const attainment = goal > 0 ? (closed_value / goal) * 100 : 0;
      return {
        user_id: p.id,
        full_name: formatDisplayName(p.full_name || "Sem nome"),
        avatar_url: p.avatar_url,
        points: p.points ?? 0,
        closed_value,
        closed_count: closed.length,
        pipeline_value,
        goal,
        attainment,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.closed_value - a.closed_value;
    });
}

export async function fetchTeamMetrics() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startMonth = new Date(year, month - 1, 1).toISOString();
  const startDay = new Date(year, month - 1, now.getDate()).toISOString();

  const [oppsRes, actsRes, goalsRes, profilesRes, rolesRes] = await Promise.all([
    supabase.from("opportunities").select("*"),
    supabase.from("activities").select("*"),
    supabase.from("goals").select("target_amount").eq("month", month).eq("year", year),
    supabase.from("profiles").select("id"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const roles = rolesRes.data ?? [];
  const admins = roles.filter(r => r.role === 'admin').map(r => r.user_id);
  const sellers = (profilesRes.data ?? []).filter(p => !admins.includes(p.id));
  
  const opps = oppsRes.data ?? [];
  const closedMonth = opps.filter((o) => o.stage === "ganho" && o.closed_at && o.closed_at >= startMonth);
  const closedToday = opps.filter((o) => o.stage === "ganho" && o.closed_at && o.closed_at >= startDay);
  const pipeline = opps.filter((o) => !["ganho", "perdido"].includes(o.stage));
  const lost = opps.filter((o) => o.stage === "perdido");

  const revenue = closedMonth.reduce((s, o) => s + Number(o.value), 0);
  const todayRevenue = closedToday.reduce((s, o) => s + Number(o.value), 0);
  const pipelineValue = pipeline.reduce((s, o) => s + Number(o.value), 0);
  const weighted = pipeline.reduce((s, o) => s + (Number(o.value) * (o.probability || 0)) / 100, 0);
  
  const settings = await fetchAppSettings();
  const hqGoal = Number(settings.global_revenue_goal);
  const goal = hqGoal || (goalsRes.data ?? []).reduce((s, g) => s + Number(g.target_amount), 0);

  const proposalOpps = opps.filter(o => ["proposta", "negociacao", "ganho", "perdido"].includes(o.stage));
  const conversion = proposalOpps.length > 0 ? (opps.filter(o => o.stage === "ganho").length / proposalOpps.length) * 100 : 0;

  return {
    revenue, todayRevenue, pipelineValue, weighted, goal,
    attainment: goal > 0 ? (revenue / goal) * 100 : 0,
    conversion,
    closedCount: closedMonth.length,
    pipelineCount: pipeline.length,
    meetingsCount: (actsRes.data ?? []).filter((a: any) => a.metadata?.log_subtype === 'meeting').length,
    activitiesPending: (actsRes.data ?? []).filter((a) => a.status === "pendente").length,
    sellersCount: sellers.length,
    forecast: revenue + weighted,
  };
}

export const STAGES = [
  { key: "prospect", label: "Prospect", color: "#4299e1" },
  { key: "qualificado", label: "Qualificado", color: "#3ecf8e" },
  { key: "proposta", label: "Proposta", color: "#f6ad55" },
  { key: "negociacao", label: "Negociação", color: "#1eaedb" },
  { key: "ganho", label: "Ganho", color: "#3ecf8e" },
  { key: "perdido", label: "Perdido", color: "#e53e3e" },
] as const;
