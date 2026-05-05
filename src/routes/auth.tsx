import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Zap, Lock, Globe, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../public/logo.png";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acesso — FortSecure" }] }),
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
      toast.success("Acesso autorizado. Bem-vindo.");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-background font-sans selection:bg-primary selection:text-primary-foreground p-6 overflow-hidden">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 blur-2xl opacity-50" />

        <div className="relative bg-card/60 backdrop-blur-md border border-border rounded-[48px] p-12 md:p-16 shadow-2xl overflow-hidden group">
          {/* Internal Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

          <div className="flex flex-col items-center mb-16">
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
              className="h-20 w-20 rounded-3xl bg-secondary border border-border flex items-center justify-center shadow-2xl mb-10 group-hover:border-primary/50 transition-colors duration-500"
            >
              <Zap className="h-10 w-10 text-primary animate-pulse" />
            </motion.div>
            <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase italic leading-none mb-4">FortSecure</h1>
            <div className="h-0.5 w-12 bg-primary rounded-full mb-6" />
            <p className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">Acesso Restrito</p>
          </div>

          <form onSubmit={submit} className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end px-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Login // E-mail</Label>
              </div>
              <div className="relative">
                <Input
                  required type="email" placeholder="agent@fortsecure.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-16 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:border-primary/50 focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Senha</Label>
              </div>
              <div className="relative">
                <Input
                  required type="password" placeholder="••••••••" minLength={6}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-16 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:border-primary/50 focus:ring-0 outline-none transition-all placeholder:text-muted-foreground/10"
                />
              </div>
            </div>

            <Button
              type="submit" disabled={loading}
              className="w-full h-18 bg-primary text-primary-foreground font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-4 mt-12 shadow-[0_20px_50px_rgba(16,185,129,0.15)] group/btn"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
                  Entrar na Plataforma
                </>
              )}
            </Button>
          </form>

          <div className="mt-16 flex items-center justify-center gap-8 opacity-40">
            <div className="flex items-center gap-2 group/icon">
              <ShieldCheck className="h-4 w-4 text-muted-foreground/30 group-hover/icon:text-primary transition-colors" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/20">AES-256</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-border" />
            <div className="flex items-center gap-2 group/icon">
              <Globe className="h-4 w-4 text-muted-foreground/30 group-hover/icon:text-primary transition-colors" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/20">Safe-Cloud</span>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 text-center"
        >
          <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-[0.5em]">System status: Operational // fortsecure crm</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
