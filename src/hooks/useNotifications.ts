import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: string;
  message: string;
  type: "warning" | "info" | "success" | "error";
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  const { user, isManager, isAdmin } = useAuth();
  const canReceive = isManager || isAdmin;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  const load = useCallback(async () => {
    if (!user || !canReceive) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      setNotifications((data as AppNotification[]) ?? []);
    } catch {
      // Table may not exist yet — fail silently
    }
  }, [user, canReceive]);

  useEffect(() => {
    load();
    if (!user || !canReceive) return;
    const ch = supabase
      .channel("notifications-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, canReceive, load]);

  const markRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* fail silently */ }
  };

  const markAllRead = async () => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("read", false);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* fail silently */ }
  };

  /** Try to persist notification — fails gracefully if table doesn't exist */
  const send = async (message: string, type: AppNotification["type"] = "info", metadata?: Record<string, any>) => {
    try {
      await supabase.from("notifications").insert({ message, type, read: false, metadata });
    } catch { /* fail silently */ }
  };

  return { notifications, unreadCount, markRead, markAllRead, send, reload: load };
}
