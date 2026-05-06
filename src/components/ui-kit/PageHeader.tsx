import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  delay?: number;
  trend?: { value: number; label?: string };
}) {
  const accentColor = {
    primary: "#3ecf8e",
    success: "#3ecf8e",
    warning: "#f6ad55",
    destructive: "#e53e3e",
    info: "#4299e1",
  }[accent];

  return (
    <Card className="bg-card border border-border rounded-lg p-5 hover:border-[#3ecf8e]/30 transition-colors group">
      <CardContent className="p-0 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {icon && (
            <div className="h-8 w-8 rounded-md flex items-center justify-center bg-secondary text-muted-foreground group-hover:text-[#3ecf8e] transition-colors">
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-semibold text-foreground font-mono tracking-tight">{value}</p>
        {(hint || trend) && (
          <div className="flex items-center gap-2">
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend.value > 0 ? "text-[#3ecf8e]" : trend.value < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : trend.value < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {trend.value > 0 ? "+" : ""}{trend.value.toFixed(1)}%
              </span>
            )}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Section({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <Card className={cn("bg-card border border-border rounded-lg overflow-hidden", className)}>
      <CardHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </CardHeader>
      <CardContent className="p-5">
        {children}
      </CardContent>
    </Card>
  );
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
