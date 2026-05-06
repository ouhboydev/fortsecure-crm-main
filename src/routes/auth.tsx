import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Zap, Lock, Globe, ArrowLeft, KeyRound, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import logo from "../public/logo.png";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackgroundEffects } from "@/components/layout/BackgroundEffects";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acesso Seguro — FortSecure" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/dashboard" });
  }, [user, authLoading, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Acesso autorizado. Bem-vindo ao cockpit.");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background font-sans selection:bg-primary selection:text-primary-foreground p-6 overflow-hidden">
      <BackgroundEffects />
      
      {/* Botão de Voltar para a Landing */}
      <Link to="/" className="fixed top-10 left-10 z-50">
        <Button variant="ghost" className="rounded-full bg-card/40 backdrop-blur-md border border-border/50 text-xs font-bold uppercase tracking-widest px-6 group">
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Voltar ao Início
        </Button>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[500px]"
      >
        <div className="relative bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[40px] p-12 md:p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden group">
          {/* Luz de Acabamento no Topo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="flex flex-col items-center mb-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="h-24 w-24 bg-white p-5 rounded-[28px] border border-border shadow-2xl shadow-primary/10 mb-8 group-hover:scale-105 transition-transform duration-500"
            >
              <img src={logo} alt="FortSecure Logo" className="h-full w-auto object-contain mx-auto" />
            </motion.div>
            
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none mb-3">
              FortSecure
            </h1>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em] italic">
              Authentication Gateway
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Credential // ID</Label>
              </div>
              <div className="relative group/input">
                <Input
                  required type="email" placeholder="agent@fortsecure.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-secondary/20 border-border/50 rounded-2xl text-sm text-foreground focus:border-primary/50 focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/10 px-6"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Private Key // Senha</Label>
              </div>
              <div className="relative group/input">
                <Input
                  required type="password" placeholder="••••••••" minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-secondary/20 border-border/50 rounded-2xl text-sm text-foreground focus:border-primary/50 focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/10 px-6"
                />
              </div>
            </div>

            <Button
              type="submit" disabled={loading}
              className="w-full h-16 bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-4 mt-10 shadow-2xl shadow-primary/20 group/btn"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
                  Autorizar Acesso
                </>
              )}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-border/20 flex items-center justify-between opacity-30">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              <span className="text-[8px] font-black uppercase tracking-widest">Biometric Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[8px] font-black uppercase tracking-widest">Encrypted Session</span>
            </div>
          </div>
        </div>

        {/* System Details Decoration */}
        <div className="mt-8 flex justify-between items-center px-8 opacity-20">
          <div className="text-[8px] font-black uppercase tracking-[0.5em]">System status: 100%</div>
          <div className="flex gap-4">
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse delay-75" />
            <div className="h-1 w-1 rounded-full bg-primary animate-pulse delay-150" />
          </div>
        </div>
      </motion.div>

      {/* Decorative Corner Details */}
      <div className="fixed bottom-10 right-10 opacity-10 pointer-events-none hidden md:block">
        <div className="text-[10px] font-black uppercase tracking-[0.8em] rotate-90 origin-bottom-right">
          FortSecure // OS 2.0
        </div>
      </div>
    </div>
  );
}
