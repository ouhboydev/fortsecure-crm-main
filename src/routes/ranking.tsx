import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import {
  Trophy, Star, Crown,
  TrendingUp, User, Award,
  ArrowUpRight, Sparkles, Target
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Shadcn UI Imports
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/ranking")({
  head: () => ({ meta: [{ title: "Ranking — FortSecure" }] }),
  component: () => <AppShell><Ranking /></AppShell>,
});

function Ranking() {
  const nav = useNavigate();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetchRanking().then(res => {
      setRows(res);
      setLoading(false);
    });
    
    load();
    const channel = supabase.channel("ranking-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  const podiumData = [
    { ...top3[1], pos: 2, height: "h-32 md:h-48", color: "#94a3b8", label: "2º Lugar" },
    { ...top3[0], pos: 1, height: "h-48 md:h-64", color: "#3ecf8e", label: "1º Lugar" },
    { ...top3[2], pos: 3, height: "h-24 md:h-32", color: "#ea580c", label: "3º Lugar" }
  ].filter(p => p.user_id);

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Trophy className="h-10 w-10 text-[#3ecf8e] animate-pulse" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Sincronizando Ranking...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-12 p-6 lg:p-8 max-w-[1400px] mx-auto pb-32">
      <PageHeader 
         title="Ranking de Performance" 
         subtitle="Os vendedores que mais geraram valor no período atual."
      />

      {/* Podium Section */}
      <div className="flex items-end justify-center gap-3 md:gap-6 pt-10">
        {podiumData.map((r) => (
          <motion.div
            key={r.user_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: r.pos * 0.1 }}
            className="flex-1 max-w-[300px] flex flex-col items-center group"
          >
            <div className="mb-4 text-center space-y-3">
              <div className="relative inline-block">
                <Avatar className={cn(
                  "h-16 w-16 md:h-24 md:w-24 border-2 transition-all group-hover:scale-105",
                  r.pos === 1 ? "border-[#3ecf8e] shadow-lg shadow-[#3ecf8e]/10" : "border-border"
                )}>
                  <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-lg font-bold">
                    {r.full_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {r.pos === 1 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Crown className="h-6 w-6 text-[#f59e0b] fill-[#f59e0b]/10" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-[#3ecf8e] transition-colors">{r.full_name}</p>
                <p className="text-[11px] font-bold text-[#3ecf8e] mt-1">{formatCurrency(r.closed_value)}</p>
              </div>
            </div>

            <div className={cn(
              "w-full rounded-t-lg border-x border-t flex flex-col items-center justify-center pt-6 transition-all duration-700",
              r.height,
              r.pos === 1 ? "bg-[#3ecf8e]/5 border-[#3ecf8e]/20" : "bg-card border-border"
            )}>
              <span className={cn(
                "text-4xl md:text-6xl font-bold opacity-10",
                r.pos === 1 ? "text-[#3ecf8e]" : "text-foreground"
              )}>
                {r.pos}
              </span>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">{r.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* List View */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center gap-3 px-4 py-2 opacity-50">
           <TrendingUp className="h-4 w-4" />
           <span className="text-[11px] font-bold uppercase tracking-widest">Vendedores em Destaque</span>
        </div>

        <div className="grid gap-2">
          {rest.map((r, i) => (
            <motion.div
              key={r.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div 
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-[#3ecf8e]/30 transition-all cursor-pointer group"
                onClick={() => nav({ to: "/sellers" })}
              >
                <div className="w-8 text-sm font-bold text-muted-foreground group-hover:text-[#3ecf8e] transition-colors">
                  {String(i + 4).padStart(2, '0')}
                </div>

                <Avatar className="h-10 w-10 border border-border group-hover:border-[#3ecf8e]/30 transition-all">
                  <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-xs font-bold">{r.full_name?.[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-[#3ecf8e] transition-colors">{r.full_name}</p>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{r.attainment.toFixed(0)}% da Meta</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{r.closed_count} Negócios</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-foreground font-mono">{formatCurrency(r.closed_value)}</p>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-[#3ecf8e] mt-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                    {r.points} XP
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

