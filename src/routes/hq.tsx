import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency, Section } from "@/components/ui-kit/PageHeader";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Building2, Percent, Target, Zap, 
  Loader2, BarChart3, 
  Landmark, ChevronRight, 
  Users, Package, Calendar,
  TrendingUp, Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/sales";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend,
  Area, AreaChart
} from "recharts";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/hq")({
  head: () => ({ meta: [{ title: "Comando Superior (HQ) — FortSecure" }] }),
  component: () => <AppShell><HQ /></AppShell>,
});

function HQ() {
  const { isManager, isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  // Data States
  const [profiles, setProfiles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellerGoals, setSellerGoals] = useState<Record<string, number>>({});
  const [productGoals, setProductGoals] = useState<Record<string, number>>({});
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});
  const [configs, setConfigs] = useState<Record<string, any>>({
    commission_rate: 15,
    tax_rate: 18,
    global_revenue_goal: 2000000,
    currency: "BRL"
  });

  const [quarterlyData, setQuarterlyData] = useState<any[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  async function loadData() {
    if (!isManager && !isAdmin) return;
    setLoading(true);
    try {
      const [
        profilesRes, 
        productsRes, 
        sellerGoalsRes, 
        settingsRes,
        oppsRes,
        allGoalsRes
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").order("full_name"),
        supabase.from("products").select("id, name, price"),
        supabase.from("goals").select("*").eq("month", currentMonth).eq("year", currentYear),
        supabase.from("app_settings").select("*"),
        supabase.from("opportunities").select("*"),
        supabase.from("goals").select("*")
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      
      const sGoals: Record<string, number> = {};
      sellerGoalsRes.data?.forEach(g => { sGoals[g.user_id] = Number(g.target_amount); });
      setSellerGoals(sGoals);

      const map = { ...configs };
      settingsRes.data?.forEach(s => {
        if (s.key === "product_goals") setProductGoals(s.value as Record<string, number>);
        else if (s.key === "forecast_probabilities") setProbabilities(s.value as Record<string, number>);
        else map[s.key] = s.value;
      });
      setConfigs(map);

      if (!probabilities || Object.keys(probabilities).length === 0) {
        setProbabilities({ prospect: 20, qualificado: 40, proposta: 60, negociacao: 80, ganho: 100, perdido: 0 });
      }

      // Calculate Quarterly Data — one entry per Q1/Q2/Q3/Q4
      const quarterDefs = [
        { label: "Q1", months: [1, 2, 3] },
        { label: "Q2", months: [4, 5, 6] },
        { label: "Q3", months: [7, 8, 9] },
        { label: "Q4", months: [10, 11, 12] },
      ];

      const qData = quarterDefs.map(q => {
        const monthGoals = allGoalsRes.data?.filter(g => q.months.includes(g.month) && g.year === now.getFullYear()) ?? [];
        const totalMonthGoal = monthGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
        const monthlyHqGoal = Number(map.global_revenue_goal) || 2000000;
        const finalGoal = totalMonthGoal > 0 ? totalMonthGoal : monthlyHqGoal * 3;

        let revenue = 0;
        let weighted = 0;

        (oppsRes.data ?? []).forEach(o => {
          if (o.stage === 'ganho' && o.closed_at) {
            const closedDate = new Date(o.closed_at);
            const m = closedDate.getMonth() + 1;
            const y = closedDate.getFullYear();
            if (q.months.includes(m) && y === now.getFullYear()) {
              revenue += Number(o.value);
            }
          } else if (o.stage !== 'perdido' && o.expected_close_date) {
            const expectedDate = new Date(o.expected_close_date);
            const m = expectedDate.getUTCMonth() + 1;
            const y = expectedDate.getUTCFullYear();
            if (q.months.includes(m) && y === now.getFullYear()) {
              weighted += (Number(o.value) * (o.probability || 0)) / 100;
            }
          }
        });

        return {
          name: q.label,
          revenue: revenue + weighted,
          goal: finalGoal,
          actualRevenue: revenue,
          projected: weighted
        };
      });

      setQuarterlyData(qData);
    } catch (e: any) {
      toast.error("Erro ao carregar inteligência estratégica");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [isManager, isAdmin]);

  async function saveConfig(key: string, value: any) {
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      toast.success(`Configuração [${key}] sincronizada`);
      loadData();
    } catch (e: any) {
      toast.error("Falha na persistência: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSellerGoal(userId: string, amount: number) {
    try {
      const { error } = await supabase.from("goals").upsert({
        user_id: userId,
        month: currentMonth,
        year: currentYear,
        target_amount: amount
      }, { onConflict: "user_id,month,year" });
      if (error) throw error;
      setSellerGoals(prev => ({ ...prev, [userId]: amount }));
      toast.success("Meta individual atualizada");
      loadData();
    } catch (e: any) {
      toast.error("Erro ao salvar meta");
    }
  }

  async function saveProductGoal(productId: string, amount: number) {
    const updated = { ...productGoals, [productId]: amount };
    setProductGoals(updated);
    await saveConfig("product_goals", updated);
  }

  if (!isManager && !isAdmin) return null;

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
       <Loader2 className="h-6 w-6 text-[#3ecf8e] animate-spin" />
       <p className="text-xs text-muted-foreground uppercase tracking-widest">Sincronizando Comando HQ...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-[1600px] mx-auto pb-20">
      <PageHeader 
        title="Comando HQ" 
        subtitle="Gestão centralizada de metas, probabilidades e ajustes financeiros."
        actions={
          <div className="flex items-center gap-4 bg-card border border-border p-2 pr-4 rounded-md">
            <div className="flex flex-col items-end">
               <span className="text-[10px] text-muted-foreground uppercase font-medium">Meta Global Q{Math.ceil(currentMonth / 3)}/{currentYear}</span>
               <span className="text-sm font-semibold">{formatCurrency(configs.global_revenue_goal)}</span>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-accent" onClick={() => {
               const val = prompt("Nova Meta Global:", configs.global_revenue_goal);
               if (val) saveConfig("global_revenue_goal", Number(val));
            }}>
               <Edit3 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="seller_goals" className="space-y-8">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-md w-fit">
          <TabsTrigger value="seller_goals" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Vendedores</TabsTrigger>
          <TabsTrigger value="product_goals" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Produtos</TabsTrigger>
          <TabsTrigger value="percentage_adjusts" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Ajustes</TabsTrigger>
          <TabsTrigger value="quarterly_analytics" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="seller_goals" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profiles.map(p => (
                 <Card key={p.id} className="bg-card border border-border hover:border-[#3ecf8e]/30 transition-colors">
                    <CardContent className="p-5 space-y-4">
                       <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border">
                             <AvatarImage src={p.avatar_url} />
                             <AvatarFallback className="bg-secondary text-[10px] font-bold">{p.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                             <p className="text-sm font-semibold truncate">{p.full_name}</p>
                             <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Vendedor FortSecure</p>
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Meta Mensal</Label>
                          <div className="relative group">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">R$</span>
                             <Input 
                                type="number"
                                defaultValue={sellerGoals[p.id] || 0}
                                onBlur={(e) => saveSellerGoal(p.id, Number(e.target.value))}
                                className="h-9 pl-8 bg-background border-border text-sm font-medium focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/10"
                             />
                          </div>
                       </div>
                    </CardContent>
                 </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="product_goals" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map(p => (
                 <Card key={p.id} className="bg-card border border-border hover:border-[#3ecf8e]/30 transition-colors">
                    <CardContent className="p-5 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="h-8 w-8 rounded bg-[#3ecf8e]/10 flex items-center justify-center text-[#3ecf8e]">
                             <Package className="h-4 w-4" />
                          </div>
                          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground uppercase">Target</Badge>
                       </div>
                       <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.name}</p>
                       </div>
                       <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">R$</span>
                          <Input 
                             type="number"
                             defaultValue={productGoals[p.id] || 0}
                             onBlur={(e) => saveProductGoal(p.id, Number(e.target.value))}
                             className="h-9 pl-8 bg-background border-border text-sm font-medium focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/10"
                          />
                       </div>
                    </CardContent>
                 </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="percentage_adjusts" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid lg:grid-cols-2 gap-6">
              <Section title="Forecast de Probabilidade">
                 <div className="space-y-2 pt-2">
                    {STAGES.map(s => (
                       <div key={s.key} className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors group">
                          <div className="flex items-center gap-3">
                             <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                             <span className="text-xs font-medium text-foreground">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Input 
                                type="number"
                                value={probabilities[s.key] || 0}
                                onChange={(e) => setProbabilities(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                                onBlur={() => saveConfig("forecast_probabilities", probabilities)}
                                className="w-16 h-8 bg-background border-border text-center text-xs font-semibold"
                              />
                              <span className="text-[11px] text-muted-foreground font-medium">%</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </Section>

              <Section title="Ajustes de Operação">
                 <div className="space-y-8 pt-4">
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                          <Label className="text-xs font-medium text-muted-foreground">Comissão de Vendedores</Label>
                          <span className="text-xl font-bold text-[#3ecf8e]">{configs.commission_rate}%</span>
                       </div>
                       <Slider 
                          value={[configs.commission_rate]} max={50} step={1} 
                          onValueChange={(v) => setConfigs({...configs, commission_rate: v[0]})}
                          onValueCommit={(v) => saveConfig("commission_rate", v[0])}
                          className="text-[#3ecf8e]"
                       />
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                          <Label className="text-xs font-medium text-muted-foreground">Taxa Fiscal / Impostos</Label>
                          <span className="text-xl font-bold text-[#f59e0b]">{configs.tax_rate}%</span>
                       </div>
                       <Slider 
                          value={[configs.tax_rate]} max={40} step={0.5} 
                          onValueChange={(v) => setConfigs({...configs, tax_rate: v[0]})}
                          onValueCommit={(v) => saveConfig("tax_rate", v[0])}
                       />
                    </div>
                 </div>
              </Section>
           </div>
        </TabsContent>

        <TabsContent value="quarterly_analytics" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="space-y-6">
              <Section title="Performance Trimestral">
                 <div className="h-[350px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={quarterlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a3a3a3' }} tickFormatter={(v) => `R$ ${v/1000}k`} />
                          <Tooltip 
                              contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                              itemStyle={{color: '#ededed'}}
                              labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                           />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }} />
                          <Bar dataKey="revenue" name="Projetado" fill="#3ecf8e" radius={[4, 4, 0, 0]} barSize={40} />
                          <Bar dataKey="goal" name="Meta" fill="#262626" radius={[4, 4, 0, 0]} barSize={40} stroke="#2e2e2e" strokeWidth={1} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Section>
              
              <div className="grid lg:grid-cols-3 gap-6">
                 <Section title="Tendência de Atendimento" className="lg:col-span-2">
                    <div className="h-[300px] w-full pt-4">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={quarterlyData}>
                             <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.1}/>
                                   <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0}/>
                                </linearGradient>
                             </defs>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a3a3a3' }} />
                             <YAxis hide />
                             <Tooltip 
                                contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                                itemStyle={{color: '#ededed'}}
                                labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                             />
                             <Area type="monotone" dataKey="revenue" stroke="#3ecf8e" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                             <Area type="monotone" dataKey="goal" stroke="#2e2e2e" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                          </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </Section>

                 <Section title="Status da Missão">
                    <div className="space-y-8 pt-4">
                       {quarterlyData.map((d, i) => (
                         <div key={d.name} className="space-y-2">
                            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                               <span>{d.name}</span>
                               <span className={cn(d.revenue >= d.goal ? "text-[#3ecf8e]" : "text-[#f59e0b]")}>
                                  {d.goal > 0 ? ((d.revenue / d.goal) * 100).toFixed(0) : 0}%
                               </span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                               <div className={cn("h-full transition-all duration-1000", d.revenue >= d.goal ? "bg-[#3ecf8e]" : "bg-[#f59e0b]")} style={{ width: `${Math.min(100, (d.goal > 0 ? (d.revenue / d.goal) * 100 : 0))}%` }} />
                            </div>
                         </div>
                       ))}
                    </div>
                 </Section>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

