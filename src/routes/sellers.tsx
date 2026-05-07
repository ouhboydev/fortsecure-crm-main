import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Users, Shield, Loader2, Search, TrendingUp, 
  Target, BarChart3, MoreVertical, ExternalLink,
  ShieldCheck, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

// UI Components
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sellers")({
  head: () => ({ meta: [{ title: "Vendedores — FortSecure" }] }),
  component: () => <AppShell><Sellers /></AppShell>,
});

function Sellers() {
  const { isManager, isAdmin } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetchRanking();
      setRows(r);
      const { data } = await supabase.from("user_roles").select("user_id, role");
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((x: any) => { (map[x.user_id] = map[x.user_id] || []).push(x.role); });
      setRoles(map);
    } catch (e) {
      toast.error("Erro ao carregar time");
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => { load(); }, []);

  if (!isManager) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4 bg-background">
      <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
        <Shield className="h-6 w-6 text-destructive/50" />
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Acesso restrito a gestores</p>
    </div>
  );

  async function setRole(userId: string, role: "admin" | "gestor" | "vendedor") {
    if (!isAdmin) return toast.error("Permissão de administrador necessária.");
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });
      
      if (error) throw error;
      toast.success("Papel atualizado");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filtered = rows.filter(r => 
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const teamRevenue = rows.reduce((s, r) => s + r.closed_value, 0);
  const teamPipeline = rows.reduce((s, r) => s + r.pipeline_value, 0);
  const avgAttainment = rows.length > 0 ? rows.reduce((s, r) => s + r.attainment, 0) / rows.length : 0;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto pb-20">
      <PageHeader
        title="Gestão da Equipe"
        subtitle="Monitoramento de performance, cargos e produtividade do time comercial."
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total do Time" value={String(rows.length)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Faturamento Mês" value={formatCurrency(teamRevenue)} icon={<TrendingUp className="h-4 w-4" />} accent />
        <StatCard label="Pipeline Equipe" value={formatCurrency(teamPipeline)} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Média Atingimento" value={`${avgAttainment.toFixed(1)}%`} icon={<Target className="h-4 w-4" />} warn />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar por nome ou ID..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 bg-card border-border text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} vendedores encontrados</span>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-8 text-[11px] gap-2 border-border bg-card">
            <Loader2 className={cn("h-3 w-3", loading && "animate-spin")} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading && rows.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#3ecf8e]" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Carregando dados da equipe...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Search className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Nenhum vendedor corresponde à pesquisa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[300px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6">Vendedor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Atingimento</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Faturamento</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Pipeline</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Score</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-6 text-center">Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const role = (roles[r.user_id] || ["vendedor"])[0];
                  const initials = r.full_name.split(" ").map(n => n[0]).slice(0, 2).join("");
                  const isLow = r.attainment < 50;
                  const isHigh = r.attainment >= 100;

                  return (
                    <TableRow key={r.user_id} className="border-border hover:bg-muted/20 transition-colors group">
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border group-hover:border-[#3ecf8e]/40 transition-colors">
                            <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-secondary text-[10px] font-bold text-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-foreground truncate group-hover:text-[#3ecf8e] transition-colors">{r.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                              #{r.user_id.slice(0, 8)}
                              <span className="h-1 w-1 rounded-full bg-border" />
                              ID interno
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-2">
                            {isHigh && <Badge className="h-4 px-1 bg-[#3ecf8e]/10 text-[#3ecf8e] text-[9px] border-none">Top</Badge>}
                            <span className={cn("font-black text-sm font-mono", isHigh ? "text-[#3ecf8e]" : isLow ? "text-yellow-500" : "text-foreground")}>
                              {r.attainment.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-24 h-1 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-1000", isHigh ? "bg-[#3ecf8e]" : isLow ? "bg-yellow-500" : "bg-[#3ecf8e]/60")} 
                              style={{ width: `${Math.min(100, r.attainment)}%` }} 
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <p className="font-bold text-sm font-mono text-[#3ecf8e]">{formatCurrency(r.closed_value)}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{r.closed_count} negócios ganhos</p>
                      </TableCell>

                      <TableCell className="text-right">
                        <p className="font-bold text-sm font-mono text-foreground">{formatCurrency(r.pipeline_value)}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium italic">em negociação</p>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-sm font-mono text-foreground">{r.points.toLocaleString()}</span>
                          <span className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase">Pontos XP</span>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 text-center">
                        <div className="flex items-center justify-center">
                          {isAdmin ? (
                            <Select value={role} onValueChange={(v) => setRole(r.user_id, v as any)}>
                              <SelectTrigger className="w-[120px] bg-secondary/50 border-border text-[10px] font-bold h-7 rounded-md focus:ring-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                <SelectItem value="vendedor" className="text-[10px] font-medium">Vendedor</SelectItem>
                                <SelectItem value="gestor" className="text-[10px] font-medium">Gestor</SelectItem>
                                <SelectItem value="admin" className="text-[10px] font-medium">Administrador</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 border border-border">
                              {role === 'admin' ? <ShieldAlert className="h-3 w-3 text-red-500" /> : role === 'gestor' ? <ShieldCheck className="h-3 w-3 text-blue-500" /> : <Shield className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-[9px] font-bold text-foreground uppercase tracking-widest">
                                {role}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent, warn }: { label: string; value: string; icon: React.ReactNode; accent?: boolean; warn?: boolean }) {
  return (
    <div className={cn(
      "bg-card border rounded-xl p-5 flex items-center gap-4 shadow-sm",
      accent ? "border-[#3ecf8e]/20" : warn ? "border-yellow-500/20" : "border-border"
    )}>
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner",
        accent ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : warn ? "bg-yellow-500/10 text-yellow-500" : "bg-secondary text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black font-mono text-foreground leading-none truncate">{value}</p>
      </div>
    </div>
  );
}


