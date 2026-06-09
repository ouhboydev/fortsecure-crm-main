import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  X, Rocket, ExternalLink, PartyPopper,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  key: string;
  label: string;
  description: string;
  link: string;
  linkLabel: string;
}

const STEPS: Step[] = [
  {
    key: "profile",
    label: "Complete seu perfil",
    description: "Adicione sua foto e informações de contato",
    link: "/profile",
    linkLabel: "Ir para Perfil",
  },
  {
    key: "customer",
    label: "Cadastre um cliente",
    description: "Adicione seu primeiro cliente na base",
    link: "/customers",
    linkLabel: "Ver Clientes",
  },
  {
    key: "pipeline",
    label: "Crie um deal no pipeline",
    description: "Adicione uma oportunidade de negócio",
    link: "/pipeline",
    linkLabel: "Abrir Pipeline",
  },
  {
    key: "activity",
    label: "Agende uma atividade",
    description: "Crie uma ligação, reunião ou tarefa",
    link: "/activities",
    linkLabel: "Ver Agenda",
  },
  {
    key: "knowledge",
    label: "Explore a base de conhecimento",
    description: "Conheça os fluxos e playbooks da equipe",
    link: "/knowledge",
    linkLabel: "Ver Base",
  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `onboarding_${userId}`;
}

function loadCompleted(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCompleted(userId: string, steps: string[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(steps));
}

function dismissedKey(userId: string) {
  return `onboarding_dismissed_${userId}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Auto-detect steps from DB
  useEffect(() => {
    if (!user) return;

    const stored = loadCompleted(user.id);
    setCompleted(stored);

    const wasDismissed = localStorage.getItem(dismissedKey(user.id)) === "true";
    setDismissed(wasDismissed);

    // Only show widget if not all steps completed and not dismissed
    if (!wasDismissed && stored.length < STEPS.length) {
      setVisible(true);
    }

    // Auto-detect from DB
    autoDetect(user.id, stored);
  }, [user?.id]);

  async function autoDetect(userId: string, current: string[]) {
    const newCompleted = [...current];

    try {
      // Check if user has any customers
      const { count: custCount } = await supabase
        .from("customers" as any)
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId) as any;
      if ((custCount ?? 0) > 0 && !newCompleted.includes("customer")) {
        newCompleted.push("customer");
      }

      // Check if user has any opportunities (pipeline deals)
      const { count: oppCount } = await supabase
        .from("opportunities" as any)
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId) as any;
      if ((oppCount ?? 0) > 0 && !newCompleted.includes("pipeline")) {
        newCompleted.push("pipeline");
      }

      // Check if user has any activities
      const { count: actCount } = await supabase
        .from("activities" as any)
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId) as any;
      if ((actCount ?? 0) > 0 && !newCompleted.includes("activity")) {
        newCompleted.push("activity");
      }

      // Check if profile has avatar
      const { data: profile } = await supabase
        .from("profiles" as any)
        .select("avatar_url")
        .eq("id", userId)
        .single() as any;
      if (profile?.avatar_url && !newCompleted.includes("profile")) {
        newCompleted.push("profile");
      }
    } catch {
      // Silently fail — auto-detect is best-effort
    }

    if (newCompleted.length !== current.length) {
      setCompleted(newCompleted);
      saveCompleted(userId, newCompleted);

      if (newCompleted.length === STEPS.length) {
        handleAllDone(userId);
      }
    }
  }

  function toggleStep(key: string) {
    if (!user) return;
    const isNowCompleted = !completed.includes(key);
    const next = isNowCompleted
      ? [...completed, key]
      : completed.filter(k => k !== key);
    setCompleted(next);
    saveCompleted(user.id, next);

    if (next.length === STEPS.length) {
      handleAllDone(user.id);
    }
  }

  function handleAllDone(userId: string) {
    setCelebrating(true);
    setTimeout(() => {
      setCelebrating(false);
      setDismissed(true);
      setVisible(false);
      localStorage.setItem(dismissedKey(userId), "true");
    }, 3000);
  }

  function dismiss() {
    if (!user) return;
    setDismissed(true);
    setVisible(false);
    localStorage.setItem(dismissedKey(user.id), "true");
  }

  if (!visible || !user) return null;

  const progress = completed.length;
  const total = STEPS.length;
  const pct = Math.round((progress / total) * 100);

  if (celebrating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 bg-card border border-[#3ecf8e]/40 rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-3 animate-in slide-in-from-bottom-4">
        <PartyPopper className="h-10 w-10 text-[#3ecf8e]" />
        <p className="text-sm font-semibold text-foreground text-center">Onboarding completo!</p>
        <p className="text-[11px] text-muted-foreground text-center">
          Você está pronto para arrasar nas vendas! 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="h-7 w-7 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center shrink-0">
            <Rocket className="h-3.5 w-3.5 text-[#3ecf8e]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Primeiros passos</p>
            <p className="text-[10px] text-muted-foreground">{progress}/{total} concluídos</p>
          </div>
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <button
          onClick={dismiss}
          className="h-6 w-6 ml-2 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 shrink-0"
          title="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary/50">
        <div
          className="h-full bg-[#3ecf8e] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      {expanded && (
        <div className="divide-y divide-border/50">
          {STEPS.map(step => {
            const done = completed.includes(step.key);
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors",
                  done ? "opacity-60" : "hover:bg-secondary/10"
                )}
              >
                <button
                  onClick={() => toggleStep(step.key)}
                  className="mt-0.5 shrink-0"
                  title={done ? "Marcar como pendente" : "Marcar como feito"}
                >
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-[#3ecf8e]" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-medium", done ? "line-through text-muted-foreground" : "text-foreground")}>
                    {step.label}
                  </p>
                  {!done && (
                    <>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{step.description}</p>
                      <Link
                        to={step.link as any}
                        className="inline-flex items-center gap-1 text-[10px] text-[#3ecf8e] hover:underline mt-1"
                      >
                        {step.linkLabel}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
