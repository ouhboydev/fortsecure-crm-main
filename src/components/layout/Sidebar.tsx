import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Trophy, Briefcase,
  Tv, Brain, Settings, LogOut, Activity, User as UserIcon, Kanban,
  TrendingUp, ListTodo, UserCircle, PhoneCall, Package,
  BarChart, Target, ChevronDown, Search
} from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import { useState, useEffect } from "react";
import logo from "../../public/logo.png";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  to: string;
  label: string;
  icon: any;
  manager?: boolean;
  admin?: boolean;
  hideForAdmin?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const nav: NavGroup[] = [
  {
    group: "Geral", items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    group: "Pessoal", items: [
      { to: "/me", label: "Meu Painel", icon: UserCircle },
      { to: "/tracker", label: "Tracker", icon: PhoneCall },
      { to: "/pipeline", label: "Pipeline", icon: Kanban },
      { to: "/activities", label: "Agenda", icon: ListTodo },
    ]
  },
  {
    group: "Analytics", items: [
      { to: "/ranking", label: "Ranking", icon: Trophy },
      { to: "/insights", label: "IA Insights", icon: Brain },
    ]
  },
  {
    group: "Gestão", items: [
      { to: "/performance", label: "Performance", icon: BarChart },
      { to: "/executive", label: "Executivo", icon: TrendingUp, manager: true },
      { to: "/sellers", label: "Vendedores", icon: Users, manager: true },
      { to: "/hq", label: "Metas", icon: Target, manager: true },
    ]
  },
  {
    group: "Sistema", items: [
      { to: "/products", label: "Produtos", icon: Package },
      { to: "/tv", label: "Modo TV", icon: Tv },
      { to: "/admin", label: "Admin", icon: Settings, admin: true },
      { to: "/profile", label: "Configurações", icon: Settings, hideForAdmin: true },
    ]
  }
];

export function Sidebar() {
  const loc = useLocation();
  const nav2 = useNavigate();
  const { user, isAdmin, isManager } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", user.id).single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, [user]);

  return (
    <aside className="hidden md:flex flex-col w-[224px] bg-sidebar border-r border-sidebar-border sticky top-0 h-screen z-50 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="h-7 w-7 rounded-md overflow-hidden flex items-center justify-center bg-[#3ecf8e] shrink-0">
            <img src={logo} alt="FortSecure" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-sm font-semibold text-foreground truncate">FortSecure</span>
        </Link>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-3 no-scrollbar">
        <nav className="px-2 space-y-6">
          {nav.map((group) => {
            const visibleItems = group.items.filter(it => {
              if (it.admin) return isAdmin;
              if (it.manager) return isManager || isAdmin;
              if (it.hideForAdmin && isAdmin) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group}>
                <p className="px-3 mb-1 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                  {group.group}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((it) => {
                    const Icon = it.icon;
                    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                    return (
                      <Link key={it.to} to={it.to}>
                        <div
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer group",
                            active
                              ? "bg-[#3ecf8e]/10 text-[#3ecf8e]"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              active ? "text-[#3ecf8e]" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="truncate font-medium">{it.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <Link to="/profile" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <Avatar className="h-6 w-6 rounded-full shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url || profile?.avatar_url} />
              <AvatarFallback className="bg-[#3ecf8e]/20 text-[#3ecf8e] text-[10px] font-semibold rounded-full">
                {profile?.full_name?.[0] || user?.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground truncate leading-none">
                {profile?.full_name ? formatDisplayName(profile.full_name) : user?.email ? formatDisplayName(user.email.split("@")[0]) : "Usuário"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate leading-none mt-0.5">
                {isAdmin ? "Administrador" : isManager ? "Gestor" : "Vendedor"}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { await supabase.auth.signOut(); nav2({ to: "/auth" }); }}
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
