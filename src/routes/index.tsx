import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Zap, ArrowRight, Tv, BarChart3, Target,
  Kanban, Trophy, Brain, Monitor, ShieldCheck,
  ChevronRight, Sparkles, Activity
} from "lucide-react";
import { motion } from "framer-motion";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BackgroundEffects } from "@/components/layout/BackgroundEffects";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  const features = [
    { icon: Kanban, title: "Pipeline", desc: "Gestão visual de oportunidades em tempo real.", color: "emerald" },
    { icon: Trophy, title: "Gamificação", desc: "Leaderboards e conquistas automatizadas.", color: "amber" },
    { icon: Tv, title: "Modo TV", desc: "Transmissão war-room para salas comerciais.", color: "blue" },
    { icon: Brain, title: "IA Insights", desc: "Forecast preditivo e análise de riscos.", color: "indigo" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      <BackgroundEffects />

      {/* Top Navigation - Dashboard Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tighter uppercase italic">FortSecure</span>
              <p className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em]">Command Center v1.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button className="rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-8 h-10 hover:scale-105 transition-all shadow-xl shadow-primary/20">
                Entrar no Cockpit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 pt-32 pb-20">
        {/* Hero Section - App Cockpit Look */}
        <section className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-10 py-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full">
                <Sparkles className="h-3 w-3 mr-2 animate-pulse" /> Operação de Alta Performance
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-6xl md:text-8xl lg:text-[100px] font-black tracking-tighter leading-[0.9] uppercase italic"
            >
              Acelerando sua <br />
              <span className="text-primary not-italic">Máquina de</span> <br />
              Vendas.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-lg md:text-xl text-muted-foreground/60 max-w-2xl leading-relaxed font-medium uppercase tracking-tight"
            >
              A plataforma definitiva para times que operam em escala.
              <span className="text-foreground block mt-2">Visibilidade total, gamificação bruta e inteligência preditiva.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link to="/auth">
                <Button className="h-16 px-10 rounded-[20px] bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-primary/30 group">
                  Iniciar Operação
                  <ArrowRight className="h-4 w-4 ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/tv">
                <Button variant="outline" className="h-16 px-10 rounded-[20px] bg-card/40 backdrop-blur-md border-border/50 text-foreground font-black uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-all">
                  <Monitor className="h-4 w-4 mr-3" /> Ver Modo War-Room
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right Side - Mock Dashboard Preview */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="relative z-10 bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[40px] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border-dashed"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500/50" />
                  <div className="h-2 w-2 rounded-full bg-amber-500/50" />
                  <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Live Dashboard Preview</div>
              </div>

              <div className="space-y-6">
                {/* Mock KPI Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 p-4 rounded-3xl border border-border/50 space-y-2">
                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Receita (Mês)</p>
                    <p className="text-xl font-black italic tracking-tight">R$ 1.2M</p>
                    <div className="h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[75%]" />
                    </div>
                  </div>
                  <div className="bg-secondary/30 p-4 rounded-3xl border border-border/50 space-y-2">
                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Atingimento</p>
                    <p className="text-xl font-black italic tracking-tight text-primary">92%</p>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i < 4 ? 'bg-primary' : 'bg-primary/20'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mock Chart Area */}
                <div className="bg-secondary/20 h-40 rounded-3xl border border-border/50 flex items-end p-4 gap-2">
                  {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 1 + (i * 0.1), duration: 0.5 }}
                      className="flex-1 bg-gradient-to-t from-primary/40 to-primary/10 rounded-t-lg border-t border-primary/30"
                    />
                  ))}
                </div>

                {/* Mock Activity */}
                <div className="space-y-3">
                  <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Atividade Recente</p>
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 bg-secondary/10 p-3 rounded-2xl border border-border/20">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 w-24 bg-foreground/10 rounded-full mb-1" />
                        <div className="h-1 w-16 bg-muted-foreground/10 rounded-full" />
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/20" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Decorative background glow */}
            <div className="absolute -inset-10 bg-primary/10 blur-[100px] -z-10 rounded-full opacity-50" />
          </div>
        </section>

        {/* Feature Grid - Executive Style */}
        <section className="mt-40 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[32px] p-8 hover:border-primary/50 transition-all group h-full">
                  <div className={`h-14 w-14 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform group-hover:bg-primary/10 group-hover:border-primary/30`}>
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground/60 leading-relaxed font-medium uppercase tracking-tight">{f.desc}</p>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* Call to Action Banner */}
        <section className="mt-40">
          <motion.div
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.95 }}
            className="bg-primary p-12 md:p-20 rounded-[40px] text-primary-foreground relative overflow-hidden group shadow-2xl shadow-primary/20"
          >
            <div className="relative z-10 max-w-3xl">
              <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-8">
                Pronto para o Próximo Nível?
              </h2>
              <p className="text-primary-foreground/70 text-lg md:text-xl font-bold uppercase tracking-tight mb-12">
                Junte-se a dezenas de operações que já aceleraram seus resultados com o cockpit definitivo.
              </p>
              <Link to="/auth">
                <Button className="h-16 px-12 rounded-[20px] bg-foreground text-background font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20">
                  Acessar Plataforma <Zap className="h-4 w-4 ml-3 fill-current" />
                </Button>
              </Link>
            </div>

            {/* Large background icon */}
            <Zap className="absolute -right-20 -bottom-20 h-[500px] w-[500px] opacity-10 -rotate-12 group-hover:scale-110 transition-transform duration-1000" />
          </motion.div>
        </section>
      </main>

      <footer className="max-w-[1600px] mx-auto px-6 py-20 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4 opacity-40">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">© 2026 FortSecure // OS Comercial</span>
        </div>
        <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          <span className="cursor-pointer hover:text-primary transition-colors">Infraestrutura</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Segurança</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Termos</span>
        </div>
      </footer>
    </div>
  );
}
