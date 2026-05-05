import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/ui-kit/PageHeader";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Database, Trash2, Sparkles, ShieldAlert, Loader2, Info, 
  Users, Settings, Activity, ShieldCheck, UserPlus, 
  Search, Lock, Unlock, Mail, Fingerprint, Crown,
  ArrowUpRight, AlertCircle, Terminal, Save, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel de Controle Elite — FortSecure" }] }),
  component: () => <AppShell><Admin /></AppShell>,
});

const CLIENTS = ["TechCorp", "Acme Ind.", "Globex", "Initech", "Umbrella", "Wayne Ent.", "Stark", "Pied Piper", "Hooli", "Aperture", "Soylent", "Massive Dynamic", "Vandelay", "Cyberdyne", "Nakatomi"];
const TITLES = ["Plano Enterprise", "Renovação anual", "Expansão licenças", "Implementação", "Consultoria", "Add-on premium", "Migração cloud", "Treinamento"];
const STAGES_ALL = ["prospect","qualificado","proposta","negociacao","ganho","perdido"] as const;

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function Admin() {
  const { isAdmin, user: currentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any[]>([]);
  const [globalGoal, setGlobalGoal] = useState("2.000.000");

  useEffect(() => {
    if (isAdmin) {
      refreshData();
    }
  }, [isAdmin]);

  async function refreshData() {
    await Promise.all([
      loadProfiles(),
      loadSettings(),
      loadAuditLogs()
    ]);
  }

  async function loadProfiles() {
    // Get profiles and their roles
    const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("*");
    
    if (profs) {
      const combined = profs.map(p => ({
        ...p,
        role: roles?.find(r => r.user_id === p.id)?.role || 'vendedor'
      }));
      setProfiles(combined);
    }
  }

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("*");
    if (data) {
      setAppSettings(data);
      const goal = data.find(s => s.key === 'global_revenue_goal')?.value as string;
      if (goal) setGlobalGoal(goal);
    }
  }

  async function loadAuditLogs() {
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10);
    if (data) setLogs(data);
  }

  async function updateRole(userId: string, newRole: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("user_roles").upsert({ 
        user_id: userId, 
        role: newRole as any 
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      
      // Log the action
      await supabase.from("audit_logs").insert({
        action: `Alteração de cargo para ${newRole}`,
        entity: "user_roles",
        entity_id: userId,
        user_id: currentUser?.id
      });

      toast.success("Cargo atualizado com sucesso");
      loadProfiles();
      loadAuditLogs();
    } catch (e: any) {
      toast.error("Falha ao atualizar cargo: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateSetting(key: string, value: any) {
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      
      await supabase.from("audit_logs").insert({
        action: `Configuração ${key} alterada`,
        entity: "app_settings",
        data: { value },
        user_id: currentUser?.id
      });

      toast.success("Configuração salva");
      loadSettings();
      loadAuditLogs();
    } catch (e: any) {
      toast.error("Falha ao salvar: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="h-24 w-24 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-10 shadow-2xl shadow-red-500/10"
        >
           <ShieldAlert className="h-10 w-10 text-red-500 animate-pulse" />
        </motion.div>
        <h2 className="text-3xl font-black text-foreground mb-4 uppercase tracking-tighter">Acesso Nível Omega</h2>
        <p className="text-muted-foreground/50 text-xs max-w-xs font-bold leading-relaxed uppercase tracking-widest">
          Credenciais insuficientes para acessar o terminal de controle da FortSecure.
        </p>
      </div>
    );
  }

  async function seed() {
    setBusy(true);
    try {
      const { data: profs } = await supabase.from("profiles").select("id");
      if (!profs?.length) { toast.error("Crie vendedores primeiro."); return; }
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Goals
      const goals = profs.map((p) => ({ user_id: p.id, month, year, target_amount: randInt(50, 200) * 1000 }));
      await supabase.from("goals").upsert(goals, { onConflict: "user_id,month,year" });

      // Opportunities
      const opps: any[] = [];
      profs.forEach((p) => {
        for (let i = 0; i < randInt(8, 18); i++) {
          const stage = rand(STAGES_ALL);
          const value = randInt(3, 80) * 1000;
          opps.push({
            owner_id: p.id, client_name: rand(CLIENTS), title: rand(TITLES), value,
            stage, probability: { prospect: 20, qualificado: 40, proposta: 60, negociacao: 80, ganho: 100, perdido: 0 }[stage],
            closed_at: (stage === "ganho" || stage === "perdido") ? new Date(year, month - 1, randInt(1, Math.min(28, now.getDate()))).toISOString() : null,
            expected_close_date: new Date(year, month - 1, randInt(1, 28)).toISOString().slice(0,10),
          });
        }
      });
      await supabase.from("opportunities").insert(opps);
      
      await supabase.from("audit_logs").insert({ action: "Geração de dados demo", entity: "system", user_id: currentUser?.id });
      
      toast.success("Big Data Gerado com Sucesso!");
      refreshData();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function wipe() {
    if (!confirm("CONFIRMAÇÃO DE NÍVEL 5: Apagar absolutamente todos os dados comerciais?")) return;
    setBusy(true);
    try {
      await supabase.from("commissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("badges").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("meetings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("opportunities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("goals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      await supabase.from("audit_logs").insert({ action: "Wipe total de dados", entity: "system", user_id: currentUser?.id });
      
      toast.success("Banco de dados resetado.");
      refreshData();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSetting = (key: string, defaultValue: any) => appSettings.find(s => s.key === key)?.value ?? defaultValue;

  return (
    <div className="p-8 md:p-12 w-full max-w-[1600px] mx-auto min-h-screen space-y-10 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/40 backdrop-blur-md border border-border/50 p-10 rounded-[48px] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="flex items-center gap-8 relative z-10">
          <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center shadow-inner">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground">Terminal de Comando</h1>
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Nível Admin - Autorização Total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <Button variant="outline" onClick={refreshData} disabled={busy} className="rounded-full border-border/50 text-[10px] font-black uppercase tracking-widest h-10 px-6 gap-2">
            <RefreshCw className={cn("h-3 w-3", busy && "animate-spin")} /> Sincronizar Kernel
          </Button>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            V.2.4.0-EPIC
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-10">
        <TabsList className="bg-card/40 backdrop-blur-md border border-border/50 p-1.5 rounded-[24px] h-auto flex-wrap gap-2">
          <TabsTrigger value="overview" className="rounded-xl px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest gap-2">
            <Activity className="h-3.5 w-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-xl px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest gap-2">
            <Users className="h-3.5 w-3.5" /> Usuários & RBAC
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest gap-2">
            <Settings className="h-3.5 w-3.5" /> Configurações
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl px-6 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-[10px] uppercase tracking-widest gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Auditoria Realtime
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl p-10 space-y-8 flex flex-col group hover:border-primary/30 transition-all duration-500">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Manutenção de Dados</h3>
                <p className="text-xs text-muted-foreground/50 leading-relaxed font-bold">Popule ou limpe o ecossistema comercial com um clique para testes ou auditoria.</p>
              </div>
              <div className="pt-4 space-y-4 mt-auto">
                <Button onClick={seed} disabled={busy} className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 gap-3">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-4 w-4" />}
                  Gerar Dados de Teste
                </Button>
                <Button variant="outline" onClick={wipe} disabled={busy} className="w-full h-14 rounded-2xl border-destructive/20 text-destructive/60 hover:bg-destructive hover:text-destructive-foreground transition-all font-black uppercase tracking-widest text-[10px] gap-3">
                  <Trash2 className="h-4 w-4" /> Reset de Emergência
                </Button>
              </div>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl p-10 space-y-6">
              <div className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground/30">
                <Terminal className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Status do Kernel</h3>
              <div className="space-y-4">
                <StatusItem label="Supabase CDC" status="Ativo" color="emerald" />
                <StatusItem label="RLS Security" status="Fortificado" color="emerald" />
                <StatusItem label="Serviço de IA" status="Online" color="emerald" />
                <StatusItem label="RBAC Policy" status="Strict" color="emerald" />
              </div>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl p-10 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-8 flex items-center">
                <Activity className="h-3 w-3 mr-2 text-primary" /> Atividade Recente
              </h3>
              <div className="space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors">{log.action}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/30">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-0 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input 
                placeholder="Pesquisar por nome ou e-mail..." 
                className="pl-12 h-14 rounded-2xl bg-card/40 backdrop-blur-md border-border/50 text-[13px] font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Usuário</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Função Atual</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Pontos XP</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Alterar Cargo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 rounded-xl border border-border group-hover:border-primary/50 transition-all">
                            <AvatarImage src={p.avatar_url} />
                            <AvatarFallback className="bg-secondary font-bold text-[10px] uppercase text-muted-foreground/40">
                              {p.full_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-[13px] font-bold text-foreground">{p.full_name || 'Usuário Sem Nome'}</div>
                            <div className="text-[10px] font-medium text-muted-foreground/50 lowercase flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {p.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <RoleBadge role={p.role} />
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-primary font-mono">{p.points || 0} XP</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           {['admin', 'gestor', 'vendedor'].map((r) => (
                              <Button
                                 key={r}
                                 size="sm"
                                 variant={p.role === r ? 'default' : 'outline'}
                                 disabled={busy || p.id === currentUser?.id}
                                 onClick={() => updateRole(p.id, r)}
                                 className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest px-3"
                              >
                                 {r}
                              </Button>
                           ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="mt-0">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl p-10 space-y-8">
              <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" /> Variáveis de Kernel
              </h3>
              <div className="space-y-6">
                <ConfigToggle 
                  label="Inteligência Artificial Engine" 
                  description="Ativar processamento de insights via Gemini" 
                  checked={getSetting('enable_ai', true)}
                  onChange={(v: boolean) => updateSetting('enable_ai', v)}
                />
                <ConfigToggle 
                  label="Modo Visibilidade TV" 
                  description="Permitir acesso ao dashboard de transmissão" 
                  checked={getSetting('enable_tv_mode', true)}
                  onChange={(v: boolean) => updateSetting('enable_tv_mode', v)}
                />
                <ConfigToggle 
                  label="Gamificação & XP" 
                  description="Habilitar sistema de pontos e conquistas" 
                  checked={getSetting('enable_gamification', true)}
                  onChange={(v: boolean) => updateSetting('enable_gamification', v)}
                />
              </div>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl p-10 space-y-8">
               <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500" /> Diretrizes Corporativas
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Meta Mensal Empresa (BRL)</label>
                   <div className="flex gap-4">
                      <Input 
                        value={globalGoal} 
                        onChange={(e) => setGlobalGoal(e.target.value)}
                        className="h-14 rounded-2xl bg-secondary/50 border-border/50 text-xl font-black" 
                      />
                      <Button 
                        onClick={() => updateSetting('global_revenue_goal', globalGoal)}
                        disabled={busy}
                        className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground"
                      >
                        <Save className="h-5 w-5" />
                      </Button>
                   </div>
                </div>
                <div className="flex items-center gap-3 p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-emerald-500">
                   <CheckCircle2 className="h-5 w-5 shrink-0" />
                   <p className="text-[10px] font-bold leading-relaxed uppercase tracking-widest">Todas as alterações são aplicadas instantaneamente a todos os usuários via Postgres Realtime.</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
        
        {/* SECURITY TAB */}
        <TabsContent value="security" className="mt-0">
           <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-2xl overflow-hidden">
              <CardHeader className="p-10">
                 <CardTitle className="text-xl font-black uppercase tracking-tight">Registro de Auditoria do Sistema</CardTitle>
                 <CardDescription className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Monitoramento de transações e alterações de privilégios</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-secondary/30">
                       <tr>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Data/Hora</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Ação Executada</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Entidade</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">ID Alvo</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                       {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-foreground/5 transition-all">
                             <td className="px-8 py-6 text-xs font-mono text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                             <td className="px-8 py-6 text-xs font-bold text-foreground italic">{log.action}</td>
                             <td className="px-8 py-6"><Badge variant="outline" className="text-[10px] uppercase font-black">{log.entity}</Badge></td>
                             <td className="px-8 py-6 text-[10px] font-mono text-muted-foreground/30">{log.entity_id || 'N/A'}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusItem({ label, status, color }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/50">
      <span className="text-[11px] font-bold text-muted-foreground/60">{label}</span>
      <Badge className={cn("bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest", color === 'emerald' ? 'text-emerald-500 border-emerald-500/20' : '')}>
         {status}
      </Badge>
    </div>
  );
}

function RoleBadge({ role }: any) {
  const styles: any = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    gestor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    vendedor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };
  const labels: any = { admin: "Administrator", gestor: "Manager", vendedor: "Senior Seller" };
  
  return (
    <Badge className={cn("px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", styles[role || 'vendedor'])}>
       {labels[role || 'vendedor']}
    </Badge>
  );
}

function ConfigToggle({ label, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between gap-6 group">
      <div className="space-y-1">
        <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{label}</p>
        <p className="text-[10px] text-muted-foreground/50 font-medium">{description}</p>
      </div>
      <Button 
        onClick={() => onChange(!checked)}
        className={cn(
          "h-8 w-14 rounded-full p-1 flex transition-all duration-500 shadow-inner",
          checked ? "bg-primary justify-end" : "bg-secondary justify-start"
        )}
      >
        <motion.div layout className="h-6 w-6 rounded-full bg-background shadow-xl" />
      </Button>
    </div>
  );
}

function RefreshCw({ className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M3 21v-5h5"/>
    </svg>
  );
}
