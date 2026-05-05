import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Building2, Percent, Target, Zap, Settings2, 
  ShieldCheck, Loader2, Save, BarChart3, Globe,
  Briefcase, TrendingUp, AlertTriangle, ShieldAlert,
  Coins, Scale, Landmark, ChevronRight, Sparkles,
  Cpu, Database, Shield, Radio, Power, Eye, Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/hq")({
  head: () => ({ meta: [{ title: "Comando Superior (HQ) — FortSecure" }] }),
  component: () => <AppShell><HQ /></AppShell>,
});

function HQ() {
  const { isManager, isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("finance");
  const [configs, setConfigs] = useState<Record<string, any>>({
    company_name: "FortSecure Solutions",
    commission_rate: 15,
    tax_rate: 18,
    global_target: 2000000,
    daily_revenue_goal: 5000,
    daily_activity_goal: 15,
    retention_goal: 85,
    operational_buffer: 20,
    enable_ai: true,
    enable_gamification: true,
    currency: "BRL",
    timezone: "America/Sao_Paulo"
  });

  useEffect(() => {
    async function load() {
      if (!isManager && !isAdmin) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (error) throw error;
        
        const map = { ...configs };
        data?.forEach(s => {
          map[s.key] = s.value;
        });
        setConfigs(map);
      } catch (e: any) {
        toast.error("Erro ao carregar inteligência do HQ");
      } finally {
        setLoading(false);
      }
    }
    load();

    // Real-time listener for global HQ sync
    const channel = supabase.channel("hq-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [isManager, isAdmin]);

  async function saveConfig(key: string, value: any) {
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      
      await supabase.from("audit_logs").insert({
        action: `HQ_UPDATE: [${key}] -> ${JSON.stringify(value)}`,
        entity: "app_settings",
        user_id: user?.id
      });

      setConfigs(prev => ({ ...prev, [key]: value }));
      toast.success(`Configuração [${key}] sincronizada`);
    } catch (e: any) {
      toast.error("Falha na persistência: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isManager && !isAdmin) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6 space-y-8 animate-in fade-in duration-1000">
        <div className="relative">
           <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
           <ShieldAlert className="h-24 w-24 text-destructive relative" />
        </div>
        <div className="space-y-4">
           <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter italic leading-none">Acesso Negado</h2>
           <p className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-[0.5em] max-w-xs mx-auto leading-relaxed">Sua credencial atual não possui nível de autorização 'Gestor Delta'.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-10">
       <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse" />
          <Radio className="h-12 w-12 text-primary animate-bounce" />
       </div>
       <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.8em] animate-pulse">Sincronizando Vault de Comando...</div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 blur-[200px] rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-500/5 blur-[200px] rounded-full -ml-32 -mb-32" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 p-8 md:p-12 lg:p-20 space-y-20 max-w-[1800px] mx-auto pb-40">
        {/* Superior Command Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 border-b border-border/50 pb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="h-14 w-14 bg-secondary border border-border rounded-2xl flex items-center justify-center shadow-inner"
               >
                  <Cpu className="h-7 w-7 text-primary" />
               </motion.div>
               <div className="space-y-1">
                  <div className="flex items-center gap-2">
                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">FortSecure Headquarters // Delta-9</span>
                  </div>
                  <div className="text-[9px] text-muted-foreground/30 font-bold uppercase tracking-widest">Sessão Criptografada: {user?.id.slice(0, 12)}</div>
               </div>
            </div>
            <h1 className="text-7xl font-black tracking-tighter italic text-foreground uppercase leading-none">Comando <span className="text-primary">Superior</span></h1>
          </div>

          <div className="flex items-center gap-6">
             <div className="text-right space-y-1 hidden md:block">
                <div className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.4em]">Nível de Acesso</div>
                <div className="text-xs font-mono font-bold text-foreground italic">{isAdmin ? 'Nível: Administrador Ômega' : 'Nível: Gestor Estratégico'}</div>
             </div>
             <div className="h-12 w-px bg-border/50 hidden md:block" />
             <Button variant="outline" className="h-14 px-8 rounded-2xl bg-secondary/50 border-border text-[10px] font-black uppercase tracking-widest gap-3 shadow-xl">
                <Database className="h-4 w-4 opacity-30" /> Logs de Audit
             </Button>
          </div>
        </header>

        <div className="space-y-16">
           {/* Primary Targets Section */}
           <section className="space-y-10">
              <div className="flex items-center gap-4">
                 <div className="h-1 w-12 bg-primary rounded-full" />
                 <h2 className="text-2xl font-black uppercase tracking-tighter italic">Alvos Estratégicos</h2>
              </div>
              <TargetsView configs={configs} setConfigs={setConfigs} saveConfig={saveConfig} busy={busy} />
           </section>

           <Separator className="bg-border/30" />

           {/* Finance & Operational Grid */}
           <div className="grid lg:grid-cols-2 gap-10">
              <section className="space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="h-1 w-8 bg-amber-500 rounded-full" />
                    <h2 className="text-xl font-black uppercase tracking-tighter italic">Engenharia Financeira</h2>
                 </div>
                 <FinanceView configs={configs} setConfigs={setConfigs} saveConfig={saveConfig} busy={busy} />
              </section>

              <section className="space-y-10">
                 <div className="flex items-center gap-4">
                    <div className="h-1 w-8 bg-indigo-500 rounded-full" />
                    <h2 className="text-xl font-black uppercase tracking-tighter italic">Controles Operacionais</h2>
                 </div>
                 <OperationalView configs={configs} setConfigs={setConfigs} saveConfig={saveConfig} busy={busy} />
              </section>
           </div>

           <Separator className="bg-border/30" />

           {/* Institutional Section */}
           <section className="space-y-10">
              <div className="flex items-center gap-4">
                 <div className="h-1 w-8 bg-muted-foreground/30 rounded-full" />
                 <h2 className="text-xl font-black uppercase tracking-tighter italic">Identidade de Comando</h2>
              </div>
              <CompanyView configs={configs} setConfigs={setConfigs} saveConfig={saveConfig} busy={busy} />
           </section>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-5 px-6 py-5 rounded-2xl transition-all duration-500 group relative overflow-hidden",
        active 
          ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.02]" 
          : "hover:bg-secondary/60 text-muted-foreground/60 hover:text-foreground"
      )}
    >
      <div className={cn("shrink-0 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground/30")}>
         {icon && <div className="h-5 w-5">{icon}</div>}
      </div>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">{label}</span>
      {active && <motion.div layoutId="tab-active" className="absolute right-6 h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
    </button>
  );
}

function SystemStat({ label, status, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">{label}</span>
      <div className="flex items-center gap-2">
         <span className={cn("h-1 w-1 rounded-full", color === 'emerald' ? "bg-emerald-500 shadow-[0_0_5px_#10b981]" : "bg-zinc-500")} />
         <span className={cn("text-[9px] font-black uppercase tracking-widest", color === 'emerald' ? "text-emerald-500/60" : "text-muted-foreground/30")}>{status}</span>
      </div>
    </div>
  );
}

function FinanceView({ configs, setConfigs, saveConfig, busy }: any) {
   return (
      <div className="grid md:grid-cols-2 gap-10">
         <HQCard 
            title="Comissões Estratégicas" 
            sub="Percentual de ganho do agente"
            icon={<Percent />}
         >
            <div className="space-y-10 py-6">
               <div className="flex justify-between items-end">
                  <div className="text-8xl font-black font-mono text-foreground leading-none tracking-tighter italic">{configs.commission_rate}%</div>
                  <Badge className="bg-secondary text-primary border-border rounded-xl px-4 py-2 text-[10px] font-black uppercase">Standard Rate</Badge>
               </div>
               <div className="space-y-6">
                  <Slider 
                    value={[configs.commission_rate]} 
                    max={50} 
                    step={1} 
                    onValueChange={(v) => setConfigs({...configs, commission_rate: v[0]})}
                    onValueCommit={(v) => saveConfig('commission_rate', v[0])}
                  />
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em] text-center leading-relaxed">
                    Este valor altera os ganhos acumulados mostrados no painel pessoal de todos os agentes.
                  </p>
               </div>
            </div>
         </HQCard>

         <HQCard 
            title="Projeção Fiscal" 
            sub="Carga tributária média"
            icon={<Landmark />}
         >
            <div className="space-y-10 py-6">
               <div className="flex justify-between items-end">
                  <div className="text-8xl font-black font-mono text-amber-500 leading-none tracking-tighter italic">{configs.tax_rate}%</div>
               </div>
               <Slider 
                  value={[configs.tax_rate]} 
                  max={60} 
                  step={0.5} 
                  onValueChange={(v) => setConfigs({...configs, tax_rate: v[0]})}
                  onValueCommit={(v) => saveConfig('tax_rate', v[0])}
               />
               <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em] text-center italic">
                 Estimativa usada para o cálculo de Net Revenue no Dashboard Executivo.
               </p>
            </div>
         </HQCard>

         <HQCard 
            title="Moeda de Operação" 
            sub="Simbolismo monetário global"
            icon={<Coins />}
         >
            <div className="flex items-center gap-6 pt-6">
               <Input 
                  value={configs.currency} 
                  onChange={(e) => setConfigs({...configs, currency: e.target.value})}
                  className="h-20 rounded-[32px] bg-secondary/50 border-border text-4xl font-black uppercase text-center focus:ring-primary/20 transition-all shadow-inner"
               />
               <Button 
                  onClick={() => saveConfig('currency', configs.currency)} 
                  disabled={busy}
                  className="h-20 w-20 rounded-[32px] bg-primary text-primary-foreground hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-primary/20"
               >
                  <Save className="h-6 w-6" />
               </Button>
            </div>
         </HQCard>
      </div>
   );
}

function TargetsView({ configs, setConfigs, saveConfig, busy }: any) {
   return (
      <div className="space-y-10">
         <HQCard 
            title="Alvo de Receita Organizacional" 
            sub="Objetivo mensal de receita bruta"
            icon={<Target />}
            fullWidth
         >
            <div className="flex flex-col lg:flex-row items-center gap-10 py-10">
               <div className="relative flex-1 w-full">
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-4xl font-black text-muted-foreground/20 italic">{configs.currency}</span>
                  <Input 
                     type="number"
                     value={configs.global_target} 
                     onChange={(e) => setConfigs({...configs, global_target: parseInt(e.target.value)})}
                     className="h-32 pl-32 rounded-[48px] bg-secondary/50 border-border text-7xl font-black tracking-tighter italic focus:ring-primary/20 transition-all shadow-inner"
                  />
               </div>
               <Button 
                  onClick={() => saveConfig('global_revenue_goal', configs.global_target.toString())} 
                  disabled={busy}
                  className="h-32 px-16 rounded-[48px] bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 flex items-center gap-6"
               >
                  <Save className="h-8 w-8" /> Sincronizar Alvo
               </Button>
            </div>
         </HQCard>

         <div className="grid md:grid-cols-2 gap-10">
            <HQCard title="Meta Diária (Receita)" sub="Alvo de faturamento por dia" icon={<TrendingUp />}>
               <div className="space-y-8 py-6">
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/20 italic">{configs.currency}</span>
                    <Input 
                      type="number"
                      value={configs.daily_revenue_goal} 
                      onChange={(e) => setConfigs({...configs, daily_revenue_goal: parseInt(e.target.value)})}
                      className="h-16 pl-20 rounded-2xl bg-secondary/50 border-border text-2xl font-black focus:ring-primary/20 shadow-inner"
                    />
                  </div>
                  <Button onClick={() => saveConfig('daily_revenue_goal', configs.daily_revenue_goal.toString())} disabled={busy} className="w-full h-12 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-black uppercase tracking-widest text-[10px] rounded-xl">Persistir Meta Diária</Button>
               </div>
            </HQCard>

            <HQCard title="Meta de Atividades" sub="Logs diários por agente" icon={<Zap />}>
               <div className="space-y-8 py-6">
                  <div className="text-8xl font-black font-mono text-primary leading-none tracking-tighter italic">{configs.daily_activity_goal}</div>
                  <Slider 
                    value={[configs.daily_activity_goal]} 
                    max={50} min={1} step={1} 
                    onValueChange={(v) => setConfigs({...configs, daily_activity_goal: v[0]})}
                    onValueCommit={(v) => saveConfig('daily_activity_goal', v[0])}
                  />
                  <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.2em] text-center italic">Volume sugerido de interações (Calls/Visitas) por dia.</p>
               </div>
            </HQCard>

            <HQCard title="Meta de Retenção" sub="Benchmark de Churn" icon={<Briefcase />}>
               <div className="space-y-10 py-6">
                  <div className="text-8xl font-black font-mono text-blue-500 leading-none tracking-tighter italic">{configs.retention_goal}%</div>
                  <Slider 
                    value={[configs.retention_goal]} 
                    max={100} min={60} step={1} 
                    onValueChange={(v) => setConfigs({...configs, retention_goal: v[0]})}
                    onValueCommit={(v) => saveConfig('retention_goal', v[0])}
                  />
               </div>
            </HQCard>
         </div>
      </div>
   );
}

function OperationalView({ configs, setConfigs, saveConfig, busy }: any) {
   return (
      <div className="grid md:grid-cols-2 gap-10">
         <HQCard title="Gordura de Pipeline" sub="Buffer estratégico de cobertura" icon={<Scale />}>
            <div className="space-y-10 py-6">
               <div className="text-8xl font-black font-mono text-indigo-500 leading-none tracking-tighter italic">{configs.operational_buffer}%</div>
               <Slider 
                  value={[configs.operational_buffer]} 
                  max={100} step={5} 
                  onValueChange={(v) => setConfigs({...configs, operational_buffer: v[0]})}
                  onValueCommit={(v) => saveConfig('operational_buffer', v[0])}
               />
               <p className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest text-center">Exigido para cobrir o Sales Cycle médio.</p>
            </div>
         </HQCard>

         <HQCard title="Controles de Inteligência" sub="Recursos avançados de plataforma" icon={<Sparkles />}>
            <div className="space-y-6 pt-6">
               <OperationalSwitch 
                  label="Assistente Virtual" 
                  desc="Sugestões e previsões baseadas em IA"
                  checked={configs.enable_ai}
                  onChange={(v: boolean) => saveConfig('enable_ai', v)}
                  icon={<Cpu />}
               />
               <OperationalSwitch 
                  label="Gamificação Pro" 
                  desc="Ranking e Pontuação de Agentes"
                  checked={configs.enable_gamification}
                  onChange={(v: boolean) => saveConfig('enable_gamification', v)}
                  icon={<Trophy />}
               />
            </div>
         </HQCard>
      </div>
   );
}

function CompanyView({ configs, setConfigs, saveConfig, busy }: any) {
   return (
      <HQCard title="Identidade Institucional" sub="Configurações globais de marca" icon={<Globe />} fullWidth>
         <div className="grid lg:grid-cols-2 gap-20 py-10">
            <div className="space-y-8">
               <div className="space-y-4">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 ml-2">Nome de Operação</Label>
                  <Input 
                    value={configs.company_name} 
                    onChange={(e) => setConfigs({...configs, company_name: e.target.value})}
                    className="h-20 rounded-[32px] bg-secondary/50 border-border text-3xl font-black italic tracking-tight focus:ring-primary/20 transition-all shadow-inner"
                  />
               </div>
               <Button 
                  onClick={() => saveConfig('company_name', configs.company_name)} 
                  disabled={busy}
                  className="h-16 px-10 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] w-full"
               >
                  Persistir Identidade
               </Button>
            </div>

            <div className="space-y-10">
               <div className="p-8 rounded-[32px] bg-secondary/20 border border-border/50 flex items-center justify-between">
                  <div className="space-y-1">
                     <div className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">Timezone do Kernel</div>
                     <div className="text-sm font-mono font-bold text-foreground">{configs.timezone}</div>
                  </div>
                  <Radio className="h-6 w-6 text-primary animate-pulse" />
               </div>
               <div className="flex items-center gap-4 px-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sistemas de Backup e Alta Disponibilidade Ativos</span>
               </div>
            </div>
         </div>
      </HQCard>
   );
}

function HQCard({ title, sub, icon, children, fullWidth }: any) {
   return (
      <Card className={cn("bg-card/40 backdrop-blur-3xl border-border/50 rounded-[48px] p-12 relative overflow-hidden group shadow-2xl border transition-all duration-700", fullWidth && "md:col-span-2 lg:col-span-3")}>
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
         <div className="relative z-10 space-y-10">
            <div className="flex items-start justify-between">
               <div className="space-y-2">
                  <div className="flex items-center gap-4">
                     <div className="h-1.5 w-8 bg-primary rounded-full" />
                     <h3 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">{title}</h3>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/30 ml-12">{sub}</p>
               </div>
               <div className="h-16 w-16 bg-secondary border border-border rounded-[24px] flex items-center justify-center text-primary/30 group-hover:text-primary group-hover:scale-110 transition-all duration-500 shadow-inner">
                  {icon && <div className="h-8 w-8">{icon}</div>}
               </div>
            </div>
            <div>{children}</div>
         </div>
      </Card>
   );
}

function OperationalSwitch({ label, desc, checked, onChange, icon }: any) {
   return (
      <div className="flex items-center justify-between p-8 rounded-[32px] bg-secondary/30 border border-border/50 hover:border-primary/20 transition-all group">
         <div className="flex items-center gap-6">
            <div className="h-12 w-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-colors">
               {icon}
            </div>
            <div className="space-y-1">
               <div className="text-xs font-black uppercase tracking-tight italic">{label}</div>
               <div className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">{desc}</div>
            </div>
         </div>
         <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-primary" />
      </div>
   );
}
