import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, StatCard } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CheckCircle2, Plus, Clock, ListTodo,
  Phone, Mail, Users, Target, Trash2, Loader2,
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, Pencil, MapPin,
  PhoneCall, History, Search
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
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Agenda & Tracker — FortSecure" }] }),
  component: () => <AppShell><Activities /></AppShell>,
});

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  tarefa:  { icon: ListTodo, color: "text-[#a3a3a3] bg-[#262626]", label: "Tarefa" },
  ligacao: { icon: Phone,    color: "text-[#3ecf8e] bg-[#3ecf8e]/10", label: "Ligação" },
  email:   { icon: Mail,     color: "text-[#1eaedb] bg-[#1eaedb]/10", label: "E-mail" },
  reuniao: { icon: Users,    color: "text-[#f59e0b] bg-[#f59e0b]/10", label: "Reunião" },
  visita:  { icon: MapPin,   color: "text-[#1eaedb] bg-[#1eaedb]/10", label: "Visita" },
  followup:{ icon: Target,   color: "text-[#a78bfa] bg-[#a78bfa]/10", label: "Follow-up" },
};

function Activities() {
  const { user, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<"agenda" | "tracker">("agenda");
  
  // Shared activities state
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Agenda tab states
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "pendente" | "concluida">("all");
  const [form, setForm] = useState({ title: "", type: "tarefa", due_date: "", is_public: false, description: "" });
  const [showCompleted, setShowCompleted] = useState(false);

  // Tracker tab states
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [trackerEditingId, setTrackerEditingId] = useState<string | null>(null);
  const [logType, setLogType] = useState<'call' | 'visit' | 'meeting'>('call');
  const [trackerClientName, setTrackerClientName] = useState("");
  const [trackerDescription, setTrackerDescription] = useState("");
  const [trackerScheduledTime, setTrackerScheduledTime] = useState("");
  const [trackerPriority, setTrackerPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [trackerOutcome, setTrackerOutcome] = useState("");
  const [trackerRelatedOpportunity, setTrackerRelatedOpportunity] = useState("");
  const [opps, setOpps] = useState<any[]>([]);
  const [trackerSearch, setTrackerSearch] = useState("");

  // Load Opportunities for Tracker Select
  useEffect(() => {
    async function loadOpps() {
      if (!user) return;
      const { data } = await supabase.from("opportunities").select("id, title").eq("owner_id", user.id);
      setOpps(data || []);
    }
    loadOpps();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activities")
        .select("*, profiles(full_name), opportunities(title)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      
      const filteredItems = (data || []).filter(item => {
        const isPublic = item.description?.includes("[PÚBLICO]");
        if (isManager) return true;
        return item.owner_id === user.id || isPublic;
      });
      setItems(filteredItems);
    } catch (e: any) {
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user, isManager]);

  // Agenda Save Function
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !user) return;
    setBusy(true);
    try {
      const isPublicStr = form.is_public ? `[PÚBLICO] ` : "";
      const finalDesc = form.description ? `${isPublicStr}${form.description}` : (form.is_public ? `[PÚBLICO] ${new Date().toISOString()}` : null);

      const payload: any = {
        title: form.title,
        type: form.type as any,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        description: finalDesc,
      };

      if (editingItem) {
        const { error } = await supabase.from("activities").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Atividade atualizada!");
      } else {
        payload.owner_id = user.id;
        payload.status = "pendente";
        const { error } = await supabase.from("activities").insert(payload);
        if (error) throw error;
        toast.success("Atividade agendada!");
      }

      setForm({ title: "", type: "tarefa", due_date: "", is_public: false, description: "" });
      setEditingItem(null);
      setIsModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  // Tracker Save Function
  async function saveTrackerActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const dbType = logType === 'call' ? 'ligacao' : logType === 'meeting' ? 'reuniao' : 'visita';
      const label = logType === 'call' ? 'Call' : logType === 'meeting' ? 'Reunião' : 'Visita';
      
      const payload = {
        owner_id: user.id,
        title: `${label}: ${trackerClientName}`,
        type: dbType,
        due_date: trackerScheduledTime ? new Date(trackerScheduledTime).toISOString() : new Date().toISOString(),
        description: trackerDescription,
        status: 'concluida',
        opportunity_id: trackerRelatedOpportunity || null,
        metadata: {
          priority: trackerPriority,
          outcome: trackerOutcome,
          log_subtype: logType
        }
      };

      if (trackerEditingId) {
        const { error } = await supabase.from("activities").update(payload as any).eq("id", trackerEditingId);
        if (error) throw error;
        toast.success("Registro atualizado!");
      } else {
        const { error } = await supabase.from("activities").insert(payload as any);
        if (error) throw error;
        toast.success("Atividade registrada!");
      }

      setIsTrackerModalOpen(false);
      setTrackerEditingId(null);
      setTrackerClientName("");
      setTrackerDescription("");
      setTrackerScheduledTime("");
      setTrackerOutcome("");
      setTrackerRelatedOpportunity("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar registro");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(a: any) {
    setEditingItem(a);
    const desc = a.description || "";
    setForm({
      title: a.title || "",
      type: a.type || "tarefa",
      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : "",
      is_public: desc.includes("[PÚBLICO]"),
      description: desc.replace("[PÚBLICO] ", "").replace(`[PÚBLICO]`, "").trim()
    });
    setIsModalOpen(true);
  }

  function openNew() {
    setEditingItem(null);
    setForm({ title: "", type: "tarefa", due_date: "", is_public: false, description: "" });
    setIsModalOpen(true);
  }

  function openTrackerEdit(a: any) {
    setTrackerEditingId(a.id);
    setLogType(a.metadata?.log_subtype || (a.type === 'visita' ? 'visit' : a.type === 'reuniao' ? 'meeting' : 'call'));
    setTrackerClientName(a.title.split(': ')[1] || a.title);
    setTrackerDescription(a.description || "");
    setTrackerScheduledTime(a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : "");
    setTrackerPriority(a.metadata?.priority || 'media');
    setTrackerOutcome(a.metadata?.outcome || "");
    setTrackerRelatedOpportunity(a.opportunity_id || "");
    setIsTrackerModalOpen(true);
  }

  function openTrackerNew() {
    setTrackerEditingId(null);
    setLogType('call');
    setTrackerClientName("");
    setTrackerDescription("");
    setTrackerScheduledTime(new Date().toISOString().slice(0, 16));
    setTrackerPriority('media');
    setTrackerOutcome("");
    setTrackerRelatedOpportunity("");
    setIsTrackerModalOpen(true);
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

  // Filtering for Agenda View
  const displayed = items.filter(i => i.status !== "concluida");
  const completedItems = items.filter(i => i.status === "concluida");
  const pending = items.filter(i => i.status !== "concluida").length;
  const done = items.filter(i => i.status === "concluida").length;

  // Filtering and Stats for Tracker View
  const trackerLogs = items.filter(a => ['ligacao', 'reuniao', 'visita'].includes(a.type));
  const filteredTrackerLogs = trackerLogs.filter(a =>
    a.title.toLowerCase().includes(trackerSearch.toLowerCase()) ||
    a.description?.toLowerCase().includes(trackerSearch.toLowerCase())
  ).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  const trackerCalls = trackerLogs.filter(a => a.type === 'ligacao');
  const trackerVisitsMeetings = trackerLogs.filter(a => ['reuniao', 'visita'].includes(a.type));
  const conversionRate = trackerLogs.length > 0
    ? `${Math.round((trackerLogs.filter(a => a.metadata?.outcome && a.metadata.outcome.length > 0).length / trackerLogs.length) * 100)}%`
    : "—";

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agenda & Tracker</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão de tarefas, compromissos e registro de atividades táticas</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === "agenda" ? (
            <>
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
                onClick={openNew}
                className="h-9 gap-2 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs px-4 rounded-md shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Atividade
              </Button>
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar logs..."
                  value={trackerSearch}
                  onChange={(e) => setTrackerSearch(e.target.value)}
                  className="h-9 pl-9 w-48 bg-card border-border text-xs"
                />
              </div>
              <Button
                onClick={openTrackerNew}
                className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs rounded-md shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-2" /> Novo Registro
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("agenda")}
          className={cn(
            "px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-all flex items-center gap-2",
            activeTab === "agenda"
              ? "border-[#3ecf8e] text-[#3ecf8e]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ListTodo className="h-4 w-4" />
          Agenda Planejada
        </button>
        <button
          onClick={() => setActiveTab("tracker")}
          className={cn(
            "px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-all flex items-center gap-2",
            activeTab === "tracker"
              ? "border-[#3ecf8e] text-[#3ecf8e]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <PhoneCall className="h-4 w-4" />
          Tracker de Atividades
        </button>
      </div>

      {activeTab === "agenda" ? (
        <div className="space-y-6">
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
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {displayed.map(a => (
                      <ActivityRow 
                        key={a.id} 
                        a={a} 
                        onComplete={complete} 
                        onRemove={remove} 
                        onEdit={openEdit}
                        currentUserId={user?.id} 
                      />
                    ))}
                  </AnimatePresence>
                  {displayed.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-border rounded-lg text-muted-foreground text-xs font-medium uppercase tracking-widest">
                      Nenhuma atividade encontrada
                    </div>
                  )}
                </div>
              )}

              {/* Seção Colapsável de Atividades Concluídas */}
              {completedItems.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors py-2"
                  >
                    <ChevronRight className={cn("h-4 w-4 text-[#3ecf8e] transition-transform duration-200", showCompleted && "rotate-90")} />
                    Atividades Concluídas ({completedItems.length})
                  </button>

                  <AnimatePresence>
                    {showCompleted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 mt-4 overflow-hidden"
                      >
                        {completedItems.map(a => (
                          <ActivityRow 
                            key={a.id} 
                            a={a} 
                            onComplete={complete} 
                            onRemove={remove} 
                            onEdit={openEdit}
                            currentUserId={user?.id} 
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : (
            <CalendarView items={items.filter(i => i.status !== "concluida")} selectedDate={selectedDate} onSelect={setSelectedDate} onNew={openNew} onEdit={openEdit} user={user} />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tracker Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total de Logs" value={trackerLogs.length} icon={<History className="h-4 w-4" />} />
            <StatCard label="Ligações" value={trackerCalls.length} accent="info" icon={<PhoneCall className="h-4 w-4" />} />
            <StatCard label="Reuniões / Visitas" value={trackerVisitsMeetings.length} accent="primary" icon={<MapPin className="h-4 w-4" />} />
            <StatCard label="Taxa de Conversão" value={conversionRate} accent="success" icon={<Target className="h-4 w-4" />} />
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Operational History */}
            <div className="lg:col-span-2 space-y-4">
              <Section title="Histórico Operacional">
                {loading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#3ecf8e]" /></div>
                ) : filteredTrackerLogs.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-widest font-medium">Nenhum registro encontrado</div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {filteredTrackerLogs.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => openTrackerEdit(a)}
                        className="group flex items-center justify-between p-4 bg-background border border-border rounded-md hover:border-[#3ecf8e]/50 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn(
                            "h-10 w-10 rounded flex items-center justify-center shrink-0",
                            a.type === 'ligacao' ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : a.type === 'visita' ? "bg-[#1eaedb]/10 text-[#1eaedb]" : "bg-[#f59e0b]/10 text-[#f59e0b]"
                          )}>
                            {a.type === 'ligacao' ? <Phone className="h-4 w-4" /> : a.type === 'visita' ? <MapPin className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold truncate group-hover:text-[#3ecf8e] transition-colors">{a.title}</h4>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {new Date(a.due_date).toLocaleDateString('pt-BR')}
                              </span>
                              {a.opportunities?.title && (
                                <span className="text-[10px] text-[#3ecf8e] font-bold uppercase tracking-wider truncate">
                                  #{a.opportunities.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] border-border bg-muted/50 uppercase tracking-wider">
                          {a.metadata?.outcome || "Finalizado"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* Metrics & Sidebar info */}
            <div className="space-y-6">
              <Section title="Mix de Atividade">
                <div className="space-y-6 pt-4">
                  <ActivityMetric label="Ligações" count={trackerCalls.length} total={trackerLogs.length} color="#3ecf8e" />
                  <ActivityMetric
                    label="Visitas/Reuniões"
                    count={trackerVisitsMeetings.length}
                    total={trackerLogs.length}
                    color="#1eaedb"
                  />
                </div>
              </Section>

              <Card className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3 text-[#3ecf8e]" /> Próximos Compromissos
                  </h4>
                </div>
                <div className="p-4 space-y-2">
                  {items
                    .filter(a => a.status === 'pendente' && ['reuniao', 'visita'].includes(a.type) && new Date(a.due_date) >= new Date(new Date().setHours(0,0,0,0)))
                    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                    .slice(0, 4)
                    .map(a => {
                      const isVisit = a.type === 'visita';
                      return (
                        <div key={a.id} className="flex items-start gap-3 p-3 rounded-md bg-secondary/50 border border-border/50">
                          <div className={cn("h-7 w-7 rounded flex items-center justify-center shrink-0 mt-0.5", isVisit ? "bg-[#1eaedb]/10 text-[#1eaedb]" : "bg-[#f59e0b]/10 text-[#f59e0b]")}>
                            {isVisit ? <MapPin className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">{a.title.split(': ')[1] || a.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {new Date(a.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {new Date(a.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] shrink-0", isVisit ? "border-[#1eaedb]/30 text-[#1eaedb]" : "border-[#f59e0b]/30 text-[#f59e0b]")}>
                            {isVisit ? "Visita" : "Reunião"}
                          </Badge>
                        </div>
                      );
                    })}
                  {items.filter(a => a.status === 'pendente' && ['reuniao', 'visita'].includes(a.type) && new Date(a.due_date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum compromisso agendado.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Agenda: Add/Edit Activity Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border rounded-xl p-0 overflow-hidden max-w-lg shadow-xl">
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">
                {editingItem ? "Editar Atividade" : "Nova Atividade"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingItem ? "Altere as informações do compromisso." : "Crie uma nova tarefa ou compromisso comercial."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={save} className="space-y-4">
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
                        <SelectItem key={k} value={k}>
                          <span className="flex items-center gap-2">
                            <v.icon className="h-3.5 w-3.5" />
                            {v.label}
                          </span>
                        </SelectItem>
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Descrição</Label>
                <Textarea
                  placeholder="Detalhes adicionais da atividade..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="bg-secondary border-border text-sm min-h-[80px]"
                />
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
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (editingItem ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />)}
                  {editingItem ? "Salvar Alterações" : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tracker: Add/Edit Log Modal */}
      <Dialog open={isTrackerModalOpen} onOpenChange={setIsTrackerModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-6 border-b border-border bg-muted/50">
            <DialogTitle className="text-lg font-semibold">Registrar Atividade (Tracker)</DialogTitle>
            <DialogDescription className="text-xs">Registre os detalhes da sua interação comercial concluída.</DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <form onSubmit={saveTrackerActivity} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Tipo de Log</Label>
                  <Select value={logType} onValueChange={(v:any) => setLogType(v)}>
                    <SelectTrigger className="h-9 bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="call">Ligação (Cold/Follow)</SelectItem>
                      <SelectItem value="meeting">Reunião Online</SelectItem>
                      <SelectItem value="visit">Visita Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Prioridade</Label>
                  <Select value={trackerPriority} onValueChange={(v:any) => setTrackerPriority(v)}>
                    <SelectTrigger className="h-9 bg-background border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Cliente / Empresa</Label>
                <Input required value={trackerClientName} onChange={e => setTrackerClientName(e.target.value)} className="h-9 bg-background border-border text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Data e Hora</Label>
                  <Input type="datetime-local" value={trackerScheduledTime} onChange={e => setTrackerScheduledTime(e.target.value)} className="h-9 bg-background border-border text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Negócio Relacionado</Label>
                  <Select value={trackerRelatedOpportunity} onValueChange={setTrackerRelatedOpportunity}>
                    <SelectTrigger className="h-9 bg-background border-border text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {opps.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Desfecho / Resultado</Label>
                <Input placeholder="Ex: Proposta enviada..." value={trackerOutcome} onChange={e => setTrackerOutcome(e.target.value)} className="h-9 bg-background border-border text-sm" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Notas e Observações</Label>
                <Textarea value={trackerDescription} onChange={e => setTrackerDescription(e.target.value)} className="bg-background border-border text-sm min-h-[80px]" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsTrackerModalOpen(false)} className="text-xs">Cancelar</Button>
                <Button type="submit" disabled={busy} className="bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs px-6">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Registro"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityRow({ a, onComplete, onRemove, onEdit, currentUserId }: { a: any; onComplete: any; onRemove: any; onEdit: any; currentUserId?: string }) {
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

        <div className="flex-1 min-w-0" onClick={() => isOwner && onEdit(a)} style={{ cursor: isOwner ? 'pointer' : 'default' }}>
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

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {isOwner && (
            <button
              onClick={() => onEdit(a)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-all"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onRemove(a.id)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarView({ items, selectedDate, onSelect, onNew, onEdit, user }: { items: any[]; selectedDate: Date; onSelect: any; onNew: any; onEdit: any; user: any }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const monthName = selectedDate.toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const prevMonth = () => { setSelectedDay(null); onSelect(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)); };
  const nextMonth = () => { setSelectedDay(null); onSelect(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)); };

  const selectedDayItems = selectedDay ? items.filter(i => i.due_date?.startsWith(selectedDay)) : [];

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
              <div
                key={d}
                onClick={() => setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                className={cn(
                  "min-h-[140px] p-2 border-r border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer",
                  isToday && "bg-[#3ecf8e]/5",
                  selectedDay === dateStr && "ring-1 ring-inset ring-[#3ecf8e]/40 bg-[#3ecf8e]/5"
                )}>
                <span className={cn("text-xs font-medium", isToday ? "text-[#3ecf8e] font-bold" : "text-muted-foreground")}>
                  {d}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayItems.slice(0, 3).map(it => {
                    const cfg = TYPE_CONFIG[it.type] || TYPE_CONFIG.tarefa;
                    const [iconColor, bgColor] = cfg.color.split(" ");
                    const timeStr = new Date(it.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                    const authorName = it.profiles?.full_name
                      ? it.profiles.full_name.split(" ")[0]
                      : null;
                    return (
                      <div
                        key={it.id}
                        title={`${cfg.label} · ${it.title}${authorName ? ` · ${it.profiles.full_name}` : ''} · ${timeStr}\n${it.description || ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(it);
                        }}
                        className={cn(
                          "flex flex-col gap-0.5 px-1.5 py-1 rounded text-[9px] font-medium leading-tight overflow-hidden cursor-pointer",
                          it.status === "concluida" ? "bg-secondary text-muted-foreground line-through opacity-60" : bgColor + " " + iconColor
                        )}
                      >
                        <div className="flex items-center gap-1 font-bold truncate">
                          <cfg.icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{it.title}</span>
                        </div>
                        {it.description && !it.description.startsWith("[PÚBLICO]") && (
                          <span className="truncate opacity-80">{it.description}</span>
                        )}
                        {authorName && (
                          <span className="truncate opacity-80 text-[8px] italic flex items-center gap-0.5"><Users className="h-2 w-2" /> {authorName}</span>
                        )}
                      </div>
                    );
                  })}
                  {dayItems.length > 3 && (
                    <div className="text-[9px] text-muted-foreground px-1">+{dayItems.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      {selectedDay && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span className="text-[10px] text-muted-foreground">{selectedDayItems.length} atividade{selectedDayItems.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-4 space-y-2">
            {selectedDayItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade neste dia.</p>
            ) : (
              selectedDayItems.map(it => {
                const cfg = TYPE_CONFIG[it.type] || TYPE_CONFIG.tarefa;
                const [iconColor] = cfg.color.split(" ");
                const timeStr = new Date(it.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const isDone = it.status === "concluida";
                const authorName = it.profiles?.full_name || null;
                return (
                  <div key={it.id} className={cn(
                    "flex items-center gap-4 p-3 bg-secondary/50 border border-border/60 rounded-lg group transition-all",
                    isDone && "opacity-60"
                  )}>
                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center shrink-0", cfg.color.split(" ")[1], iconColor)}>
                      <cfg.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(it)}>
                      <p className={cn("text-sm font-bold truncate", isDone && "line-through text-muted-foreground")}>{it.title}</p>
                      {it.description && !it.description.startsWith("[PÚBLICO]") && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeStr}
                        </span>
                        {authorName && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {authorName}
                          </span>
                        )}
                        {it.opportunities?.title && (
                          <span className="text-[10px] text-[#3ecf8e] font-semibold uppercase tracking-wider flex items-center gap-1">
                            <Target className="h-3 w-3" /> {it.opportunities.title}
                          </span>
                        )}
                        <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
                          cfg.color.split(" ")[0]
                        )}>{cfg.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {it.owner_id === user?.id && (
                        <button onClick={() => onEdit(it)} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#3ecf8e]">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isDone && <CheckCircle2 className="h-4 w-4 text-[#3ecf8e] shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityMetric({ label, count, total, color }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{count}</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
