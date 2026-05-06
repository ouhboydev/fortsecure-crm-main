import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency, Section, StatCard } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend
} from "recharts";
import { 
  TrendingUp, Users, Target, Activity, 
  ArrowUpRight, ArrowDownRight, Zap, 
  BarChart3, Loader2, DollarSign, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/performance")({
  head: () => ({ meta: [{ title: "Performance — FortSecure" }] }),
  component: () => <AppShell><PerformanceAnalytics /></AppShell>,
});

function PerformanceAnalytics() {
  const { isManager } = useAuth();
  const [data, setData] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);

  async function load() {
    try {
      const ranking = await fetchRanking();
      setData(ranking);

      const { data: acts } = await supabase.from("activities").select("owner_id, type");
      const actMap: Record<string, { calls: number, visits: number }> = {};
      ranking.forEach(r => actMap[r.user_id] = { calls: 0, visits: 0 });
      (acts ?? []).forEach(a => {
        if (actMap[a.owner_id]) {
          if (a.type === 'ligacao') actMap[a.owner_id].calls++;
          else actMap[a.owner_id].visits++;
        }
      });

      const formattedActs = ranking.map(r => ({
        name: r.full_name.split(' ')[0],
        ligações: actMap[r.user_id]?.calls || 0,
        visitas: actMap[r.user_id]?.visits || 0,
        total: (actMap[r.user_id]?.calls || 0) + (actMap[r.user_id]?.visits || 0)
      })).sort((a, b) => b.total - a.total);
      setActivityData(formattedActs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load(); 
    const channel = supabase.channel("perf-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!isManager) return (
    <div className="h-[80vh] flex items-center justify-center">
       <Badge variant="outline" className="px-6 py-2 border-border bg-card text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Acesso Restrito ao Comando</Badge>
    </div>
  );

  if (loading) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
       <Loader2 className="h-6 w-6 text-[#3ecf8e] animate-spin" />
       <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Sincronizando Performance...</p>
    </div>
  );

  const totalRevenue = data.reduce((s, r) => s + r.closed_value, 0);
  const totalPipeline = data.reduce((s, r) => s + r.pipeline_value, 0);
  const avgAttainment = data.length > 0 ? data.reduce((s, r) => s + r.attainment, 0) / data.length : 0;

  const chartData = data.map(r => ({
    name: r.full_name.split(' ')[0],
    vendas: r.closed_value,
    pipeline: r.pipeline_value,
    pontos: r.points
  })).sort((a,b) => b.vendas - a.vendas);

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-[1600px] mx-auto pb-20">
      <PageHeader 
        title="Performance Analítica" 
        subtitle="Métricas avançadas e comparativos táticos de produtividade do time." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Receita Realizada" value={formatCurrency(totalRevenue)} hint="Total acumulado" trend={{ value: avgAttainment }} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Volume em Pipeline" value={formatCurrency(totalPipeline)} hint="Oportunidades ativas" accent="info" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Atingimento Médio" value={`${avgAttainment.toFixed(1)}%`} hint="Média do time" accent="primary" icon={<Target className="h-4 w-4" />} />
        <StatCard label="Vendedores Ativos" value={data.length} hint="Consultores em campo" accent="success" icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Comparativo de Receita">
          <div className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                   contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                   itemStyle={{color: '#ededed'}}
                   labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }} />
                <Bar dataKey="vendas" name="Vendido" fill="#3ecf8e" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="pipeline" name="Pipeline" fill="#1eaedb" fillOpacity={0.3} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Atividades por Vendedor">
          <div className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} width={60} />
                <Tooltip 
                   contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                   itemStyle={{color: '#ededed'}}
                   labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }} />
                <Bar dataKey="ligações" name="Ligações" fill="#3ecf8e" stackId="a" barSize={16} />
                <Bar dataKey="visitas" name="Visitas" fill="#1eaedb" stackId="a" barSize={16} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Matriz de Eficiência Operacional">
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendedor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">XP</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Conversão</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Ticket Médio</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Atingimento</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const avgTicket = r.closed_count > 0 ? r.closed_value / r.closed_count : 0;
                return (
                  <TableRow key={r.user_id} className="border-border hover:bg-accent transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold">{r.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-foreground">{r.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-[10px] font-bold text-[#3ecf8e] bg-[#3ecf8e]/5 border-none">{r.points} XP</Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {((r.closed_count / (r.closed_count + 5)) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(avgTicket)}
                    </TableCell>
                    <TableCell>
                      <div className="w-32 space-y-1.5">
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-[#3ecf8e]" style={{ width: `${Math.min(100, r.attainment)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold font-mono text-muted-foreground">{r.attainment.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.attainment >= 100 ? (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase text-[#3ecf8e] border-[#3ecf8e]/20 bg-[#3ecf8e]/5">Elite</Badge>
                      ) : r.attainment >= 50 ? (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase text-[#f59e0b] border-[#f59e0b]/20 bg-[#f59e0b]/5">Estável</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase text-destructive border-destructive/20 bg-destructive/5">Alerta</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}

