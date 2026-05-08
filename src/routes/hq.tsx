import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Target, Users, Package, Loader2, Save,
  Shield, ArrowUpRight, Check, AlertTriangle, TrendingUp,
  Settings2, Mail, Key, User as UserIcon, Camera, Pencil
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { cn, parseCurrency, formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/hq")({
  head: () => ({ meta: [{ title: "Metas — FortSecure" }] }),
  component: () => <AppShell><Goals /></AppShell>,
});

// ─── Radial progress helper ─────────────────────────────────────────────────
function RadialProgress({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} stroke="#262626" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} strokeWidth={6}
        stroke={color} fill="none" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
function Goals() {
  const { isManager, isAdmin } = useAuth();
  const nav = useNavigate();
  const canManage = isManager || isAdmin;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Global goal (monthly, saved in app_settings)
  const [globalGoal, setGlobalGoal] = useState("");
  const [savedGlobalGoal, setSavedGlobalGoal] = useState(0);

  // Seller goals
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sellerGoals, setSellerGoals] = useState<Record<string, string>>({});
  const [savedSellerGoals, setSavedSellerGoals] = useState<Record<string, number>>({});

  // Product goals (read-only panel — edit in Produtos)
  const [products, setProducts] = useState<any[]>([]);

  // Revenue actuals (current quarter)
  const [revenue, setRevenue] = useState(0);
  const [sellerRevenue, setSellerRevenue] = useState<Record<string, number>>({});

  // Management Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", avatar_url: "" });

  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const qMonths = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
  const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];
  const qLabel = QUARTER_LABELS[quarter];

  async function load() {
    setLoading(true);
    try {
      const [profilesRes, settingsRes, goalsRes, oppsRes, prodsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("app_settings").select("key, value"),
        supabase.from("goals").select("*").eq("year", now.getFullYear()),
        supabase.from("opportunities").select("owner_id, value, stage, closed_at").eq("stage", "ganho"),
        supabase.from("products").select("id, name, metadata").order("name"),
        supabase.from("user_roles").select("*"),
      ]);

      const allProfiles = profilesRes.data || [];
      const allRoles = rolesRes.data || [];

      // Filter: only sellers (exclude gestor, admin, manager)
      const sellersOnly = allProfiles.filter(p => {
        const role = allRoles.find(r => r.user_id === p.id)?.role;
        return role === 'vendedor';
      });

      setProfiles(sellersOnly);
      if (prodsRes.data) setProducts(prodsRes.data);

      // Global goal from app_settings
      const globalSetting = settingsRes.data?.find(s => s.key === "global_revenue_goal");
      const gVal = globalSetting ? Number(globalSetting.value) : 0;
      setSavedGlobalGoal(gVal);
      setGlobalGoal(gVal ? formatCurrencyBRL(gVal) : "");

      // Per-seller goals from goals table (current year, any month)
      const sGoalMap: Record<string, number> = {};
      goalsRes.data?.forEach(g => {
        if (g.user_id) {
          sGoalMap[g.user_id] = (sGoalMap[g.user_id] || 0) + Number(g.target_amount);
        }
      });
      setSavedSellerGoals(sGoalMap);
      const sGoalStr: Record<string, string> = {};
      Object.entries(sGoalMap).forEach(([k, v]) => { sGoalStr[k] = formatCurrencyBRL(v); });
      setSellerGoals(sGoalStr);

      // Revenue actuals for current quarter
      let totalRevenue = 0;
      const sRev: Record<string, number> = {};
      (oppsRes.data ?? []).forEach(o => {
        if (!o.closed_at) return;
        const m = new Date(o.closed_at).getMonth();
        if (!qMonths.includes(m)) return;
        const val = Number(o.value);
        totalRevenue += val;
        sRev[o.owner_id] = (sRev[o.owner_id] || 0) + val;
      });
      setRevenue(totalRevenue);
      setSellerRevenue(sRev);
    } catch {
      toast.error("Erro ao carregar metas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveGlobalGoal() {
    const val = parseCurrency(globalGoal);
    if (!val) { toast.error("Informe um valor válido"); return; }
    setBusy("global");
    try {
      // Save directly as the quarterly goal
      const { error } = await supabase.from("app_settings").upsert({ key: "global_revenue_goal", value: val }, { onConflict: "key" });
      
      if (error) throw error;

      setSavedGlobalGoal(val);
      setGlobalGoal(formatCurrencyBRL(val));
      toast.success("Meta global trimestral salva!");
    } catch (err: any) { 
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente")); 
    }
    finally { setBusy(null); }
  }

  function openEditProfile(p: any) {
    setEditingProfile(p);
    setEditForm({ full_name: p.full_name || "", email: p.email || "", avatar_url: p.avatar_url || "" });
    setIsEditModalOpen(true);
  }

  async function updateProfile() {
    if (!editingProfile) return;
    setBusy("profile-update");
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: editForm.full_name,
        avatar_url: editForm.avatar_url,
      }).eq("id", editingProfile.id);

      if (error) throw error;
      toast.success("Perfil atualizado!");
      setIsEditModalOpen(false);
      load();
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword() {
    if (!editingProfile?.email) {
      toast.error("Email do usuário não encontrado.");
      return;
    }
    setBusy("reset-pw");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(editingProfile.email);
      if (error) throw error;
      toast.success("E-mail de recuperação enviado para " + editingProfile.email);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setBusy(null);
    }
  }

  async function saveSellerGoal(userId: string) {
    const val = parseCurrency(sellerGoals[userId] || "0");
    setBusy(userId);
    try {
      // Upsert a yearly goal row (month=0 = annual)
      const { error } = await supabase.from("goals").upsert({
        user_id: userId,
        target_amount: val,
        month: 0,
        year: now.getFullYear(),
      }, { onConflict: "user_id,month,year" });

      if (error) throw error;

      setSavedSellerGoals(prev => ({ ...prev, [userId]: val }));
      setSellerGoals(prev => ({ ...prev, [userId]: formatCurrencyBRL(val) }));
      toast.success("Meta do vendedor salva!");
    } catch (err: any) { 
      toast.error("Erro ao salvar meta: " + (err.message || "Tente novamente")); 
    }
    finally { setBusy(null); }
  }

  if (!canManage) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
        <Shield className="h-6 w-6 text-destructive/40" />
      </div>
      <p className="text-xs text-muted-foreground font-medium">Acesso restrito a gestores</p>
    </div>
  );

  const globalAttainment = savedGlobalGoal > 0 ? Math.round((revenue / savedGlobalGoal) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1100px] mx-auto">
      <PageHeader
        title="Metas"
        subtitle={`Configuração de metas de receita · ${qLabel} ${now.getFullYear()}`}
      />

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Global Goal ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-[#3ecf8e]/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-[#3ecf8e]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Meta Global de Receita</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Meta trimestral da empresa — utilizada no atingimento do dashboard</p>
              </div>
            </div>
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Radial */}
              <div className="relative flex items-center justify-center shrink-0">
                <RadialProgress pct={globalAttainment} color={globalAttainment >= 100 ? "#3ecf8e" : "#f59e0b"} size={100} />
                <div className="absolute flex flex-col items-center">
                  <span className={cn("text-lg font-black font-mono leading-none", globalAttainment >= 100 ? "text-[#3ecf8e]" : "text-yellow-400")}>
                    {globalAttainment}%
                  </span>
                  <span className="text-[8px] text-muted-foreground">do {qLabel}</span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 border border-border rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Receita {qLabel}</p>
                    <p className="text-base font-black font-mono text-foreground">{formatCurrency(revenue)}</p>
                  </div>
                  <div className="bg-secondary/30 border border-border rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Meta {qLabel} (Total)</p>
                    <p className="text-base font-black font-mono text-foreground">{savedGlobalGoal ? formatCurrency(savedGlobalGoal) : "—"}</p>
                  </div>
                </div>

                {/* Edit */}
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Meta do Trimestre (BRL)</Label>
                    <Input
                      value={globalGoal}
                      onChange={e => setGlobalGoal(e.target.value)}
                      onBlur={e => setGlobalGoal(formatCurrencyBRL(e.target.value))}
                      placeholder="R$ 0,00"
                      className="h-9 bg-background border-border font-mono text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Valor total desejado para os 3 meses de {qLabel}</p>
                  </div>
                  <Button onClick={saveGlobalGoal} disabled={busy === "global"}
                    className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2 shrink-0">
                    {busy === "global" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Per-seller Goals ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Metas por Vendedor</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Meta anual individual · {now.getFullYear()}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {profiles.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-10">Nenhum vendedor encontrado.</p>
              )}
              {profiles.map(p => {
                const saved = savedSellerGoals[p.id] || 0;
                const actual = sellerRevenue[p.id] || 0;
                const pct = saved > 0 ? Math.min(Math.round((actual / saved) * 100), 999) : 0;
                const isOver = pct >= 100;
                const initials = p.full_name ? p.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "?";

                return (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/20 transition-colors">
                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {p.avatar_url
                        ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt={p.full_name} />
                        : initials}
                    </div>

                    {/* Name + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground truncate">{p.full_name}</span>
                        {saved > 0 && (
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded ml-2 shrink-0",
                            isOver ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-yellow-500/10 text-yellow-400"
                          )}>{pct}%</span>
                        )}
                      </div>
                      {saved > 0 && (
                        <>
                          <div className="h-1 bg-secondary rounded-full overflow-hidden mb-1">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isOver ? "#3ecf8e" : "#f59e0b" }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                            <span>{formatCurrency(actual)} realizados</span>
                            <span>meta: {formatCurrency(saved)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Goal input + save */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        value={sellerGoals[p.id] || ""}
                        onChange={e => setSellerGoals(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onBlur={e => setSellerGoals(prev => ({ ...prev, [p.id]: formatCurrencyBRL(e.target.value) }))}
                        placeholder="R$ 0,00"
                        className="h-8 w-32 bg-background border-border font-mono text-[11px]"
                      />
                      <Button
                        size="icon"
                        onClick={() => saveSellerGoal(p.id)}
                        disabled={busy === p.id}
                        className="h-8 w-8 bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] border border-[#3ecf8e]/20"
                        variant="outline"
                        title="Salvar meta"
                      >
                        {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEditProfile(p)}
                          className="h-8 w-8 bg-secondary border-border hover:text-foreground"
                          title="Gerenciar Vendedor"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Product Goals (read-only) ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-md bg-purple-500/10 flex items-center justify-center">
                  <Package className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Metas de Produto</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Configuradas individualmente por produto</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => nav({ to: "/products" })}
                className="h-7 px-3 text-[11px] gap-1.5 border-border text-muted-foreground hover:text-foreground bg-secondary"
              >
                <ArrowUpRight className="h-3 w-3" /> Gerenciar Produtos
              </Button>
            </div>

            <div className="divide-y divide-border">
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-10">Nenhum produto cadastrado.</p>
              )}
              {products.map(p => {
                const hasGoal = !!p.metadata?.goal;
                const isActive = !!p.metadata?.goal_active;
                const color = p.metadata?.color || "#3ecf8e";
                const goal = Number(p.metadata?.goal || 0);

                return (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-secondary/20 transition-colors group">
                    {/* Color dot */}
                    <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: color + "20", color }}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate block">{p.name}</span>
                      {p.metadata?.category && (
                        <span className="text-[10px] text-muted-foreground">{p.metadata.category}</span>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-2">
                      {hasGoal ? (
                        <span className="text-[11px] font-mono font-semibold text-foreground">{formatCurrency(goal)}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Sem meta definida</span>
                      )}

                      {isActive ? (
                        <Badge className="text-[9px] bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20 font-bold px-1.5">
                          <Target className="h-2.5 w-2.5 mr-1" /> Ativa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-yellow-500/80 border-yellow-500/20 font-semibold px-1.5">
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Inativa
                        </Badge>
                      )}
                    </div>

                    {/* Edit shortcut */}
                    <button
                      onClick={() => nav({ to: "/products" })}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                      title="Editar em Produtos"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 bg-secondary/20 border-t border-border flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500/70 shrink-0" />
              <p className="text-[10px] text-muted-foreground">
                Para ativar ou editar a meta de um produto, acesse <strong className="text-foreground">Produtos → Editar</strong>.
              </p>
            </div>
          </div>

        </div>
      )}
      {/* ── Seller Management Modal ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-[#3ecf8e]" />
              Gerenciar Vendedor
            </DialogTitle>
            <DialogDescription>
              Altere informações cadastrais ou resete a senha do usuário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5 text-center flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-secondary border border-border relative overflow-hidden mb-2 group">
                {editForm.avatar_url ? (
                  <img src={editForm.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground uppercase">
                    {editForm.full_name?.[0] || "?"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground font-medium">Nome Completo</Label>
              <Input
                value={editForm.full_name}
                onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                className="h-9 bg-background border-border text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground font-medium">URL do Avatar</Label>
              <Input
                value={editForm.avatar_url}
                onChange={e => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                placeholder="https://exemplo.com/foto.jpg"
                className="h-9 bg-background border-border text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground font-medium">E-mail (Leitura)</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-md border border-border text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {editingProfile?.email || "Sem e-mail"}
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 border-destructive/20 text-destructive hover:bg-destructive/5 gap-2 text-xs"
                onClick={resetPassword}
                disabled={busy === "reset-pw"}
              >
                {busy === "reset-pw" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                Resetar Senha (Enviar E-mail)
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              onClick={updateProfile}
              disabled={busy === "profile-update"}
              className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2"
            >
              {busy === "profile-update" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
