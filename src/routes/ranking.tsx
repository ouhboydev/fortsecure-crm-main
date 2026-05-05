import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import {
  Trophy, Star, Crown,
  TrendingUp, User, Award,
  ArrowUpRight, Sparkles, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    { ...top3[1], pos: 2, height: "h-48 md:h-64", color: "#94a3b8", label: "Prata" },
    { ...top3[0], pos: 1, height: "h-64 md:h-80", color: "#fbbf24", label: "Ouro" },
    { ...top3[2], pos: 3, height: "h-32 md:h-48", color: "#ea580c", label: "Bronze" }
  ].filter(p => p.user_id);

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
        <Trophy className="h-20 w-20 text-primary animate-bounce relative" />
      </div>
    </div>
  );

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto min-h-screen space-y-16 pb-32">
      <div className="text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Badge variant="outline" className="px-5 py-2 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.4em] border-primary/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            Campeonato Elite 2026
          </Badge>
        </motion.div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground">
          OS <span className="text-primary">TOP</span> TRÊS<span className="text-muted-foreground/20">.</span>
        </h1>
      </div>

      {/* 3D Glass Podium Section */}
      <div className="relative pt-24 md:pt-32 pb-12">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-12 bg-primary/10 blur-[100px] rounded-full" />

        <div className="flex items-end justify-center gap-4 md:gap-10 max-w-5xl mx-auto px-4">
          {podiumData.map((r, idx) => (
            <motion.div
              key={r.user_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: r.pos * 0.2, type: "spring", stiffness: 50 }}
              className="flex-1 flex flex-col items-center group"
            >
              <div className="mb-8 text-center">
                <div className="relative inline-block mb-6">
                  <Avatar className={cn(
                    "h-20 w-20 md:h-32 md:w-32 rounded-3xl border-4 flex items-center justify-center overflow-hidden transition-all duration-700 group-hover:scale-110 group-hover:rotate-3",
                    r.pos === 1 ? "border-warning/50 shadow-[0_20px_50px_rgba(251,191,36,0.3)]" : "border-border"
                  )}>
                    <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-secondary text-2xl font-bold text-muted-foreground">
                      {r.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {r.pos === 1 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <motion.div animate={{ rotate: [0, 15, -15, 0], y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
                        <Crown className="h-10 w-10 text-warning fill-warning/20 shadow-warning drop-shadow-2xl" />
                      </motion.div>
                    </div>
                  )}
                </div>
                <h3 className="text-lg md:text-2xl font-black text-foreground truncate max-w-[140px] md:max-w-none tracking-tight group-hover:text-primary transition-colors">{r.full_name}</h3>
                <div className="flex items-center justify-center gap-3 mt-2">
                   <Badge variant="outline" className="text-[10px] font-bold text-primary font-mono bg-emerald-500/5 px-2 py-0.5 rounded-md border-emerald-500/10">{formatCurrency(r.closed_value)}</Badge>
                   <Badge variant="outline" className="text-[10px] font-bold text-warning font-mono bg-warning/5 px-2 py-0.5 rounded-md border-warning/10">{r.points} XP</Badge>
                </div>
              </div>

              <div className={cn(
                "w-full rounded-t-[40px] md:rounded-t-[64px] relative transition-all duration-700 flex flex-col items-center pt-10 md:pt-16 shadow-2xl backdrop-blur-md",
                r.height,
                r.pos === 1
                  ? "bg-gradient-to-b from-warning/20 to-transparent border-t-2 border-x-2 border-warning/30"
                  : "bg-gradient-to-b from-secondary/40 to-transparent border-t border-x border-border/30"
              )}>
                <span className={cn(
                  "text-6xl md:text-9xl font-black opacity-10 select-none",
                  r.pos === 1 ? "text-warning" : "text-foreground"
                )}>
                  {r.pos}
                </span>

                {r.pos === 1 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="absolute -bottom-10 md:-bottom-14"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-warning/30 blur-3xl rounded-full animate-pulse" />
                      <div className="bg-gradient-to-br from-warning to-yellow-600 p-6 md:p-8 rounded-[32px] shadow-[0_20px_50px_rgba(251,191,36,0.4)] relative border-2 border-white/20">
                        <Trophy className="h-10 w-10 md:h-14 md:w-14 text-white" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rest of the Ranking - Minimalist Row Cards */}
      <div className="max-w-5xl mx-auto space-y-6 pt-20">
        <div className="flex items-center gap-4 px-10 py-5 bg-card/50 rounded-3xl border border-border shadow-xl">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground">Próximos Agentes no Radar Operacional</span>
        </div>

        <div className="grid gap-3">
          {rest.map((r, i) => (
            <motion.div
              key={r.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                onClick={() => {
                  nav({ to: "/sellers" });
                  toast.info(`Analisando perfil de ${r.full_name}`);
                }}
                className="group p-0 bg-card/30 backdrop-blur-sm border-border hover:border-primary/50 transition-all cursor-pointer shadow-sm overflow-hidden rounded-[32px]"
              >
                <CardContent className="p-6 md:p-8 flex items-center gap-6">
                  <div className="w-16 text-3xl font-black font-mono text-muted-foreground/20 group-hover:text-primary transition-colors">
                    {String(i + 4).padStart(2, '0')}
                  </div>

                  <div className="flex-1 flex items-center gap-6">
                    <Avatar className="h-16 w-16 rounded-2xl border border-border flex items-center justify-center transition-all group-hover:border-primary/50 shadow-sm overflow-hidden">
                      <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-xl font-bold text-muted-foreground">
                        {r.full_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold text-xl text-foreground group-hover:text-primary transition-colors tracking-tight">{r.full_name}</div>
                      <div className="flex items-center gap-5 mt-2">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          <Target className="h-3.5 w-3.5 text-primary/50" /> {r.attainment.toFixed(0)}% Meta
                        </div>
                        <div className="h-1.5 w-1.5 rounded-full bg-border" />
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          <Award className="h-3.5 w-3.5 text-warning/50" /> {r.points} XP
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-foreground tracking-tighter group-hover:text-primary transition-colors">
                      {formatCurrency(r.closed_value)}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-primary text-[10px] font-bold mt-2 uppercase tracking-widest">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {r.closed_count} NEGÓCIOS
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
