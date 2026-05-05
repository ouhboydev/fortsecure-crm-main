import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, Shield, User, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/sellers")({
  head: () => ({ meta: [{ title: "Vendedores — FortSecure" }] }),
  component: () => <AppShell><Sellers /></AppShell>,
});

function Sellers() {
  const { isManager, isAdmin } = useAuth();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

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
    <div className="h-screen flex flex-col items-center justify-center space-y-6 bg-background text-foreground">
      <Shield className="h-12 w-12 text-muted-foreground/30" />
      <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground/20">Acesso Restrito ao Comando Superior</span>
    </div>
  );

  async function setRole(userId: string, role: "admin" | "gestor" | "vendedor") {
    if (!isAdmin) return toast.error("Permissão de administrador necessária.");
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message); else { toast.success("Papel atualizado"); load(); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 space-y-12 max-w-[1500px] mx-auto pb-32">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-border">
        <PageHeader
          title="Gestão de Vendedores"
          subtitle="Monitoramento de performance do capital humano e controle de acessos"
        />
        <div className="flex items-center gap-4">
          <div className="px-6 py-2.5 bg-secondary/50 border border-border rounded-full flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">{rows.length} Agentes em Operação</span>
          </div>
        </div>
      </div>

      <Card className="relative z-10 bg-card/40 backdrop-blur-md border-border rounded-[40px] overflow-hidden shadow-2xl border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/10">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Identificação do Agente</TableHead>
                <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 text-right">Faturamento Bruto</TableHead>
                <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 text-right">Pipeline Ativo</TableHead>
                <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 text-right">Eficiência</TableHead>
                <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 text-right">Score</TableHead>
                <TableHead className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Nível de Acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const role = (roles[r.user_id] || ["vendedor"])[0];
                return (
                  <TableRow key={r.user_id} className="border-border hover:bg-secondary/40 transition-all group">
                    <TableCell className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <Avatar className="h-14 w-14 rounded-2xl border border-border group-hover:border-primary/50 transition-all shadow-2xl">
                          <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground/20 uppercase italic">
                            {r.full_name?.[0] || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight italic text-lg">{r.full_name}</div>
                          <div className="text-[9px] text-muted-foreground/30 font-bold uppercase tracking-widest">ID: {r.user_id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right font-mono text-primary font-black text-lg tabular-nums italic">{formatCurrency(r.closed_value)}</TableCell>
                    <TableCell className="px-10 py-8 text-right font-mono text-muted-foreground/50 text-base tabular-nums">{formatCurrency(r.pipeline_value)}</TableCell>
                    <TableCell className="px-10 py-8 text-right">
                      <div className="flex flex-col items-end gap-3">
                        <span className="font-black text-foreground text-base font-mono">{r.attainment.toFixed(0)}%</span>
                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-primary shadow-[0_0_10px_#10b981]" style={{ width: `${Math.min(100, r.attainment)}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right font-mono text-foreground/80 font-black text-2xl group-hover:text-primary transition-colors">{r.points}</TableCell>
                    <TableCell className="px-10 py-8">
                      {isAdmin ? (
                        <Select value={role} onValueChange={(v) => setRole(r.user_id, v as any)}>
                          <SelectTrigger className="w-[160px] bg-background border-border rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-foreground focus:ring-primary h-12 shadow-inner">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border rounded-2xl shadow-3xl">
                            <SelectItem value="vendedor" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 focus:bg-secondary focus:text-foreground">Agente</SelectItem>
                            <SelectItem value="gestor" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 focus:bg-secondary focus:text-foreground">Gestor</SelectItem>
                            <SelectItem value="admin" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 focus:bg-secondary focus:text-foreground">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-secondary border-border text-muted-foreground/30 border">
                          {role}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {loading && (
          <div className="p-32 text-center text-muted-foreground/20 font-black uppercase tracking-[0.5em] animate-pulse">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-8 text-primary/40" />
            Sincronizando Base de Dados...
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="p-32 text-center text-muted-foreground/20 font-black uppercase tracking-[0.5em] italic border-t border-border">
            Nenhum ativo detectado no setor
          </div>
        )}
      </Card>
    </div>
  );
}
