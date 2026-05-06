import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  children: ReactNode;
  className?: string;
  /** Aplica o grid interno com degradê no estilo Supabase */
  featured?: boolean;
  /** Controla quão rápido o grid desaparece (0–1). Default 0.45 */
  gridFade?: number;
}

export function WidgetCard({ children, className, featured = false, gridFade = 0.45 }: WidgetCardProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {featured && (
        <>
          {/* ── Grid lines — muito sutis ── */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* ── Gradient overlay: grid visível no topo, desaparece rapidamente ──
              O conteúdo fica abaixo e a área do gráfico fica completamente limpa. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              background: `linear-gradient(
                to bottom,
                transparent 0%,
                transparent ${Math.round(gridFade * 25)}%,
                var(--card) ${Math.round(gridFade * 100)}%
              )`,
            }}
          />

          {/* ── Glow verde sutil no canto superior-esquerdo ── */}
          <div
            aria-hidden="true"
            className="absolute pointer-events-none z-[1]"
            style={{
              top: "-40px",
              left: "-40px",
              width: "220px",
              height: "180px",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at center, rgba(62,207,142,0.09) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        </>
      )}

      {/* ── Conteúdo sempre acima de tudo ── */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
