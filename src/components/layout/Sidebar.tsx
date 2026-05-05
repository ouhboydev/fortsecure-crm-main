import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Trophy, Target, Briefcase,
  Tv, Brain, Settings, LogOut, Activity, User as UserIcon, Kanban,
  TrendingUp, ListTodo, UserCircle, ChevronRight, PhoneCall, Package,
  BarChart, Zap, Building2, Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import logo from "../../public/logo.png";
import { ThemeToggle } from "./ThemeToggle";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
      { to: "/goals", label: "Metas", icon: Target, manager: true },
      { to: "/hq", label: "Comando HQ", icon: Building2, manager: true },
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
    <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border sticky top-0 h-screen z-50 shrink-0 transition-colors duration-500">
      <div className="px-8 py-10 mb-2 shrink-0 flex items-center justify-between">
        <Link to="/dashboard" className="flex-1 group">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000" />
            <div className="relative bg-white p-4 rounded-[28px] shadow-2xl shadow-primary/10 border border-border group-hover:border-primary/30 transition-all duration-500 group-hover:scale-105 group-hover:-rotate-1">
               <img 
                src={logo} 
                alt="FortSecure" 
                className="h-8 w-auto object-contain mx-auto" 
              />
            </div>
          </div>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-6 relative z-10 py-4 no-scrollbar">
        <div className="space-y-10">
          {nav.map((group) => {
            const visibleItems = group.items.filter(it => {
              if (it.admin) return isAdmin;
              if (it.manager) return isManager || isAdmin;
              if (it.hideForAdmin && isAdmin) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-3">
                <h3 className="px-4 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">{group.group}</h3>
                <div className="space-y-1">
                  {visibleItems.map((it) => {
                    const Icon = it.icon;
                    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                    return (
                      <Link key={it.to} to={it.to}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-4 px-4 py-6 rounded-2xl text-[13px] font-bold transition-all duration-300 group relative border border-transparent",
                            active
                              ? "bg-secondary text-foreground shadow-xl border-border hover:bg-accent hover:text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                          )}
                        >
                          {active && (
                            <motion.div 
                              layoutId="sidebar-active" 
                              className="absolute left-[-1.5rem] w-1.5 h-6 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                            />
                          )}
                          <Icon className={cn("h-4 w-4 shrink-0 transition-all", active ? "text-primary scale-110" : "group-hover:text-muted-foreground")} />
                          <span className="flex-1 tracking-tight text-left">{it.label}</span>
                          {active && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="mt-auto px-6 pb-10 flex items-center justify-between gap-2 border-t border-sidebar-border/50 pt-8 mx-2 shrink-0">
        <ThemeToggle />
        
        <Link to="/profile">
          <Avatar className="h-10 w-10 rounded-full border border-border hover:border-primary/50 transition-all shadow-xl group/avatar">
            <AvatarImage src={user?.user_metadata?.avatar_url || profile?.avatar_url} />
            <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground/30 uppercase rounded-full">
              {user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>

        <Button 
          variant="ghost" 
          size="icon"
          onClick={async () => { await supabase.auth.signOut(); nav2({ to: "/auth" }); }}
          className="h-10 w-10 rounded-full text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
