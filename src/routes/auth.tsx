import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import logo from "../public/logo.png";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackgroundEffects } from "@/components/layout/BackgroundEffects";

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
      toast.success("Bem-vindo de volta.");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-background p-6">
      <BackgroundEffects />
      
      <div className="w-full max-w-[400px] space-y-8 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <div className="h-12 w-12 bg-[#3ecf8e] rounded-xl flex items-center justify-center shadow-lg">
              <img src={logo} alt="FortSecure" className="h-7 w-7 object-contain" />
            </div>
          </Link>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Bem-vindo ao FortSecure</h1>
            <p className="text-sm text-muted-foreground">Acesse sua conta para gerenciar seu pipeline.</p>
          </div>
        </div>

        <div className="bg-card border border-border p-8 rounded-xl shadow-2xl">
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                required type="email" placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-10 bg-background border-border text-sm focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Senha</Label>
                <Link to="/" className="text-[11px] text-muted-foreground hover:text-[#3ecf8e] transition-colors">Esqueceu a senha?</Link>
              </div>
              <Input
                required type="password" placeholder="••••••••" minLength={6}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-10 bg-background border-border text-sm focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/10 transition-all"
              />
            </div>

            <Button
              type="submit" disabled={loading}
              className="w-full h-10 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-sm rounded-md transition-all shadow-md"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Não tem uma conta? <Link to="/" className="text-[#3ecf8e] hover:underline font-medium">Contate o administrador</Link>
        </p>
      </div>

      <div className="fixed bottom-6 text-[10px] text-muted-foreground font-medium flex gap-4 uppercase tracking-widest">
         <span>Privacidade</span>
         <span>Termos</span>
         <span>Suporte</span>
      </div>
    </div>
  );
}

