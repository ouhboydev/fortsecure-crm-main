import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { STAGES } from "@/lib/sales";
import { Target, Users, Settings2, Save, Loader2, ShieldAlert, Percent, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/goals")({
  head: () => ({ meta: [{ title: "Gestão de Metas — FortSecure" }] }),
  component: () => <AppShell><Goals /></AppShell>,
});

function Goals() {
  const { isManager, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  async function load() {
    setLoading(true);
    try {
      const [p, g, s] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url"),
        supabase.from("goals").select("user_id, target_amount").eq("month", month).eq("year", year),
        supabase.from("app_settings").select("value").eq("key", "forecast_probabilities").single(),
      ]);

      setProfiles(p.data ?? []);
      const map: Record<string, number> = {};
      (g.data ?? []).forEach((x: any) => { map[x.user_id] = Number(x.target_amount); });
      setGoals(map);

      if (s.data) {
        setProbabilities(s.data.value as Record<string, number>);
      } else {
        setProbabilities({ prospect: 20, qualificado: 40, proposta: 60, negociacao: 80, ganho: 100, perdido: 0 });
      }
    } catch (e: any) {
      toast.error("Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveGoal(userId: string, val: number) {
    const { error } = await supabase.from("goals").upsert({ 
      user_id: userId, month, year, target_amount: val 
    }, { onConflict: "user_id,month,year" });
    
    if (error) toast.error(error.message); 
    else {
      toast.success("Meta atualizada");
      setGoals(prev => ({ ...prev, [userId]: val }));
    }
  }

  async function saveProbabilities() {
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({ 
        key: "forecast_probabilities", 
        value: probabilities 
      });
      if (error) throw error;
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isManager) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <div className="h-20 w-20 rounded-3xl bg-secondary border border-border flex items-center justify-center mb-8">
           <ShieldAlert className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Acesso Estratégico Restrito</h2>
        <p className="text-muted-foreground/50 text-sm max-w-xs font-medium leading-relaxed">Configurações de metas e forecast são exclusivas para o nível de gestão.</p>
      </div>
    );
  }

  const totalTeamGoal = Object.values(goals).reduce((s, v) => s + v, 0);

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto min-h-screen space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-border pb-10">
        <PageHeader 
          title="Central Estratégica" 
          subtitle={`Definição de objetivos para ${String(month).padStart(2,"0")}/${year}`} 
        />
        <Card className="bg-card/50 backdrop-blur-md border-border p-6 rounded-3xl shadow-xl overflow-hidden">
          <CardContent className="p-0 flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">Meta Global do Time</div>
              <div className="text-3xl font-bold font-mono text-foreground tracking-tighter">
                {formatCurrency(totalTeamGoal)}
              </div>
            </div>
            <Separator orientation="vertical" className="h-10 bg-border" />
            <div className="h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-10">
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold flex items-center gap-3 text-foreground uppercase tracking-widest">
                 <Users className="h-5 w-5 text-primary" /> Metas Individuais
              </h3>
              <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest border-border">{profiles.length} Agentes</Badge>
           </div>

           <div className="grid gap-3">
              {profiles.map((p) => (
                <Card key={p.id} className="bg-card/30 backdrop-blur-md rounded-2xl border-border hover:border-border transition-all group overflow-hidden">
                  <CardContent className="p-6 flex items-center gap-6">
                    <Avatar className="h-12 w-12 rounded-xl border border-border group-hover:border-primary/50 transition-all shadow-sm">
                      <AvatarImage src={p.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground/30 uppercase">
                        {p.full_name?.[0] || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 font-bold text-foreground group-hover:text-primary transition-colors">{p.full_name}</div>
                    <div className="relative group/input">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-[11px] font-bold">R$</span>
                      <Input
                        type="number" 
                        placeholder="0"
                        defaultValue={goals[p.id] || ""}
                        onBlur={(e) => saveGoal(p.id, Number(e.target.value))}
                        className="w-48 h-14 pl-10 pr-5 bg-secondary/50 border-border focus:ring-1 focus:ring-primary/50 outline-none transition-all text-right font-mono text-sm text-foreground group-hover/input:bg-secondary rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {loading && <div className="py-24 text-center text-[10px] font-bold text-muted-foreground/20 uppercase tracking-[0.4em] animate-pulse">Carregando Agentes...</div>}
           </div>
        </div>

        <div className="space-y-6">
           <Card className="bg-card/50 backdrop-blur-md rounded-3xl border-border sticky top-8 shadow-2xl overflow-hidden">
              <CardHeader className="px-10 pt-10 pb-0 flex flex-row items-center justify-between space-y-0">
                 <CardTitle className="text-sm font-bold flex items-center gap-3 text-foreground uppercase tracking-widest">
                    <Percent className="h-5 w-5 text-primary" /> Probabilidades de Forecast
                 </CardTitle>
                 <Settings2 className="h-5 w-5 text-muted-foreground/30" />
              </CardHeader>

              <CardContent className="p-10 space-y-8">
                <p className="text-[11px] text-muted-foreground/50 font-medium leading-relaxed uppercase tracking-tight">
                  Ajuste as probabilidades de fechamento para cada estágio do funil operacional.
                </p>

                <div className="space-y-3">
                   {STAGES.map((s) => (
                     <div key={s.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border hover:border-border transition-all">
                        <div className="flex items-center gap-3">
                           <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 10px ${s.color}40` }} />
                           <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <Input 
                             type="number" min="0" max="100"
                             value={probabilities[s.key] || 0}
                             onChange={(e) => setProbabilities(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                             className="w-16 h-10 bg-background border-border rounded-lg text-right font-mono text-xs text-foreground focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                           />
                           <span className="text-muted-foreground/30 font-bold text-[10px]">%</span>
                        </div>
                     </div>
                   ))}
                </div>

                <Button 
                  onClick={saveProbabilities}
                  disabled={busy}
                  className="w-full py-7 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  Salvar Configurações
                </Button>

                <div className="pt-8 border-t border-border/10">
                   <p className="text-[9px] text-muted-foreground/20 font-bold leading-relaxed uppercase tracking-widest text-center">
                      As mudanças impactam o forecast global instantaneamente.
                   </p>
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
