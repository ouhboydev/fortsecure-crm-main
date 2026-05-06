import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CheckCircle2, Plus, Clock, ListTodo,
  Phone, Mail, Users, Target, Trash2, Loader2,
  Calendar as CalendarIcon, ChevronRight, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Agenda — FortSecure" }] }),
  component: () => <AppShell><Activities /></AppShell>,
});

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  tarefa:  { icon: ListTodo, color: "text-[#a3a3a3] bg-[#262626]", label: "Tarefa" },
  ligacao: { icon: Phone,    color: "text-[#3ecf8e] bg-[#3ecf8e]/10", label: "Ligação" },
  email:   { icon: Mail,     color: "text-[#1eaedb] bg-[#1eaedb]/10", label: "E-mail" },
  reuniao: { icon: Users,    color: "text-[#f59e0b] bg-[#f59e0b]/10", label: "Reunião" },
  followup:{ icon: Target,   color: "text-[#a78bfa] bg-[#a78bfa]/10", label: "Follow-up" },
};

function Activities() {
  const { user, isManager } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pendente" | "concluida">("all");
  const [form, setForm] = useState({ title: "", type: "tarefa", due_date: "", is_public: false });

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*, profiles(full_name)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      const filtered = (data || []).filter(item => {
        const isPublic = item.description?.includes("[PÚBLICO]");
        if (isManager) return true;
        return item.owner_id === user.id || isPublic;
      });
      setItems(filtered);
    } catch (e: any) {
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user, isManager]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !user) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: user.id,
        title: form.title,
        type: form.type as any,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        description: form.is_public ? `[PÚBLICO] ${new Date().toISOString()}` : null,
        status: "pendente" as any,
      };
      const { error } = await supabase.from("activities").insert(payload);
      if (error) throw error;
      toast.success("Atividade agendada!");
      setForm({ title: "", type: "tarefa", due_date: "", is_public: false });
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar");
    } finally {
      setBusy(false);
    }
  }

  async function complete(id: string, currentStatus: string) {
    const newStatus = currentStatus === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase.from("activities").update({ status: newStatus }).eq("id", id);
    if (error) toast.error("Erro ao atualizar status");
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta atividade?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else load();
  }

  const displayed = items.filter(i => filter === "all" ? true : i.status === filter);
  const pending = items.filter(i => i.status !== "concluida").length;
  const done = items.filter(i => i.status === "concluida").length;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão de tarefas e compromissos comerciais</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-secondary border border-border rounded-md p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded transition-all", view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Lista
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("px-3 py-1.5 text-xs font-medium rounded transition-all", view === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              Calendário
            </button>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-9 gap-2 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs px-4 rounded-md shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Nova Atividade
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: items.length, color: "text-foreground" },
          { label: "Pendentes", value: pending, color: "text-[#f59e0b]" },
          { label: "Concluídas", value: done, color: "text-[#3ecf8e]" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <div className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {view === "list" ? (
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            {(["all", "pendente", "concluida"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 text-xs font-medium transition-all border-b-2 -mb-px",
                  filter === f ? "border-[#3ecf8e] text-[#3ecf8e]" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "all" ? "Todas" : f === "pendente" ? "Pendentes" : "Concluídas"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {displayed.map(a => (
                  <ActivityRow key={a.id} a={a} onComplete={complete} onRemove={remove} currentUserId={user?.id} />
                ))}
              </AnimatePresence>
              {displayed.length === 0 && (
                <div className="py-20 text-center border border-dashed border-border rounded-lg text-muted-foreground text-xs font-medium uppercase tracking-widest">
                  Nenhuma atividade encontrada
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <CalendarView items={items} selectedDate={selectedDate} onSelect={setSelectedDate} onNew={() => setIsModalOpen(true)} />
      )}

      {/* Add Activity Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border rounded-xl p-0 overflow-hidden max-w-lg shadow-xl">
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">Nova Atividade</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Crie uma nova tarefa ou compromisso.</DialogDescription>
            </DialogHeader>

            <form onSubmit={add} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Título</Label>
                <Input
                  required autoFocus
                  placeholder="O que precisa ser feito?"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="h-9 bg-secondary border-border text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-9 bg-secondary border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Prazo</Label>
                  <Input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })}
                    className="h-9 bg-secondary border-border text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-secondary border border-border rounded-md">
                <Checkbox
                  id="is_public"
                  checked={form.is_public}
                  onCheckedChange={v => setForm({ ...form, is_public: !!v })}
                  className="border-border data-[state=checked]:bg-[#3ecf8e] data-[state=checked]:text-black"
                />
                <Label htmlFor="is_public" className="text-xs text-muted-foreground cursor-pointer">Compartilhar com o time</Label>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-9 border-border text-xs">Cancelar</Button>
                <Button type="submit" disabled={busy} className="flex-[2] h-9 bg-[#3ecf8e] text-black font-semibold text-xs hover:bg-[#3ecf8e]/90 gap-2">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Confirmar
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityRow({ a, onComplete, onRemove, currentUserId }: { a: any; onComplete: any; onRemove: any; currentUserId?: string }) {
  const isDone = a.status === "concluida";
  const isOwner = a.owner_id === currentUserId;
  const isShared = a.description?.includes("[PÚBLICO]");
  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.tarefa;
  const Icon = cfg.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
      <div className={cn(
        "flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-border/80 transition-all group",
        isDone && "opacity-50"
      )}>
        <button
          onClick={() => onComplete(a.id, a.status)}
          disabled={!isOwner}
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center border-2 transition-all shrink-0",
            isDone ? "bg-[#3ecf8e] border-[#3ecf8e] text-black" : "border-border hover:border-[#3ecf8e] text-transparent hover:text-[#3ecf8e]",
            !isOwner && "cursor-not-allowed opacity-50"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>

        <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", cfg.color.split(" ")[1], cfg.color.split(" ")[0])}>
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className={cn("text-sm font-medium truncate", isDone ? "line-through text-muted-foreground" : "text-foreground")}>
            {a.title}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {a.due_date && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(a.due_date).toLocaleDateString("pt-BR")} · {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {isShared && <Badge variant="outline" className="text-[9px] border-[#3ecf8e]/20 text-[#3ecf8e] bg-[#3ecf8e]/5 px-1.5 py-0">Time</Badge>}
            {!isOwner && a.profiles && (
              <span className="text-[10px] text-muted-foreground">por {a.profiles.full_name}</span>
            )}
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => onRemove(a.id)}
            className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function CalendarView({ items, selectedDate, onSelect, onNew }: { items: any[]; selectedDate: Date; onSelect: any; onNew: any }) {
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const monthName = selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const prevMonth = () => onSelect(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  const nextMonth = () => onSelect(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground capitalize">{monthName}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 border-border bg-card">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 border-border bg-card">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button onClick={onNew} className="h-8 px-3 bg-[#3ecf8e] text-black text-xs font-semibold gap-1.5 hover:bg-[#3ecf8e]/90">
            <Plus className="h-3 w-3" /> Nova
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {blanks.map(b => <div key={`b-${b}`} className="min-h-[100px] border-r border-b border-border/50 bg-secondary/20" />)}
          {days.map(d => {
            const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d).toISOString().split("T")[0];
            const dayItems = items.filter(i => i.due_date?.startsWith(dateStr));
            const isToday = new Date().toISOString().split("T")[0] === dateStr;

            return (
              <div key={d} className={cn(
                "min-h-[100px] p-2 border-r border-b border-border/50 hover:bg-accent/20 transition-colors",
                isToday && "bg-[#3ecf8e]/5"
              )}>
                <span className={cn("text-xs font-medium", isToday ? "text-[#3ecf8e]" : "text-muted-foreground")}>
                  {d}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayItems.slice(0, 3).map(it => (
                    <div key={it.id} className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded truncate font-medium",
                      it.status === "concluida" ? "bg-secondary text-muted-foreground" : "bg-[#3ecf8e]/15 text-[#3ecf8e]"
                    )}>
                      {it.title}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[9px] text-muted-foreground px-1">+{dayItems.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
