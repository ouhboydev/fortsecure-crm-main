import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, List, Phone, Mail, User, ShieldCheck, Target, MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  tarefa:   { icon: List,         color: "text-[#a3a3a3] bg-[#262626]",       label: "Tarefa" },
  ligacao:  { icon: Phone,        color: "text-[#3ecf8e] bg-[#3ecf8e]/10",    label: "Ligação" },
  email:    { icon: Mail,         color: "text-[#1eaedb] bg-[#1eaedb]/10",    label: "E-mail" },
  reuniao:  { icon: User,         color: "text-[#f59e0b] bg-[#f59e0b]/10",    label: "Reunião" },
  visita:   { icon: ShieldCheck,  color: "text-[#1eaedb] bg-[#1eaedb]/10",    label: "Visita" },
  followup: { icon: Target,       color: "text-[#a78bfa] bg-[#a78bfa]/10",    label: "Follow-up" },
  whatsapp: { icon: MessageSquare,color: "text-[#25D366] bg-[#25D366]/10",    label: "WhatsApp" },
};

export function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function fetchNotifs() {
      if (!user) return;
      const { data } = await supabase
        .from("activities")
        .select("*, opportunities(title, customers(name))")
        .neq("status", "concluida")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (data) setNotifications(data);
    }
    fetchNotifs();

    const sub = supabase.channel('activities-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
        fetchNotifs();
      }).subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, [user]);

  const unreadCount = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-7 w-7 rounded-md text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-card border-border shadow-lg" sideOffset={10}>
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold">Notificações</h4>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{unreadCount} pendentes</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {notifications.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground py-8">Nenhuma atividade pendente.</p>
          ) : (
            notifications.map(n => {
              const cfg = ACTIVITY_TYPE_CONFIG[n.type] || ACTIVITY_TYPE_CONFIG.tarefa;
              const Icon = cfg.icon;
              return (
                <div key={n.id} className="p-2 hover:bg-secondary/50 rounded-lg transition-colors flex gap-3 group">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.color.split(" ")[1], cfg.color.split(" ")[0])}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">{n.description || cfg.label}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/80 mt-1.5 truncate">
                      {n.opportunities?.customers?.name ? `👤 ${n.opportunities.customers.name}` : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-2 border-t border-border bg-secondary/10">
          <Link to="/activities" className="block text-center text-[10px] font-bold tracking-widest uppercase text-[#3ecf8e] hover:text-[#3ecf8e]/80 transition-colors">
            Ver Todas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
