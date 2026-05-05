import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, StatCard, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAppSettings } from "@/lib/sales";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { 
  Trophy, Target, Zap, TrendingUp, 
  Clock, CheckCircle2, AlertCircle, 
  Calendar, PhoneCall, MapPin, Loader2,
  ArrowUpRight, Star, Award
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [{ title: "Meu Painel — FortSecure" }] }),
  component: () => <AppShell><MyPanel /></AppShell>,
});

function MyPanel() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [oppsRes, actsRes, badgeRes, settings] = await Promise.all([
        supabase.from("opportunities").select("*").eq("owner_id", user.id),
        supabase.from("activities").select("*").eq("owner_id", user.id).order("due_date", { ascending: false }).limit(5),
        supabase.from("badges").select("*").eq("user_id", user.id),
        fetchAppSettings()
      ]);

      const opps = oppsRes.data ?? [];
      const won = opps.filter(o => o.stage === 'ganho');
      const revenue = won.reduce((sum, o) => sum + Number(o.value), 0);
      const pipe = opps.filter(o => !['ganho', 'perdido'].includes(o.stage)).reduce((sum, o) => sum + Number(o.value), 0);

      const rate = Number(settings.commission_rate || 15);
      const commission = (revenue * rate) / 100;

      setMetrics({
        revenue,
        pipeline: pipe,
        count: won.length,
        points: won.length,
        commission
      });
      setActivities(actsRes.data ?? []);
      setBadges(badgeRes.data ?? []);
    }
    load();
  }, [user]);

  if (!metrics) return (
    <div className="h-screen flex flex-col items-center justify-center space-y-6 bg-background text-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
      <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/60">Recuperando Perfil Operacional...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-foreground p-6 md:p-10 space-y-12 max-w-[1500px] mx-auto pb-32">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 pb-12 border-b border-border/50">
        <PageHeader 
          title="Painel Pessoal" 
          subtitle="Seu painel de performance individual e conquistas táticas" 
        />
        
        <div className="flex items-center gap-10 px-8 py-6 bg-card/40 backdrop-blur-3xl border border-border/50 rounded-[32px] shadow-2xl">
          <div className="text-right space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Reputação Total</div>
            <div className="text-4xl font-black font-mono text-primary tracking-tighter italic">{metrics.points} XP</div>
          </div>
          <div className="h-12 w-px bg-border/50" />
          <div className="text-right space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">Status de Operador</div>
            <div className="flex items-center gap-3 justify-end">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">Agente Elite</Badge>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#10b981]" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
         <StatCard 
            label="Receita Liquidada" 
            value={formatCurrency(metrics.revenue)} 
            hint={`${metrics.count} Missões Concluídas`} 
            icon={<TrendingUp className="h-6 w-6" />} 
            accent="success" 
         />
         <StatCard 
            label="Volume em Negociação" 
            value={formatCurrency(metrics.pipeline)} 
            hint="Potencial Bruto de Conversão" 
            icon={<Target className="h-6 w-6" />} 
         />
         <StatCard 
            label="Comissões Acumuladas" 
            value={formatCurrency(metrics.commission)} 
            hint={`Taxa: ${Number(metrics.commission > 0 ? (metrics.commission / metrics.revenue) * 100 : 15).toFixed(1)}% aplicada`} 
            icon={<Award className="h-6 w-6" />} 
            accent="primary"
         />
      </div>

      <div className="relative z-10 grid lg:grid-cols-[1fr_450px] gap-10">
        <div className="space-y-10">
          <Card className="bg-card/40 backdrop-blur-3xl border-border/50 rounded-[40px] overflow-hidden shadow-2xl">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-[0.4em] flex items-center gap-4 italic">
                <span className="h-4 w-1 bg-primary rounded-full shadow-[0_0_15px_#10b981]" /> Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-6 space-y-4">
              {activities.map(a => (
                <div key={a.id} className="p-6 rounded-[24px] bg-secondary/30 border border-border group hover:border-primary/30 transition-all flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-6">
                    <div className={cn("h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center transition-all group-hover:scale-110", a.type === 'ligacao' ? "text-primary" : "text-blue-500")}>
                      {a.type === 'ligacao' ? <PhoneCall className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-black text-foreground group-hover:text-primary transition-colors tracking-tight uppercase italic">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">{new Date(a.due_date).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground group-hover:text-primary/40 transition-colors">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-border rounded-[32px] text-muted-foreground/30 font-black text-[10px] uppercase tracking-[0.4em] italic">
                  Silêncio operacional total
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-10">
          <Card className="bg-card/40 backdrop-blur-3xl border-border/50 rounded-[40px] overflow-hidden shadow-2xl">
            <CardHeader className="p-10 pb-4">
              <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-[0.4em] flex items-center gap-4 italic">
                <span className="h-4 w-1 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]" /> Especializações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-6">
              <div className="grid grid-cols-2 gap-4">
                {badges.map(b => (
                  <div key={b.id} className="bg-background border border-border p-6 rounded-[28px] flex flex-col items-center text-center group hover:border-primary/40 transition-all shadow-inner">
                    <div className="h-16 w-16 bg-secondary border border-border rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-2xl">
                      {b.badges?.icon || '🏅'}
                    </div>
                    <div className="text-[11px] font-black text-foreground uppercase tracking-tighter italic">{b.badges?.name}</div>
                    <div className="text-[9px] text-muted-foreground mt-2 uppercase font-bold tracking-widest leading-relaxed line-clamp-2">{b.badges?.description}</div>
                  </div>
                ))}
                {badges.length === 0 && (
                  <div className="col-span-2 py-20 text-center border-2 border-dashed border-border rounded-[32px] text-muted-foreground/30 font-black text-[10px] uppercase tracking-[0.4em] italic">
                    Nenhuma especialização ativa
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border border-primary/20 p-10 rounded-[40px] relative overflow-hidden group shadow-2xl shadow-emerald-500/5">
             <div className="absolute top-0 right-0 p-8 text-primary/5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-1000">
                <Zap className="h-32 w-32" />
             </div>
             <CardContent className="p-0 relative z-10">
               <div className="flex items-center justify-between mb-10">
                 <div className="h-12 w-12 rounded-2xl bg-background border border-border flex items-center justify-center shadow-xl">
                   <Zap className="h-6 w-6 text-primary animate-pulse" />
                 </div>
                 <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
               </div>
               <div className="space-y-4">
                 <div className="text-foreground font-black text-2xl uppercase tracking-tighter italic leading-none">Próximo Escalão</div>
                 <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                   Faltam <span className="text-primary font-black text-xs">5 missões ganhas</span> para atingir o Rank de <span className="text-foreground">Especialista III</span>
                 </p>
                 <div className="h-1.5 w-full bg-background rounded-full mt-6 overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '40%' }}
                    className="h-full bg-primary shadow-[0_0_15px_#10b981]"
                   />
                 </div>
               </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
