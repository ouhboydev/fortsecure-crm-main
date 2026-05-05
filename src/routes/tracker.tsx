import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Phone, Users, Plus, History,
  Calendar, CheckCircle2, TrendingUp,
  PhoneCall, MapPin, Search, Filter,
  Clock, ArrowUpRight, Target, X,
  Loader2, Sparkles, ChevronRight, Zap,
  MousePointerClick, Trash2, Edit3,
  BarChart2, RefreshCw, Download,
  User as UserIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/tracker")({
  head: () => ({ meta: [{ title: "Performance Tracker — FortSecure" }] }),
  component: () => <AppShell><Tracker /></AppShell>,
});

function Tracker() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [logType, setLogType] = useState<'call' | 'visit'>('call');
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

  // Filter states
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          opportunities(title)
        `)
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
        title: `${logType === 'call' ? 'Call' : 'Visita'}: ${clientName}`,
        type: logType === 'call' ? 'ligacao' : 'reuniao',
        due_date: scheduledTime ? new Date(scheduledTime).toISOString() : new Date().toISOString(),
        description: description,
        status: 'concluida',
        opportunity_id: relatedOpportunity || null,
        metadata: {
          priority,
          outcome
        }
      };
      if (editingId) {
        await supabase.from("activities").update(payload as any).eq("id", editingId);
        toast.success("Registro atualizado");
      } else {
        await supabase.from("activities").insert(payload as any);
        toast.success("Atividade registrada");
      }
      setIsModalOpen(false); 
      setEditingId(null); 
      setClientName(""); 
      setDescription("");
      setScheduledTime("");
      setOutcome("");
      setRelatedOpportunity("");
      load();
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setBusy(false); 
    }
  }

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setLogType(a.type === 'ligacao' ? 'call' : 'visit');
    setClientName(a.title.split(': ')[1] || a.title);
    setDescription(a.description || "");
    setScheduledTime(new Date(a.due_date).toISOString().slice(0, 16));
    setPriority(a.metadata?.priority || 'media');
    setOutcome(a.metadata?.outcome || "");
    setRelatedOpportunity(a.opportunity_id || "");
    setIsModalOpen(true);
  };

  const deleteActivity = async (id: string) => {
    if (!confirm("Excluir este registro permanentemente?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Registro removido");
      load();
    }
  };

  const filtered = activities.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    a.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 md:p-12 lg:p-20 space-y-16 max-w-[1600px] mx-auto min-h-screen pb-40 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full -mr-32 -mt-32" />
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[150px] rounded-full -ml-32 -mb-32" />
      </div>

      <PageHeader 
        title="Performance Tracker" 
        subtitle="Rastreamento tático de interações e produtividade em tempo real"
      />

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         <StatCard label="Total de Interações" value={activities.length} icon={<History />} trend="+12% vs last week" />
         <StatCard label="Ligações Realizadas" value={activities.filter(a => a.type === 'ligacao').length} icon={<PhoneCall />} />
         <StatCard label="Visitas Técnicas" value={activities.filter(a => a.type === 'reuniao').length} icon={<MapPin />} />
         <StatCard label="Produtividade" value="Elite" icon={<Zap className="text-primary" />} trend="Top 1%" />
      </div>

      {/* Control Center */}
      <div className="flex flex-col lg:flex-row gap-10">
         <div className="flex-1 space-y-10">
            <div className="flex items-center justify-between gap-6">
               <div className="relative flex-1 group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-all" />
                  <Input 
                    placeholder="Filtrar logs operacionais..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-16 pl-14 pr-6 bg-card/40 backdrop-blur-md border-border rounded-2xl text-sm focus:ring-primary/20 transition-all outline-none"
                  />
               </div>
               <div className="flex gap-4">
                  <Button 
                    onClick={() => { setLogType('call'); setEditingId(null); setIsModalOpen(true); }}
                    className="h-16 px-8 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/10 gap-3"
                  >
                    <Phone className="h-4 w-4" /> Registrar Call
                  </Button>
                  <Button 
                    onClick={() => { setLogType('visit'); setEditingId(null); setIsModalOpen(true); }}
                    className="h-16 px-8 bg-secondary/50 border-border text-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-secondary transition-all gap-3"
                  >
                    <MapPin className="h-4 w-4 text-primary" /> Marcar Visita
                  </Button>
               </div>
            </div>

            <div className="space-y-6">
               {loading ? (
                  <div className="py-40 text-center space-y-6">
                     <Loader2 className="h-10 w-10 animate-spin text-primary/40 mx-auto" />
                     <div className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.5em]">Recuperando Logs Táticos...</div>
                  </div>
               ) : filtered.length === 0 ? (
                  <div className="py-40 text-center bg-card/20 border-2 border-dashed border-border rounded-[40px] space-y-8">
                     <div className="h-24 w-24 bg-background border border-border rounded-3xl flex items-center justify-center mx-auto opacity-10">
                        <History className="h-10 w-10" />
                     </div>
                     <div className="text-[11px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">Silêncio operacional total no setor.</div>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-6">
                     {filtered.map((a, i) => (
                        <motion.div 
                          key={a.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Card className="bg-card/40 backdrop-blur-md border-border rounded-[32px] p-8 group hover:border-primary/30 transition-all shadow-xl overflow-hidden relative border-none">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-start gap-8">
                                   <div className={cn(
                                      "h-16 w-16 rounded-2xl border border-border flex items-center justify-center transition-all group-hover:scale-110 shadow-inner",
                                      a.type === 'ligacao' ? "text-primary bg-primary/5" : "text-blue-500 bg-blue-500/5"
                                   )}>
                                      {a.type === 'ligacao' ? <PhoneCall className="h-7 w-7" /> : <MapPin className="h-7 w-7" />}
                                   </div>
                                   <div className="space-y-3">
                                      <div className="flex items-center gap-4">
                                         <h4 className="text-xl font-black text-foreground uppercase tracking-tight italic group-hover:text-primary transition-colors leading-none">{a.title}</h4>
                                         <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-secondary/50 border-border px-3 py-1 rounded-full">
                                            {a.metadata?.priority || 'Média'}
                                         </Badge>
                                      </div>
                                      <div className="flex items-center gap-6">
                                         <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                            <Calendar className="h-3 w-3" /> {new Date(a.due_date).toLocaleDateString('pt-BR')}
                                         </div>
                                         <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" /> {new Date(a.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                         </div>
                                         {a.opportunities?.title && (
                                            <div className="flex items-center gap-2 text-[10px] font-black text-primary/60 uppercase tracking-widest">
                                               <Target className="h-3 w-3" /> {a.opportunities.title}
                                            </div>
                                         )}
                                      </div>
                                      {a.description && <p className="text-[11px] text-muted-foreground leading-relaxed font-medium mt-4 line-clamp-2 max-w-2xl">{a.description}</p>}
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                   <Button variant="ghost" size="icon" onClick={() => openEdit(a)} className="h-12 w-12 rounded-xl bg-secondary/50 border border-border hover:text-primary"><Edit3 className="h-4 w-4" /></Button>
                                   <Button variant="ghost" size="icon" onClick={() => deleteActivity(a.id)} className="h-12 w-12 rounded-xl bg-secondary/50 border border-border hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                             </div>
                          </Card>
                        </motion.div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Sidebar Stats */}
         <div className="w-full lg:w-[400px] space-y-10">
            <Card className="bg-primary/5 border border-primary/10 rounded-[40px] p-10 space-y-8 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 text-primary/5 group-hover:scale-125 transition-all duration-1000"><Zap className="h-40 w-40" /></div>
               <div className="relative z-10 space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center shadow-xl">
                    <TrendingUp className="h-7 w-7 text-primary" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-3xl font-black italic text-foreground uppercase tracking-tighter">Detalhes da Atividade</h3>
                     <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest leading-relaxed">Seu ritmo operacional está 15% acima da média do setor Delta.</p>
                  </div>
                  <div className="pt-6 border-t border-primary/10">
                     <Button className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl gap-3">
                        Ver Analítica Completa <ChevronRight className="h-4 w-4" />
                     </Button>
                  </div>
               </div>
            </Card>

            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] p-10 space-y-10 shadow-xl border-none">
               <h3 className="text-[11px] font-black text-muted-foreground/30 uppercase tracking-[0.4em]">Frequência por Tipo</h3>
               <div className="space-y-8">
                  <TypeFreq label="Ligações" count={activities.filter(a => a.type === 'ligacao').length} total={activities.length} color="bg-primary" />
                  <TypeFreq label="Visitas" count={activities.filter(a => a.type === 'reuniao').length} total={activities.length} color="bg-blue-500" />
               </div>
            </Card>
         </div>
      </div>

      {/* Registration Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border/50 rounded-[48px] p-0 overflow-hidden max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border-none">
          <div className="flex h-[800px]">
            {/* Left Decor Side */}
            <div className="w-[30%] bg-secondary/30 border-r border-border/50 p-12 flex flex-col justify-between relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent" />
               <div className="relative z-10 space-y-8">
                  <div className="h-16 w-16 bg-background border border-border rounded-2xl flex items-center justify-center text-primary shadow-xl">
                    {logType === 'call' ? <Phone className="h-7 w-7" /> : <MapPin className="h-7 w-7" />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tighter uppercase italic text-foreground leading-none">
                       {logType === 'call' ? 'Call' : 'Visita'}
                    </h3>
                    <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-[0.3em] leading-relaxed">Novo Registro</p>
                  </div>
               </div>

               <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="h-1 w-8 bg-primary rounded-full" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 italic">Audit Active</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground/20 leading-relaxed uppercase font-bold tracking-widest">Todos os dados inseridos são criptografados e registrados no log de auditoria do Comando HQ.</p>
               </div>
            </div>

            {/* Right Form Side */}
            <div className="flex-1 p-12 overflow-y-auto no-scrollbar bg-card/20 backdrop-blur-3xl relative">
              <div className="absolute top-0 right-0 p-8">
              </div>

              <form onSubmit={saveActivity} className="space-y-10 pt-4">
                <div className="space-y-6">
                   <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Identificação do Ativo</Label>
                     <div className="relative group">
                       <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                       <Input 
                         required 
                         placeholder="Nome do cliente ou empresa..." 
                         value={clientName} 
                         onChange={e => setClientName(e.target.value)} 
                         className="h-16 pl-14 bg-secondary/50 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Data da Operação</Label>
                        <Input 
                          type="datetime-local" 
                          value={scheduledTime} 
                          onChange={e => setScheduledTime(e.target.value)} 
                          className="h-16 px-6 bg-secondary/50 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Prioridade Estratégica</Label>
                        <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                          <SelectTrigger className="h-16 bg-secondary/50 border-border rounded-2xl text-xs font-bold uppercase tracking-widest px-6">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta (Crítica)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Oportunidade Vinculada</Label>
                      <Select value={relatedOpportunity} onValueChange={setRelatedOpportunity}>
                        <SelectTrigger className="h-16 bg-secondary/50 border-border rounded-2xl text-xs font-bold uppercase tracking-widest px-6">
                          <SelectValue placeholder="Selecione um negócio (Opcional)" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {opps.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Desfecho / Resultado</Label>
                      <Input 
                        placeholder="Ex: Proposta enviada, follow-up agendado..." 
                        value={outcome} 
                        onChange={e => setOutcome(e.target.value)} 
                        className="h-16 px-6 bg-secondary/50 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                      />
                   </div>

                   <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Resumo Executivo (Notas)</Label>
                     <Textarea 
                       placeholder="Detalhes técnicos, objeções e próximos passos..." 
                       value={description} 
                       onChange={e => setDescription(e.target.value)} 
                       className="bg-secondary/50 border-border rounded-3xl p-6 text-sm text-foreground min-h-[160px] focus:ring-primary/20 outline-none transition-all resize-none shadow-inner" 
                     />
                   </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 py-8 rounded-2xl border-border font-black uppercase tracking-widest text-[11px] hover:bg-secondary/50 transition-all text-muted-foreground/40">Abortar</Button>
                  <Button 
                    type="submit" 
                    disabled={busy || !clientName}
                    className="flex-[2] py-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-emerald-500/20 gap-3"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : editingId ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    Confirmar Registro Operacional
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon, trend }: any) {
  return (
    <Card className="bg-card/40 backdrop-blur-md rounded-3xl border-border hover:border-primary/20 transition-all group shadow-xl relative overflow-hidden border-none">
       <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
       <CardContent className="p-8">
          <div className="flex justify-between items-start mb-6">
             <div className="h-12 w-12 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-all group-hover:border-primary/30 shadow-inner">{icon}</div>
             {trend && <Badge variant="outline" className="text-[9px] font-black text-primary uppercase tracking-widest bg-emerald-500/5 px-3 py-1 rounded-full border-emerald-500/10 shadow-sm">{trend}</Badge>}
          </div>
          <div className="text-4xl font-black font-mono text-foreground mb-1 tracking-tighter">{value}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">{label}</div>
       </CardContent>
    </Card>
  );
}

function TypeFreq({ label, count, total, color }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-end">
          <span className="text-[10px] font-black text-foreground uppercase tracking-tight italic">{label}</span>
          <span className="text-xs font-mono font-bold text-foreground/40">{count}</span>
       </div>
       <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className={cn("h-full shadow-lg", color)}
          />
       </div>
    </div>
  );
}
