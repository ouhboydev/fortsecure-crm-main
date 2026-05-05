import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CheckCircle2, Plus, Calendar as CalendarIcon, Clock, ListTodo,
  Phone, Mail, Users, Target, Trash2, AlertCircle, Loader2,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Atividades — FortSecure" }] }),
  component: () => <AppShell><Activities /></AppShell>,
});

const TYPE_ICONS: Record<string, any> = {
  tarefa: <ListTodo className="h-4 w-4" />,
  ligacao: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  reuniao: <Users className="h-4 w-4" />,
  followup: <Target className="h-4 w-4" />,
};

function Activities() {
  const { user, isManager } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "tarefa", due_date: "", is_public: false });

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const q = supabase.from("activities").select("*, profiles(full_name)").order("due_date", { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      
      const filtered = (data || []).filter(item => {
        const isPublic = item.description?.includes('[PÚBLICO]');
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
        status: 'pendente' as any
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

  const pending = items.filter(i => i.status !== "concluida");
  const completed = items.filter(i => i.status === "concluida");

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto min-h-screen space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-10">
        <PageHeader
          title="Central de Atividades"
          subtitle="Gestão tática de tarefas e compromissos comerciais"
        />
        <div className="flex items-center gap-4">
          <Button onClick={() => setIsModalOpen(true)} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/10">
            <Plus className="h-4 w-4" /> Nova Atividade
          </Button>
          <div className="flex bg-secondary border border-border p-1 rounded-xl shrink-0">
            <Button 
              variant={view === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('list')}
              className={cn("rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest", view === 'list' && "bg-background text-foreground shadow-sm")}
            >
              Lista
            </Button>
            <Button 
              variant={view === 'calendar' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('calendar')}
              className={cn("rounded-lg px-4 font-bold text-[10px] uppercase tracking-widest", view === 'calendar' && "bg-background text-foreground shadow-sm")}
            >
              Calendário
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-10">
          {view === 'list' ? (
            <div className="max-w-4xl mx-auto space-y-10">
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-3">
                    <span className="h-4 w-1 bg-primary rounded-full" />
                    Pendentes
                    <Badge variant="outline" className="bg-secondary border-border text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-md ml-2">{pending.length}</Badge>
                  </h3>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {pending.map((a) => (
                      <ActivityCard key={a.id} a={a} onComplete={complete} onRemove={remove} currentUserId={user?.id} />
                    ))}
                  </AnimatePresence>
                  {!loading && pending.length === 0 && (
                    <div className="bg-card/30 border border-dashed border-border rounded-3xl p-20 text-center">
                      <p className="text-muted-foreground/50 text-xs font-bold uppercase tracking-widest">Nenhuma tarefa pendente registrada</p>
                    </div>
                  )}
                </div>
              </section>

              {completed.length > 0 && (
                <section className="opacity-50">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Concluídas
                  </h3>
                  <div className="space-y-2">
                    {completed.map((a) => (
                      <ActivityCard key={a.id} a={a} onComplete={complete} onRemove={remove} currentUserId={user?.id} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="bg-card/20 backdrop-blur-md border border-border rounded-[40px] p-2 md:p-8 shadow-2xl">
               <CalendarGrid items={items} selectedDate={selectedDate} onSelect={setSelectedDate} onNew={() => setIsModalOpen(true)} />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border rounded-[32px] p-0 overflow-hidden max-w-lg shadow-2xl">
          <div className="p-10 space-y-8">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight uppercase">Agendar Atividade</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Crie uma nova tarefa ou compromisso tático.</DialogDescription>
            </DialogHeader>

            <form onSubmit={add} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Título da Tarefa</Label>
                <Input
                  required
                  autoFocus
                  placeholder="O que precisa ser feito?"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="h-14 bg-secondary/50 border-border text-sm text-foreground focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="h-14 bg-secondary/50 border-border text-sm text-foreground focus:ring-1 focus:ring-primary/50 outline-none appearance-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="tarefa">Tarefa</SelectItem>
                      <SelectItem value="ligacao">Ligação</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="followup">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Prazo</Label>
                  <Input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="h-14 bg-secondary/50 border-border text-sm text-foreground focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-secondary/50 border border-border rounded-xl">
                 <Checkbox 
                   id="is_public" 
                   checked={form.is_public} 
                   onCheckedChange={(v) => setForm({ ...form, is_public: !!v })}
                   className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" 
                 />
                 <Label htmlFor="is_public" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer">Compartilhar com o time</Label>
              </div>

              <DialogFooter className="flex gap-3 sm:justify-start pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 rounded-xl border-border text-xs font-bold uppercase tracking-widest hover:bg-secondary transition-all text-muted-foreground">Cancelar</Button>
                <Button
                  type="submit"
                  disabled={busy}
                  className="flex-[2] py-6 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  Confirmar Agendamento
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityCard({ a, onComplete, onRemove, currentUserId }: { a: any; onComplete: any; onRemove: any, currentUserId?: string }) {
  const isDone = a.status === "concluida";
  const isShared = a.description?.includes('[PÚBLICO]');
  const isOwner = a.owner_id === currentUserId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <Card
        className={cn(
          "group flex items-center gap-5 p-6 bg-card/30 border-border transition-all hover:bg-card/50 hover:border-border/50 overflow-hidden",
          isDone ? "opacity-60" : "shadow-sm"
        )}
      >
        <button
          onClick={() => onComplete(a.id, a.status)}
          disabled={!isOwner}
          className={cn(
            "h-10 w-10 rounded-xl grid place-items-center border-2 transition-all shrink-0",
            isDone
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border hover:border-primary hover:bg-primary/5 text-transparent hover:text-primary",
            !isOwner && "cursor-not-allowed opacity-50"
          )}
        >
          <CheckCircle2 className="h-6 w-6" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "font-bold text-lg tracking-tight",
              isDone ? "line-through text-muted-foreground/30" : "text-foreground group-hover:text-primary transition-colors"
            )}>
              {a.title}
            </div>
            {isShared && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-bold uppercase tracking-widest px-2 py-0">Time</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Badge variant="outline" className="flex items-center gap-2 bg-secondary border-border px-3 py-1 rounded-md group-hover:text-muted-foreground/50">
              {TYPE_ICONS[a.type]} {a.type}
            </Badge>
            {a.due_date && (
              <span className="flex items-center gap-2 font-mono group-hover:text-muted-foreground/30">
                <CalendarIcon className="h-3 w-3" /> {new Date(a.due_date).toLocaleDateString("pt-BR")}
                <Clock className="h-3 w-3 ml-2" /> {new Date(a.due_date).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {!isOwner && a.profiles && (
              <span className="flex items-center gap-2 text-muted-foreground/20 lowercase tracking-normal font-medium">
                por {a.profiles.full_name}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(a.id)}
            className="opacity-0 group-hover:opacity-100 h-10 w-10 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </Card>
    </motion.div>
  );
}

function CalendarGrid({ items, selectedDate, onSelect, onNew }: { items: any[], selectedDate: Date, onSelect: any, onNew: any }) {
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 gap-6">
        <h4 className="text-3xl font-bold text-foreground capitalize tracking-tighter">{monthName}</h4>
        
        <div className="flex items-center gap-4">
           <Button onClick={onNew} className="h-12 px-8 rounded-2xl bg-secondary border border-border text-foreground font-bold text-[11px] uppercase tracking-widest flex items-center gap-3 hover:bg-background hover:border-primary/50 transition-all group">
             <Plus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" /> Nova Atividade
           </Button>
           
           <div className="h-10 w-px bg-border hidden md:block mx-2" />

           <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => onSelect(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))} className="h-12 w-12 rounded-2xl border-border bg-secondary/50 hover:bg-secondary hover:text-primary transition-all"><ChevronRight className="h-5 w-5 rotate-180" /></Button>
              <Button variant="outline" size="icon" onClick={() => onSelect(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))} className="h-12 w-12 rounded-2xl border-border bg-secondary/50 hover:bg-secondary hover:text-primary transition-all"><ChevronRight className="h-5 w-5" /></Button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-[32px] overflow-hidden border border-border/50 shadow-inner">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-secondary/20 p-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border/50">{d}</div>
        ))}
        {blanks.map(b => <div key={`b-${b}`} className="bg-card/10 min-h-[160px] p-4" />)}
        {days.map(d => {
          const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d).toISOString().split('T')[0];
          const dayItems = items.filter(i => i.due_date?.startsWith(dateStr));
          const isToday = new Date().toISOString().split('T')[0] === dateStr;

          return (
            <div key={d} className={cn(
              "bg-card/40 min-h-[160px] p-6 border-r border-b border-border/30 hover:bg-card/50 transition-all group relative cursor-default",
              isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20"
            )}>
              <span className={cn(
                "text-base font-bold transition-all",
                isToday ? "text-primary" : "text-muted-foreground/30 group-hover:text-foreground"
              )}>{d}</span>
              
              <div className="mt-4 space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                {dayItems.map(it => (
                  <div key={it.id} className={cn(
                    "text-[9px] font-bold uppercase p-2 rounded-lg truncate transition-all",
                    it.status === 'concluida' 
                      ? "bg-secondary text-muted-foreground/30 border border-transparent" 
                      : "bg-primary text-primary-foreground shadow-lg shadow-emerald-500/10 border border-primary/20"
                  )}>
                    {it.title}
                  </div>
                ))}
              </div>

              {isToday && (
                <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
