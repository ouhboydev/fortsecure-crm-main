import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Trophy, Briefcase,
  Tv, Brain, Settings, LogOut, Activity, User as UserIcon, Kanban,
  TrendingUp, ListTodo, UserCircle, PhoneCall, Package,
  BarChart, Target, ChevronDown, Search, BookOpen, Workflow, CalendarDays,
  PanelLeftClose, Check, PanelLeft
} from "lucide-react";
import { cn, formatDisplayName } from "@/lib/utils";
import { useState, useEffect } from "react";
import logo from "../../public/logo.png";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
      { to: "/knowledge", label: "Base de Conhecimento", icon: BookOpen },
    ]
  },
  {
    group: "Pessoal", items: [
      { to: "/me", label: "Meu Painel", icon: UserCircle },
      { to: "/customers", label: "Clientes", icon: Users },
      { to: "/prospecting", label: "Prospecção", icon: Target },
      { to: "/pipeline", label: "Pipeline", icon: Kanban },
      { to: "/activities", label: "Agenda", icon: CalendarDays },
      { to: "/tracker",    label: "Tracker", icon: PhoneCall },
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

type SidebarMode = "expanded" | "collapsed" | "hover";

export function Sidebar() {
  const loc = useLocation();
  const nav2 = useNavigate();
  const { user, isAdmin, isManager, isViewer } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [mode, setMode] = useState<SidebarMode>("expanded");
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarMode") as SidebarMode;
    if (saved) setMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarMode", mode);
  }, [mode]);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url, full_name").eq("id", user.id).single();
      if (data) setProfile(data);
    }
    loadProfile();
  }, [user]);

  const isActuallyCollapsed = (mode === "collapsed") || (mode === "hover" && !isHovered);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen z-50 shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden group/sidebar",
          isActuallyCollapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center px-4 py-4 h-[60px] border-b border-sidebar-border shrink-0 transition-all", isActuallyCollapsed ? "justify-center" : "gap-3")}>
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="h-7 w-7 rounded-md overflow-hidden flex items-center justify-center bg-[#3ecf8e] shrink-0">
              <img src={logo} alt="FortSecure" className="h-5 w-5 object-contain" />
            </div>
            <span className={cn(
              "text-sm font-semibold text-foreground truncate transition-all duration-300",
              isActuallyCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
              FortSecure
            </span>
          </Link>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-3 no-scrollbar overflow-x-hidden">
          <nav className={cn("space-y-6", isActuallyCollapsed ? "px-2" : "px-3")}>
            {nav.map((group) => {
              const visibleItems = group.items.filter(it => {
                if (it.admin) return isAdmin;
                if (it.manager) return isManager || isAdmin;
                if (it.hideForAdmin && isAdmin) return false;
                if (isViewer) {
                  const allowed = ["/dashboard", "/ranking", "/tv", "/products", "/performance", "/customers", "/knowledge"];
                  return allowed.includes(it.to);
                }
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.group}>
                  {!isActuallyCollapsed && (
                    <p className="px-3 mb-1.5 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest transition-opacity duration-300">
                      {group.group}
                    </p>
                  )}
                  {isActuallyCollapsed && (
                     <div className="h-[14px] mb-1.5 flex justify-center">
                        <div className="w-4 h-px bg-sidebar-border/50" />
                     </div>
                  )}
                  <div className="space-y-0.5">
                    {visibleItems.map((it) => {
                      const Icon = it.icon;
                      const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
                      
                      const linkContent = (
                        <div
                          className={cn(
                            "flex items-center rounded-md text-[13px] transition-colors cursor-pointer group",
                            isActuallyCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 px-3 py-1.5 h-8",
                            active
                              ? "bg-[#3ecf8e]/10 text-[#3ecf8e]"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                          )}
                        >
                          <Icon
                            strokeWidth={isActuallyCollapsed ? 1.5 : 2}
                            className={cn(
                              "shrink-0",
                              isActuallyCollapsed ? "h-5 w-5" : "h-4 w-4",
                              active ? "text-[#3ecf8e]" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          {!isActuallyCollapsed && <span className="truncate font-medium">{it.label}</span>}
                        </div>
                      );

                      if (isActuallyCollapsed) {
                        return (
                          <Tooltip key={it.to} delayDuration={0}>
                            <TooltipTrigger asChild>
                              <Link to={it.to} className="block">{linkContent}</Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-popover text-popover-foreground border-border text-xs">
                              {it.label}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return (
                        <Link key={it.to} to={it.to} className="block">
                          {linkContent}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer (User + Settings + Mode Toggle) */}
        <div className="shrink-0 border-t border-sidebar-border p-3 flex flex-col gap-2">
          <div className={cn("flex items-center", isActuallyCollapsed ? "justify-center" : "gap-2")}>
            <Link to="/profile" className={cn("flex items-center flex-1 min-w-0 hover:opacity-80 transition-opacity", isActuallyCollapsed ? "justify-center" : "gap-2")}>
              <Avatar className={cn("rounded-full shrink-0", isActuallyCollapsed ? "h-8 w-8" : "h-7 w-7")}>
                <AvatarImage src={user?.user_metadata?.avatar_url || profile?.avatar_url} />
                <AvatarFallback className="bg-[#3ecf8e]/20 text-[#3ecf8e] text-[10px] font-semibold rounded-full">
                  {profile?.full_name?.[0] || user?.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              {!isActuallyCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate leading-none">
                    {profile?.full_name ? formatDisplayName(profile.full_name) : user?.email ? formatDisplayName(user.email.split("@")[0]) : "Usuário"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate leading-none mt-1">
                    {isAdmin ? "Administrador" : isManager ? "Gestor" : isViewer ? "Visualização" : "Vendedor"}
                  </p>
                </div>
              )}
            </Link>
            
            {!isActuallyCollapsed && (
              <div className="flex items-center gap-0.5 shrink-0">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => { await supabase.auth.signOut(); nav2({ to: "/auth" }); }}
                  className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 rounded-md text-muted-foreground hover:text-foreground mt-1 w-full", isActuallyCollapsed ? "justify-center px-0" : "justify-between px-2")}
              >
                <div className="flex items-center gap-2">
                  <PanelLeftClose className="h-4 w-4" />
                  {!isActuallyCollapsed && <span className="text-xs font-medium">Sidebar control</span>}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" sideOffset={10} className="w-48 bg-card border-border text-foreground shadow-lg">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Sidebar control</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => setMode("expanded")} className="text-sm cursor-pointer hover:bg-secondary focus:bg-secondary">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-4 flex justify-center">{mode === "expanded" && <Check className="h-3 w-3 text-foreground" />}</div>
                  <span>Expanded</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("collapsed")} className="text-sm cursor-pointer hover:bg-secondary focus:bg-secondary">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-4 flex justify-center">{mode === "collapsed" && <Check className="h-3 w-3 text-foreground" />}</div>
                  <span>Collapsed</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("hover")} className="text-sm cursor-pointer hover:bg-secondary focus:bg-secondary">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-4 flex justify-center">{mode === "hover" && <Check className="h-3 w-3 text-foreground" />}</div>
                  <span>Expand on hover</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </aside>
    </TooltipProvider>
  );
}

