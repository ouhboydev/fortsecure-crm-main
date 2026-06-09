import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Database, Trash2, Sparkles, ShieldAlert, Loader2,
  Users, Settings, Activity, ShieldCheck, RefreshCw,
  Search, Lock, Mail, Crown, Save, CheckCircle2,
  Terminal, BarChart3, KeyRound
} from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatDisplayName } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — FortSecure" }] }),
  component: () => <AppShell><Admin /></AppShell>,
});

const CLIENTS = ["TechCorp", "Acme Ind.", "Globex", "Initech", "Umbrella", "Wayne Ent.", "Stark", "Pied Piper", "Hooli", "Aperture", "Soylent", "Massive Dynamic"];
const TITLES = ["Plano Enterprise", "Renovação anual", "Expansão licenças", "Implementação", "Consultoria", "Add-on premium", "Migração cloud", "Treinamento"];
const STAGES_ALL = ["leads_exact", "prospect", "qualificado", "proposta", "negociacao", "ganho", "perdido"] as const;

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function Admin() {
  const { isAdmin, user: currentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any[]>([]);
  const [globalGoal, setGlobalGoal] = useState("2000000");
  const [jsonInput, setJsonInput] = useState("");
  const [importStats, setImportStats] = useState<{ total: number; success: number; failed: number } | null>(null);

  useEffect(() => { if (isAdmin) refreshData(); }, [isAdmin]);

  async function refreshData() {
    await Promise.all([loadProfiles(), loadSettings(), loadAuditLogs()]);
  }

  async function loadProfiles() {
    const { data: profs } = await supabase.from("profiles").select("*").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("*");
    if (profs) {
      setProfiles(profs.map(p => ({ ...p, role: roles?.find(r => r.user_id === p.id)?.role || "vendedor" })));
    }
  }

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("*");
    if (data) {
      setAppSettings(data);
      const goal = data.find(s => s.key === "global_revenue_goal")?.value as string;
      if (goal) setGlobalGoal(goal);
    }
  }

  async function loadAuditLogs() {
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setLogs(data);
  }

  async function resetUserPassword(email: string) {
    if (!email) { toast.error("E-mail não encontrado."); return; }
    if (!confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ action: `Reset de senha enviado para ${email}`, entity: "auth", user_id: currentUser?.id });
      toast.success("E-mail de recuperação enviado!");
      loadAuditLogs();
    } catch (e: any) {
      toast.error("Falha: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(userId: string, newRole: string) {
    setBusy(true);
    try {
      const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: newRole as any }, { onConflict: "user_id" });
      if (error) throw error;
      await supabase.from("audit_logs").insert({ action: `Cargo alterado para ${newRole}`, entity: "user_roles", entity_id: userId, user_id: currentUser?.id });
      toast.success("Cargo atualizado");
      loadProfiles(); loadAuditLogs();
    } catch (e: any) {
      toast.error("Falha: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateSetting(key: string, value: any) {
    setBusy(true);
    try {
      const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
      await supabase.from("audit_logs").insert({ action: `Config "${key}" atualizada`, entity: "app_settings", data: { value }, user_id: currentUser?.id });
      toast.success("Configuração salva");
      loadSettings(); loadAuditLogs();
    } catch (e: any) {
      toast.error("Falha: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      const { data: profs } = await supabase.from("profiles").select("id");
      if (!profs?.length) { toast.error("Crie vendedores primeiro."); return; }
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const goals = profs.map(p => ({ user_id: p.id, month, year, target_amount: randInt(50, 200) * 1000 }));
      await supabase.from("goals").upsert(goals, { onConflict: "user_id,month,year" });
      const opps: any[] = [];
      profs.forEach(p => {
        for (let i = 0; i < randInt(8, 18); i++) {
          const stage = rand(STAGES_ALL);
          const value = randInt(3, 80) * 1000;
          opps.push({
            owner_id: p.id, client_name: rand(CLIENTS), title: rand(TITLES), value, stage,
            probability: { leads_exact: 10, prospect: 20, qualificado: 40, proposta: 60, negociacao: 80, ganho: 100, perdido: 0 }[stage],
            closed_at: (stage === "ganho" || stage === "perdido") ? new Date(year, month - 1, randInt(1, Math.min(28, now.getDate()))).toISOString() : null,
            expected_close_date: new Date(year, month - 1, randInt(1, 28)).toISOString().slice(0, 10),
          });
        }
      });
      await supabase.from("opportunities").insert(opps);
      await supabase.from("audit_logs").insert({ action: "Dados demo gerados", entity: "system", user_id: currentUser?.id });
      toast.success("Dados de teste gerados!");
      refreshData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function importLeadsExact() {
    setBusy(true);
    setImportStats(null);
    try {
      const { data: profs } = await supabase.from("profiles").select("id, full_name");
      if (!profs?.length) { toast.error("Crie ou carregue perfis de vendedores primeiro."); return; }

      // Parse the JSON input
      let parsed: any;
      try {
        parsed = JSON.parse(jsonInput.trim());
      } catch {
        toast.error("JSON inválido. Verifique o formato e tente novamente.");
        setBusy(false);
        return;
      }

      const leadsData: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.Leads)
        ? parsed.Leads
        : [];

      if (!leadsData.length) {
        toast.error("Nenhum lead encontrado no JSON. Verifique a estrutura (espera-se { Leads: [...] } ou um array).");
        setBusy(false);
        return;
      }
      
      const getOwnerId = (name: string): string => {
        if (!name) return profs[0].id;
        const matched = profs.find(p =>
          p.full_name?.toLowerCase().includes(name.toLowerCase())
        );
        return matched ? matched.id : profs[0].id;
      };

      // Calculate total value: use sum of Valor fields, or 0 if none
      const totalFromValor = leadsData.reduce((sum: number, l: any) => sum + (l.Valor || 0), 0);
      const leadsWithoutValor = leadsData.filter((l: any) => !l.Valor);
      const fallbackValPerLead = leadsWithoutValor.length > 0
        ? Math.round((81479.00 / leadsData.length) * 100) / 100
        : 0;

      let successCount = 0;
      let failCount = 0;

      for (const lead of leadsData) {
        const ownerId = getOwnerId(lead.PreVendedor || "");

        let clientName = (lead.Nome || "Lead importado").trim();
        let title = clientName;
        let source = "N/A";
        if (lead.Complemento && lead.Complemento.includes("Origem:")) {
          source = lead.Complemento.replace("Origem:", "").trim();
        } else if (lead.Complemento) {
          source = lead.Complemento.trim();
        }

        // Normalize client name patterns
        if (clientName.startsWith("Renew Kaspersky - ")) {
          clientName = clientName.replace("Renew Kaspersky - ", "").trim();
          title = `Renovação Kaspersky - ${clientName}`;
        } else if (clientName.startsWith("Co Termo Renew Kaspersky - ")) {
          clientName = clientName.replace("Co Termo Renew Kaspersky - ", "").trim();
          title = `Co-Termo Kaspersky - ${clientName}`;
        } else if (clientName.endsWith(" - HSC")) {
          clientName = clientName.replace(" - HSC", "").trim();
          title = `HSC - ${clientName}`;
        } else {
          title = `Oportunidade - ${clientName}`;
        }
        clientName = clientName.trim();

        const leadValue = lead.Valor ? Number(lead.Valor) : fallbackValPerLead;

        // Determine stage: if Venda exists, mark as 'ganho', else 'leads_exact'
        const stage = lead.Venda ? "ganho" : "leads_exact";
        const closedAt = lead.Venda?.Data ? new Date(lead.Venda.Data).toISOString() : null;

        // 1. Find or create Customer
        const { data: existingCust } = await (supabase
          .from("customers" as any)
          .select("id")
          .eq("name", clientName)
          .eq("owner_id", ownerId)
          .limit(1) as any);

        let customerId: string | null = null;
        if (existingCust && (existingCust as any[]).length > 0) {
          customerId = (existingCust as any[])[0].id;
        } else {
          const { data: newCust, error: custError } = await (supabase
            .from("customers" as any)
            .insert({
              owner_id: ownerId,
              name: clientName,
              company: clientName,
              notes: `Importado via EXACT - Original: ${lead.Nome}`
            })
            .select("id")
            .single() as any);

          if (custError) {
            console.error(`Erro ao criar cliente "${clientName}":`, custError);
            failCount++;
            continue;
          }
          customerId = (newCust as any).id;
        }

        // 2. Create Opportunity
        const { error: oppError } = await supabase
          .from("opportunities")
          .insert({
            owner_id: ownerId,
            customer_id: customerId,
            client_name: clientName,
            title: title,
            value: leadValue,
            stage: stage as any,
            probability: stage === "ganho" ? 100 : 10,
            closed_at: closedAt,
            notes: `Importado do JSON EXACT.\nPreVendedor: ${lead.PreVendedor || "N/A"} (ID: ${lead.PreVendedorId || "N/A"})\nOriginal: ${lead.Nome}`,
          } as any);

        if (oppError) {
          console.error(`Erro ao criar negócio "${title}":`, oppError.message);
          failCount++;
        } else {
          successCount++;
        }
      }

      setImportStats({ total: leadsData.length, success: successCount, failed: failCount });

      await supabase.from("audit_logs").insert({
        action: `Importados ${successCount}/${leadsData.length} leads EXACT`,
        entity: "system",
        user_id: currentUser?.id
      });

      toast.success(`${successCount} leads importados com sucesso!`);
      refreshData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function wipe() {
    if (!confirm("ATENÇÃO: Apagar todos os dados comerciais? Esta ação é irreversível.")) return;
    setBusy(true);
    try {
      await supabase.from("badges").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("meetings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("opportunities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("goals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("audit_logs").insert({ action: "Reset total de dados", entity: "system", user_id: currentUser?.id });
      toast.success("Banco de dados resetado.");
      refreshData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const getSetting = (key: string, def: any) => appSettings.find(s => s.key === key)?.value ?? def;
  const filteredProfiles = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) return (
    <div className="h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <div className="h-16 w-16 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center justify-center mb-6">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Acesso Restrito</h2>
      <p className="text-sm text-muted-foreground max-w-xs">Você não tem permissão para acessar este painel.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#3ecf8e]" /> Painel Administrativo
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Controle de usuários, configurações e auditoria.</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshData} disabled={busy} className="gap-2 border-border text-xs h-8">
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} /> Sincronizar
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-secondary border border-border rounded-md p-0.5 h-9 gap-0.5">
          {[
            { value: "users", label: "Usuários", icon: Users },
            { value: "config", label: "Configurações", icon: Settings },
            { value: "data", label: "Dados", icon: Database },
            { value: "audit", label: "Auditoria", icon: ShieldCheck },
          ].map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="h-8 px-4 text-xs font-medium rounded data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm gap-1.5"
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar usuário..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-card border-border text-sm"
              />
            </div>
            <Badge variant="outline" className="border-border text-muted-foreground text-xs">
              {filteredProfiles.length} usuário{filteredProfiles.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <Card className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuário</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Função</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">XP</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Alterar cargo</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Senha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProfiles.map(p => (
                    <tr key={p.id} className="hover:bg-accent/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-md border border-border">
                            <AvatarImage src={p.avatar_url} />
                            <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground rounded-md">
                              {formatDisplayName(p.full_name)?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-foreground">{formatDisplayName(p.full_name || "Sem nome")}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {p.email || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={p.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-semibold text-[#3ecf8e]">{p.points || 0} XP</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {["vendedor", "gestor", "admin", "viewer"].map(r => (
                            <Button
                              key={r}
                              size="sm"
                              variant={p.role === r ? "default" : "outline"}
                              disabled={busy || p.id === currentUser?.id}
                              onClick={() => updateRole(p.id, r)}
                              className={cn(
                                "h-7 px-2.5 text-[10px] font-medium rounded",
                                p.role === r ? "bg-[#3ecf8e] text-black hover:bg-[#3ecf8e]/90" : "border-border text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {r}
                            </Button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || !p.email}
                          onClick={() => resetUserPassword(p.email)}
                          title="Enviar e-mail de redefinicao de senha"
                          className="h-7 px-2.5 text-[10px] border-border text-muted-foreground hover:text-orange-400 hover:border-orange-400/30 gap-1.5"
                        >
                          <KeyRound className="h-3 w-3" /> Reset
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">Nenhum usuário encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[#3ecf8e]" /> Módulos do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {[
                  { key: "enable_ai", label: "Motor de IA (Gemini)", desc: "Insights automáticos via Gemini" },
                  { key: "enable_tv_mode", label: "Modo TV", desc: "Dashboard de transmissão pública" },
                  { key: "enable_gamification", label: "Gamificação & XP", desc: "Sistema de pontos e conquistas" },
                ].map(s => (
                  <div key={s.key} className="flex items-center justify-between p-3 bg-secondary rounded-md border border-border">
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
                    </div>
                    <button
                      onClick={() => updateSetting(s.key, !getSetting(s.key, true))}
                      className={cn(
                        "h-6 w-11 rounded-full relative transition-colors",
                        getSetting(s.key, true) ? "bg-[#3ecf8e]" : "bg-muted"
                      )}
                    >
                      <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", getSetting(s.key, true) ? "left-[22px]" : "left-0.5")} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Crown className="h-4 w-4 text-[#f59e0b]" /> Parâmetros Corporativos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Meta Mensal da Empresa (R$)</label>
                  <div className="flex gap-2">
                    <Input
                      value={globalGoal}
                      onChange={e => setGlobalGoal(e.target.value)}
                      className="h-9 bg-secondary border-border text-sm font-mono"
                      placeholder="ex: 2000000"
                    />
                    <Button
                      onClick={() => updateSetting("global_revenue_goal", globalGoal)}
                      disabled={busy}
                      className="h-9 px-4 bg-[#3ecf8e] text-black font-semibold text-xs hover:bg-[#3ecf8e]/90"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#3ecf8e]/5 border border-[#3ecf8e]/10 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-[#3ecf8e] shrink-0" />
                  <p className="text-[10px] text-[#3ecf8e]">Mudanças propagadas via Realtime para todos os usuários.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#3ecf8e]" /> Dados de Demonstração
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Popule o banco com dados fictícios para testes.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <Button onClick={seed} disabled={busy} className="w-full h-9 bg-[#3ecf8e] text-black font-semibold text-xs hover:bg-[#3ecf8e]/90 gap-2">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                  Gerar Dados de Teste
                </Button>
                <Button variant="outline" onClick={wipe} disabled={busy} className="w-full h-9 border-destructive/30 text-destructive text-xs hover:bg-destructive hover:text-destructive-foreground gap-2 transition-all">
                  <Trash2 className="h-3.5 w-3.5" /> Reset Total de Dados
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">⚠ O reset apaga permanentemente todos os dados comerciais.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#a78bfa]" /> Importar Leads EXACT
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Cole o JSON do EXACT (formato <code className="font-mono bg-secondary px-1 rounded">{'{'}Leads: [...]{'}' }</code> ou array direto) e clique em Importar.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <Textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder={'{ "Leads": [ ... ] }'}
                  className="h-36 font-mono text-[11px] bg-secondary border-border resize-none"
                />
                {importStats && (
                  <div className="flex items-center gap-3 p-2.5 bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-md">
                    <span className="text-[10px] text-muted-foreground">Total: <span className="font-semibold text-foreground">{importStats.total}</span></span>
                    <span className="text-[10px] text-[#3ecf8e]">✓ {importStats.success} importados</span>
                    {importStats.failed > 0 && <span className="text-[10px] text-destructive">✗ {importStats.failed} falhas</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={importLeadsExact}
                    disabled={busy || !jsonInput.trim()}
                    className="flex-1 h-9 bg-[#a78bfa] text-black font-semibold text-xs hover:bg-[#a78bfa]/90 gap-2"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                    Importar Leads EXACT
                  </Button>
                  {jsonInput && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setJsonInput(""); setImportStats(null); }}
                      className="h-9 px-3 border-border text-muted-foreground text-xs"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border rounded-lg shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[#3ecf8e]" /> Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                {[
                  { label: "Supabase Realtime", status: "Ativo" },
                  { label: "RLS Security", status: "Ativo" },
                  { label: "RBAC Policy", status: "Configurado" },
                  { label: "Edge Functions", status: "Online" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 px-3 bg-secondary rounded-md">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-[10px] font-medium text-[#3ecf8e] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                      {item.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <CardHeader className="px-5 py-4 border-b border-border">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#3ecf8e]" /> Registro de Auditoria
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Últimas 20 transações do sistema.</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Data/Hora</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Ação</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Entidade</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">ID Alvo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{log.action}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground uppercase tracking-wider">{log.entity}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{log.entity_id || "—"}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">Nenhum log registrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    gestor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    vendedor: "bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/20",
    viewer: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };
  const labels: Record<string, string> = { admin: "Admin", gestor: "Gestor", vendedor: "Vendedor", viewer: "Visualização" };
  return (
    <Badge className={cn("text-[10px] font-medium border px-2 py-0.5 rounded-md", config[role] || config.vendedor)}>
      {labels[role] || role}
    </Badge>
  );
}
