import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
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
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Shield className="h-10 w-10 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Acesso restrito a gestores e admins</span>
    </div>
  );

  async function setRole(userId: string, role: "admin" | "gestor" | "vendedor") {
    if (!isAdmin) return toast.error("Permissão de administrador necessária.");
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message); else { toast.success("Papel atualizado"); load(); }
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-[1600px] mx-auto pb-20">
      <PageHeader
        title="Gestão de Vendedores"
        subtitle="Monitoramento de performance e controle de acessos da equipe."
        actions={
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-md">
            <div className="h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">{rows.length} vendedores</span>
          </div>
        }
      />

      <Section title="Time de Vendas">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#3ecf8e]" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Sincronizando...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Nenhum vendedor encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendedor</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Faturamento</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Pipeline</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Eficiência</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Score</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const role = (roles[r.user_id] || ["vendedor"])[0];
                  return (
                    <TableRow key={r.user_id} className="border-border hover:bg-accent transition-all group">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border group-hover:border-[#3ecf8e]/30 transition-all">
                            <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-secondary text-xs font-bold text-foreground">
                              {r.full_name?.[0] || "A"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-sm text-foreground group-hover:text-[#3ecf8e] transition-colors">{r.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{r.user_id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-[#3ecf8e]">{formatCurrency(r.closed_value)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(r.pipeline_value)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-bold text-sm font-mono text-foreground">{r.attainment.toFixed(0)}%</span>
                          <div className="w-20 h-1 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-[#3ecf8e]" style={{ width: `${Math.min(100, r.attainment)}%` }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">{r.points} XP</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select value={role} onValueChange={(v) => setRole(r.user_id, v as any)}>
                            <SelectTrigger className="w-[140px] bg-background border-border text-xs font-medium h-8 rounded-md">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="vendedor" className="text-xs">Vendedor</SelectItem>
                              <SelectItem value="gestor" className="text-xs">Gestor</SelectItem>
                              <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-medium bg-secondary border-border text-muted-foreground capitalize">
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
        )}
      </Section>
    </div>
  );
}

