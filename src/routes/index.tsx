import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Trophy, Tv, Brain, Users, Target, ArrowRight, Zap } from "lucide-react";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    { icon: Activity, title: "Pipeline", desc: "Kanban flat com sincronização em tempo real." },
    { icon: Trophy, title: "Gamificação", desc: "Leaderboards e conquistas automatizadas." },
    { icon: Tv, title: "Modo TV", desc: "Transmissão war-room para salas comerciais." },
    { icon: Brain, title: "IA", desc: "Forecast preditivo e análise de riscos." },
    { icon: Users, title: "Painel", desc: "Scorecards individuais de performance." },
    { icon: Target, title: "Metas", desc: "Controle de objetivos e comissões." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      <header className="max-w-7xl mx-auto px-8 py-10 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-primary flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">FortSecure</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" className="px-6 h-10 rounded-md bg-secondary border-border text-xs font-bold uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors">
            Entrar
          </Button>
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="max-w-4xl">
          <Badge className="bg-secondary border-border text-primary text-[10px] font-bold uppercase tracking-widest mb-10 px-4 py-2 flex items-center gap-2 w-fit">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> Command Center v1.0
          </Badge>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase">
            Acelerando sua <br />
            <span className="text-primary italic">Máquina de Vendas.</span>
          </h1>
          <p className="mt-10 text-xl text-muted-foreground max-w-2xl leading-relaxed font-medium">
            Dashboards, rankings, gamificação e IA integrados em uma plataforma brutalista de alta performance. O cockpit definitivo para operações comerciais modernas.
          </p>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/auth">
              <Button className="h-14 px-10 rounded bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                Acessar plataforma <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/tv">
              <Button variant="outline" className="h-14 px-10 rounded bg-secondary border-border text-foreground font-black uppercase tracking-widest text-sm hover:bg-foreground hover:text-background transition-all">
                <Tv className="h-5 w-5 mr-2" /> Ver Modo TV
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-32 border-t border-border pt-20">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="bg-card/50 rounded-lg border-border hover:border-primary/50 transition-colors overflow-hidden">
                <CardHeader className="p-8 pb-0">
                  <div className="h-12 w-12 rounded bg-secondary border border-border flex items-center justify-center mb-6">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-bold text-lg text-foreground uppercase tracking-tight">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-20 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">© 2026 FortSecure // Sales Operating System</div>
        <div className="flex gap-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span className="cursor-pointer hover:text-primary transition-colors">Docs</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Status</span>
          <span className="cursor-pointer hover:text-primary transition-colors">Legal</span>
        </div>
      </footer>
    </div>
  );
}
