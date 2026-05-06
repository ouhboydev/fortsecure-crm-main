import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Zap, ArrowRight, Tv, BarChart3, Target,
  Kanban, Trophy, Brain, Monitor, ShieldCheck,
  ChevronRight, Sparkles, Activity, Database, Key, Server
} from "lucide-react";
import { motion } from "framer-motion";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BackgroundEffects } from "@/components/layout/BackgroundEffects";
import logo from "../public/logo.png";

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
    { icon: Kanban, title: "Pipeline Management", desc: "Gestão visual de oportunidades com fluxos customizáveis.", color: "emerald" },
    { icon: BarChart3, title: "Analytics Real-time", desc: "Dashboards de performance atualizados a cada transação.", color: "blue" },
    { icon: Key, title: "Segurança de Elite", desc: "Controle de acesso granular e auditoria de atividades.", color: "indigo" },
    { icon: Database, title: "Infraestrutura Robusta", desc: "Sincronização imediata com o banco de dados Supabase.", color: "emerald" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      <BackgroundEffects />

      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#3ecf8e] rounded-lg flex items-center justify-center shadow-sm">
              <img src={logo} alt="FortSecure" className="h-5 w-5 object-contain" />
            </div>
            <span className="font-semibold text-lg tracking-tight">FortSecure</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Produto</Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Desenvolvedores</Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Preços</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-sm font-medium h-9 px-4 hover:bg-accent">
                Entrar
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-sm h-9 px-4 rounded-md shadow-sm">
                Iniciar Agora
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center py-10 md:py-20 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="border-[#3ecf8e]/30 bg-[#3ecf8e]/5 text-[#3ecf8e] text-xs font-medium px-4 py-1 rounded-full">
              CRM de Próxima Geração para Vendas
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]"
          >
            A infraestrutura de <br />
            <span className="text-[#3ecf8e]">vendas para times</span> <br />
            de alta performance.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl font-medium"
          >
            FortSecure une a simplicidade das ferramentas modernas de dev com a potência necessária para gerenciar pipelines complexos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            <Link to="/auth">
              <Button className="h-12 px-8 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-base rounded-md shadow-lg shadow-[#3ecf8e]/10 group">
                Iniciar Operação
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" className="h-12 px-8 border-border bg-background hover:bg-accent text-foreground font-medium text-base rounded-md">
                Documentação
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="mt-32 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="bg-card border border-border rounded-xl p-8 hover:border-[#3ecf8e]/30 transition-all group h-full">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-6 group-hover:bg-[#3ecf8e]/10 group-hover:text-[#3ecf8e] transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Platform Preview */}
        <section className="mt-40">
           <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-2xl p-4 md:p-8 shadow-2xl relative overflow-hidden"
           >
              <div className="flex items-center gap-2 mb-6 px-2">
                 <div className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                 <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20" />
                 <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20" />
                 <div className="ml-4 h-4 w-64 bg-secondary/50 rounded-full" />
              </div>
              <div className="grid md:grid-cols-12 gap-8">
                 <div className="md:col-span-8 bg-background border border-border rounded-lg h-80 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <BarChart3 className="h-12 w-12 text-[#3ecf8e] opacity-20" />
                    <div className="space-y-2">
                       <p className="text-sm font-medium">Dashboard Operacional em Tempo Real</p>
                       <p className="text-xs text-muted-foreground">Monitore cada estágio do funil com atualizações automáticas via Supabase Realtime.</p>
                    </div>
                 </div>
                 <div className="md:col-span-4 space-y-4">
                    <div className="bg-background border border-border rounded-lg h-[152px] p-6 space-y-3">
                       <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Health</p>
                       <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-[#3ecf8e] w-[85%]" />
                       </div>
                       <p className="text-2xl font-bold tracking-tight">85%</p>
                    </div>
                    <div className="bg-background border border-border rounded-lg h-[152px] p-6 space-y-3">
                       <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sellers Active</p>
                       <div className="flex -space-x-2">
                          {[1,2,3,4].map(i => (
                             <div key={i} className="h-8 w-8 rounded-full bg-secondary border-2 border-background" />
                          ))}
                       </div>
                       <p className="text-lg font-semibold tracking-tight">+12 Vendedores</p>
                    </div>
                 </div>
              </div>
           </motion.div>
        </section>

        {/* CTA */}
        <section className="mt-40 text-center space-y-8">
           <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Comece a vender agora.</h2>
           <p className="text-lg text-muted-foreground max-w-xl mx-auto">Tudo que você precisa para escalar sua operação comercial com a melhor tecnologia do mercado.</p>
           <div className="flex items-center justify-center gap-4">
              <Link to="/auth">
                <Button className="h-12 px-8 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-base rounded-md">
                   Criar Minha Conta
                </Button>
              </Link>
           </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-secondary rounded-md flex items-center justify-center">
            <img src={logo} alt="FortSecure" className="h-3 w-3 object-contain opacity-50" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">© 2026 FortSecure. Todos os direitos reservados.</span>
        </div>
        <div className="flex gap-10 text-xs font-medium text-muted-foreground">
          <span className="hover:text-[#3ecf8e] cursor-pointer transition-colors">Segurança</span>
          <span className="hover:text-[#3ecf8e] cursor-pointer transition-colors">Status</span>
          <span className="hover:text-[#3ecf8e] cursor-pointer transition-colors">Termos de Uso</span>
        </div>
      </footer>
    </div>
  );
}

