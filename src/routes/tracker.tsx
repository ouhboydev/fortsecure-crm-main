import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section, StatCard } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Phone, Users, Plus, History,
  Calendar as CalendarIcon, CheckCircle2, TrendingUp,
  PhoneCall, MapPin, Search,
  Clock, Target,
  Loader2, ChevronRight,
  Trash2,
  User as UserIcon, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tracker")({
  head: () => ({ meta: [{ title: "Tracker — FortSecure" }] }),
  component: () => <AppShell><Tracker /></AppShell>,
});

function Tracker() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [logType, setLogType] = useState<'call' | 'visit' | 'meeting'>('call');
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [outcome, setOutcome] = useState("");
  const [relatedOpportunity, setRelatedOpportunity] = useState("");
  
  const [opps, setOpps] = useState<any[]>([]);

  useEffect(() => {
    async function loadOpps() {
      if (!user) return;
      const { data } = await supabase.from("opportunities").select("id, title").eq("owner_id", user.id);
      setOpps(data || []);
    }
    loadOpps();
  }, [user]);

  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activities")
        .select(`*, opportunities(title)`)
        .order("due_date", { ascending: false });

      if (error) throw error;
      setActivities(data ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: user.id,
        title: `${logType === 'call' ? 'Call' : logType === 'meeting' ? 'Reunião' : 'Visita'}: ${clientName}`,
        type: logType === 'call' ? 'ligacao' : 'reuniao',
        due_date: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        description: description,
        status: 'concluida',
        opportunity_id: relatedOpportunity || null,
        metadata: {
          priority,
          outcome,
          log_subtype: logType
        }
      };
      if (editingId) {
        await supabase.from("activities").update(payload as any).eq("id", editingId);
        toast.success("Atualizado");
      } else {
        await supabase.from("activities").insert(payload as any);
        toast.success("Registrado");
      }
      setIsModalOpen(false); setEditingId(null); setClientName(""); setDescription(""); setScheduledTime(""); setOutcome(""); setRelatedOpportunity("");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setLogType(a.metadata?.log_subtype || 'call');
    setClientName(a.title.split(': ')[1] || a.title);
    setDescription(a.description || "");
    setScheduledTime(new Date(a.due_date).toISOString().slice(0, 16));
    setPriority(a.metadata?.priority || 'media');
    setOutcome(a.metadata?.outcome || "");
    setRelatedOpportunity(a.opportunity_id || "");
    setIsModalOpen(true);
  };

  const filtered = activities.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-[1600px] mx-auto pb-20">
      <PageHeader 
        title="Tracker de Atividades" 
        subtitle="Registro tático de interações e prospecção em tempo real."
        actions={
           <div className="flex items-center gap-3">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                 <Input 
                    placeholder="Filtrar logs..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 w-48 bg-card border-border text-xs"
                 />
              </div>
              <Button onClick={() => { setLogType('call'); setEditingId(null); setIsModalOpen(true); }} className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-xs rounded-md shadow-sm">
                 <Plus className="h-3.5 w-3.5 mr-2" /> Novo Registro
              </Button>
           </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard label="Total de Logs" value={activities.length} icon={<History className="h-4 w-4" />} />
         <StatCard label="Ligações" value={activities.filter(a => a.type === 'ligacao').length} accent="info" icon={<PhoneCall className="h-4 w-4" />} />
         <StatCard label="Reuniões / Visitas" value={activities.filter(a => a.type === 'reuniao').length} accent="primary" icon={<MapPin className="h-4 w-4" />} />
         <StatCard label="Taxa de Conversão" value={activities.length > 0 ? `${Math.round((activities.filter(a => a.metadata?.outcome && a.metadata.outcome.length > 0).length / activities.length) * 100)}%` : "—"} accent="success" icon={<Target className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-4">
            <Section title="Histórico Operacional">
               {loading ? (
                  <div className="py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#3ecf8e]" /></div>
               ) : filtered.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-widest font-medium">Nenhum registro encontrado</div>
               ) : (
                  <div className="space-y-3 pt-2">
                     {filtered.map((a) => (
                        <div key={a.id} onClick={() => openEdit(a)} className="group flex items-center justify-between p-4 bg-background border border-border rounded-md hover:border-[#3ecf8e]/50 cursor-pointer transition-all shadow-sm">
                           <div className="flex items-center gap-4 min-w-0">
                              <div className={cn(
                                 "h-10 w-10 rounded flex items-center justify-center shrink-0",
                                 a.type === 'ligacao' ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-[#1eaedb]/10 text-[#1eaedb]"
                              )}>
                                 {a.type === 'ligacao' ? <PhoneCall className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                 <h4 className="text-sm font-semibold truncate group-hover:text-[#3ecf8e] transition-colors">{a.title}</h4>
                                 <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><CalendarIcon className="h-2.5 w-2.5" /> {new Date(a.due_date).toLocaleDateString('pt-BR')}</span>
                                    {a.opportunities?.title && <span className="text-[10px] text-[#3ecf8e] font-bold uppercase tracking-wider truncate">#{a.opportunities.title}</span>}
                                 </div>
                              </div>
                           </div>
                           <Badge variant="outline" className="text-[9px] border-border bg-muted/50 uppercase tracking-wider">{a.metadata?.outcome || "Finalizado"}</Badge>
                        </div>
                     ))}
                  </div>
               )}
            </Section>
         </div>

         <div className="space-y-6">
            <Section title="Mix de Atividade">
               <div className="space-y-6 pt-4">
                  <ActivityMetric label="Ligações" count={activities.filter(a => a.type === 'ligacao').length} total={activities.length} color="#3ecf8e" />
                  <ActivityMetric label="Visitas/Reuniões" count={activities.filter(a => a.type === 'reuniao').length} total={activities.length} color="#1eaedb" />
               </div>
            </Section>
            <Card className="bg-card border border-border rounded-lg overflow-hidden">
               <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2"><CalendarIcon className="h-3 w-3 text-[#3ecf8e]" /> Próximas Reuniões</h4>
               </div>
               <div className="p-4 space-y-2">
                  {activities
                     .filter(a => (a.metadata?.log_subtype === 'meeting' || a.metadata?.log_subtype === 'visit') && new Date(a.due_date) >= new Date(new Date().setHours(0,0,0,0)))
                     .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                     .slice(0, 4)
                     .map(a => {
                        const isVisit = a.metadata?.log_subtype === 'visit';
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
                              <Badge variant="outline" className={cn("text-[9px] shrink-0", isVisit ? "border-[#1eaedb]/30 text-[#1eaedb]" : "border-[#f59e0b]/30 text-[#f59e0b]")}>{isVisit ? "Visita" : "Reunião"}</Badge>
                           </div>
                        );
                     })}
                  {activities.filter(a => (a.metadata?.log_subtype === 'meeting' || a.metadata?.log_subtype === 'visit') && new Date(a.due_date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
                     <p className="text-xs text-muted-foreground text-center py-4">Nenhuma reunião ou visita agendada.</p>
                  )}
               </div>
            </Card>
         </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden rounded-xl">
           <DialogHeader className="p-6 border-b border-border bg-muted/50">
              <DialogTitle className="text-lg font-semibold">Registrar Atividade</DialogTitle>
              <DialogDescription className="text-xs">Registre os detalhes da sua interação comercial.</DialogDescription>
           </DialogHeader>

           <div className="p-6">
              <form onSubmit={saveActivity} className="space-y-6">
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
                       <Select value={priority} onValueChange={(v:any) => setPriority(v)}>
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
                    <Input required value={clientName} onChange={e => setClientName(e.target.value)} className="h-9 bg-background border-border text-sm" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-medium text-muted-foreground">Data e Hora</Label>
                       <Input type="datetime-local" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="h-9 bg-background border-border text-xs" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-medium text-muted-foreground">Negócio Relacionado</Label>
                       <Select value={relatedOpportunity} onValueChange={setRelatedOpportunity}>
                          <SelectTrigger className="h-9 bg-background border-border text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                          <SelectContent className="bg-card border-border">
                             {opps.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Desfecho / Resultado</Label>
                    <Input placeholder="Ex: Proposta enviada..." value={outcome} onChange={e => setOutcome(e.target.value)} className="h-9 bg-background border-border text-sm" />
                 </div>

                 <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Notas e Observações</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-background border-border text-sm min-h-[80px]" />
                 </div>

                 <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs">Cancelar</Button>
                    <Button type="submit" disabled={busy} className="bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-xs px-6">
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

