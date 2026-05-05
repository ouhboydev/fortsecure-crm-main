import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 py-2">
      <div className="space-y-4">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground uppercase italic leading-[0.85]">
          {title}
        </h1>
        {subtitle && (
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-border" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.4em]">{subtitle}</p>
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  delay?: number;
}) {
  return (
    <Card className={cn(
      "bg-card/40 backdrop-blur-3xl border-border/50 rounded-[32px] p-10 transition-all duration-700 group relative overflow-hidden",
      "hover:bg-accent/40 hover:border-border hover:shadow-3xl shadow-none border"
    )}>
      <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-700 pointer-events-none text-foreground">
        {icon}
      </div>
      <CardContent className="p-0">
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-6 w-full">
            <div className="flex items-center gap-3">
              <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", 
                accent === "success" ? "bg-primary" : "bg-muted-foreground/30"
              )} />
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">{label}</div>
            </div>
            <div className="text-4xl font-black text-foreground tracking-tighter font-mono italic">{value}</div>
            {hint && (
              <div className="pt-4 border-t border-border/50">
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-relaxed group-hover:text-foreground/60 transition-colors">{hint}</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="bg-card/40 backdrop-blur-3xl border-border/50 rounded-[40px] p-12 shadow-2xl overflow-hidden border">
      <CardHeader className="p-0 flex flex-row items-center justify-between mb-12 space-y-0">
        <CardTitle className="text-xs font-black text-muted-foreground flex items-center gap-4 uppercase tracking-[0.4em] italic">
           <span className="h-4 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
           {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
