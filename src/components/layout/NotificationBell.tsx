import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_STYLES: Record<string, string> = {
  warning: "border-l-[#f59e0b] bg-[#f59e0b]/5",
  error:   "border-l-[#ef4444] bg-[#ef4444]/5",
  success: "border-l-[#3ecf8e] bg-[#3ecf8e]/5",
  info:    "border-l-[#1eaedb] bg-[#1eaedb]/5",
};

const TYPE_DOT: Record<string, string> = {
  warning: "bg-[#f59e0b]",
  error:   "bg-[#ef4444]",
  success: "bg-[#3ecf8e]",
  info:    "bg-[#1eaedb]",
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "relative h-6 w-6 rounded-md flex items-center justify-center transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-accent/60",
          open && "text-foreground bg-accent/60"
        )}
        title="Notificações"
      >
        <Bell className="h-3.5 w-3.5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#ef4444] flex items-center justify-center text-[8px] font-bold text-white leading-none"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="notification-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-8 left-0 w-72 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-[#3ecf8e] hover:underline font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer border-l-2 transition-all hover:brightness-105",
                      TYPE_STYLES[n.type] || TYPE_STYLES.info,
                      !n.read && "opacity-100",
                      n.read && "opacity-50"
                    )}
                  >
                    <div className={cn("h-1.5 w-1.5 rounded-full shrink-0 mt-1.5", TYPE_DOT[n.type] || TYPE_DOT.info)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
