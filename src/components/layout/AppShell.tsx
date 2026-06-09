import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./Sidebar";
import { Loader2 } from "lucide-react";
import { BackgroundEffects } from "@/components/layout/BackgroundEffects";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
          <p className="text-xs text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <BackgroundEffects />
      <Sidebar />
      <main className="flex-1 relative z-10 overflow-y-auto flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="px-6 py-3 border-t border-border/50 flex items-center justify-center">
          <p className="text-[11px] text-muted-foreground/50 tracking-wide">
            Criado e desenvolvido por{" "}
            <span className="text-[#3ecf8e]/70 font-medium">André Firmino</span>
            {" "}&{" "}
            <span className="text-[#3ecf8e]/70 font-medium">Fortsecure</span>
          </p>
        </footer>
      </main>
      <OnboardingChecklist />
    </div>
  );
}
