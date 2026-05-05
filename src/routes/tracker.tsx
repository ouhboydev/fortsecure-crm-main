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
  
  // Specific fields
  const [callType, setCallType] = useState("follow-up");
  const [callDuration, setCallDuration] = useState("");
  const [visitLocation, setVisitLocation] = useState("");
  const [visitContact, setVisitContact] = useState("");
  const [visitObjective, setVisitObjective] = useState("demonstracao");
  
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
          outcome,
          // Call specific
          ...(logType === 'call' ? {
            call_type: callType,
            duration: callDuration
          } : {
            // Visit specific
            location: visitLocation,
            contact_person: visitContact,
            objective: visitObjective
          })
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
    
    // Specific fields
    setCallType(a.metadata?.call_type || "follow-up");
    setCallDuration(a.metadata?.duration || "");
    setVisitLocation(a.metadata?.location || "");
    setVisitContact(a.metadata?.contact_person || "");
    setVisitObjective(a.metadata?.objective || "demonstracao");
    
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

  // Real Stats Calculation
  const getTrend = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = activities.filter(a => new Date(a.due_date) >= oneWeekAgo).length;
    const lastWeek = activities.filter(a => {
      const d = new Date(a.due_date);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    }).length;

    if (lastWeek === 0) return thisWeek > 0 ? `+${thisWeek * 100}%` : "0%";
    const diff = ((thisWeek - lastWeek) / lastWeek) * 100;
    return `${diff >= 0 ? '+' : ''}${Math.round(diff)}% vs last week`;
  };

  const getProductivity = () => {
    const count = activities.length;
    if (count > 50) return { label: "Elite", trend: "Top 1%" };
    if (count > 20) return { label: "Avançado", trend: "Top 15%" };
    if (count > 5) return { label: "Operacional", trend: "Top 50%" };
    return { label: "Iniciante", trend: "Em Treino" };
  };

  const prod = getProductivity();

  const getDailyRhythm = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const todayCount = activities.filter(a => new Date(a.due_date).toLocaleDateString('pt-BR') === today).length;
    
    if (todayCount === 0) return "Silencioso";
    if (todayCount < 3) return "Em Aquecimento";
    if (todayCount < 6) return "Operacional";
    if (todayCount < 10) return "Alta Performance";
    return "Nível Elite";
  };

  const getTacticalInsight = () => {
    const count = activities.length;
    if (count === 0) return "Nenhum dado operacional detectado. Registre sua primeira atividade para iniciar a análise de inteligência.";
    if (count < 10) return "Volume de dados insuficiente para projeção estatística. Continue registrando interações para gerar insights.";
    
    const visits = activities.filter(a => a.type === 'reuniao').length;
    const calls = activities.filter(a => a.type === 'ligacao').length;
    
    if (visits > calls) return "Sua estratégia está focada em fechamento presencial. Mantenha o ritmo de visitas para acelerar o pipeline.";
    return "Alto volume de prospecção via call detectado. Foque em converter essas chamadas em visitas técnicas para aumentar o win-rate.";
  };

  return (
    <div className="p-8 md:p-12 lg:p-20 space-y-16 max-w-[1600px] mx-auto min-h-screen pb-40 relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full -mr-32 -mt-32" />
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[150px] rounded-full -ml-32 -mb-32" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <PageHeader 
          title="Performance Tracker" 
          subtitle="Rastreamento tático de interações e produtividade em tempo real"
        />
        <div className="flex gap-4 w-full md:w-auto">
          <Button 
            onClick={() => { setLogType('call'); setEditingId(null); setIsModalOpen(true); }}
            className="flex-1 md:flex-none h-14 px-8 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.05] active:scale-[0.95] transition-all shadow-xl shadow-primary/20 gap-3"
          >
            <Phone className="h-4 w-4" /> Registrar Call
          </Button>
          <Button 
            onClick={() => { setLogType('visit'); setEditingId(null); setIsModalOpen(true); }}
            className="flex-1 md:flex-none h-14 px-8 bg-secondary/50 border border-border text-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-secondary transition-all gap-3"
          >
            <MapPin className="h-4 w-4 text-primary" /> Marcar Visita
          </Button>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <StatCard label="Total de Interações" value={activities.length} icon={<History />} trend={getTrend()} />
         <StatCard label="Ligações Realizadas" value={activities.filter(a => a.type === 'ligacao').length} icon={<PhoneCall />} />
         <StatCard label="Visitas Técnicas" value={activities.filter(a => a.type === 'reuniao').length} icon={<MapPin />} />
         <StatCard label="Produtividade" value={prod.label} icon={<Zap className="text-primary" />} trend={prod.trend} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* Left Side: Feed & Search */}
         <div className="lg:col-span-8 space-y-8">
            <div className="relative group max-w-2xl">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-all" />
               <Input 
                 placeholder="Filtrar logs operacionais por cliente ou descrição..." 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="h-14 pl-14 pr-6 bg-card/30 backdrop-blur-xl border-border/50 rounded-2xl text-xs focus:ring-primary/20 transition-all outline-none"
               />
            </div>

            <div className="space-y-4">
               {loading ? (
                  <div className="py-40 text-center space-y-6">
                     <Loader2 className="h-10 w-10 animate-spin text-primary/40 mx-auto" />
                     <div className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.5em]">Sincronizando Logs...</div>
                  </div>
               ) : filtered.length === 0 ? (
                  <div className="py-40 text-center bg-card/20 border-2 border-dashed border-border rounded-[40px] space-y-8">
                     <div className="h-24 w-24 bg-background border border-border rounded-3xl flex items-center justify-center mx-auto opacity-10">
                        <History className="h-10 w-10" />
                     </div>
                     <div className="text-[11px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">Nenhum registro encontrado.</div>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-4">
                     {filtered.map((a, i) => (
                        <motion.div 
                          key={a.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Card className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 group hover:border-primary/40 transition-all shadow-lg overflow-hidden relative">
                             <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-6">
                                   <div className={cn(
                                      "h-14 w-14 rounded-2xl border border-border flex items-center justify-center transition-all group-hover:rotate-12 shadow-inner",
                                      a.type === 'ligacao' ? "text-primary bg-primary/5" : "text-blue-500 bg-blue-500/5"
                                   )}>
                                      {a.type === 'ligacao' ? <PhoneCall className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
                                   </div>
                                   <div className="space-y-1">
                                      <div className="flex items-center gap-3">
                                         <h4 className="text-lg font-black text-foreground uppercase tracking-tight italic group-hover:text-primary transition-colors leading-none">{a.title}</h4>
                                         <Badge className={cn(
                                           "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                           a.metadata?.priority === 'alta' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-secondary text-muted-foreground"
                                         )}>
                                            {a.metadata?.priority || 'Média'}
                                         </Badge>
                                      </div>
                                      <div className="flex items-center gap-4">
                                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                            <Calendar className="h-3 w-3" /> {new Date(a.due_date).toLocaleDateString('pt-BR')}
                                         </div>
                                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                                            <Clock className="h-3 w-3" /> {new Date(a.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                         </div>
                                         {a.opportunities?.title && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-primary/80 uppercase tracking-widest">
                                               <Target className="h-3 w-3" /> {a.opportunities.title}
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="hidden md:block text-right pr-6 border-r border-border/50">
                                      <div className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Resultado</div>
                                      <div className="text-[11px] font-bold text-primary truncate max-w-[150px] italic">{a.metadata?.outcome || "Pendente"}</div>
                                   </div>
                                   <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)} className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"><Edit3 className="h-4 w-4" /></Button>
                                      <Button variant="ghost" size="icon" onClick={() => deleteActivity(a.id)} className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"><Trash2 className="h-4 w-4" /></Button>
                                   </div>
                                </div>
                             </div>
                             {a.description && (
                               <div className="mt-4 pt-4 border-t border-border/20">
                                 <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-1">{a.description}</p>
                               </div>
                             )}
                          </Card>
                        </motion.div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Right Side: Insights & Frequency */}
         <div className="lg:col-span-4 space-y-6">
            <Card className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[32px] p-8 space-y-8 shadow-xl">
               <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-[11px] font-black text-foreground uppercase tracking-[0.4em]">Análise de Esforço</h3>
               </div>
               
               <div className="space-y-8">
                  <TypeFreq label="Ligações" count={activities.filter(a => a.type === 'ligacao').length} total={activities.length} color="bg-primary" icon={<Phone className="h-3 w-3" />} />
                  <TypeFreq label="Visitas" count={activities.filter(a => a.type === 'reuniao').length} total={activities.length} color="bg-blue-500" icon={<MapPin className="h-3 w-3" />} />
               </div>

               <div className="pt-6 border-t border-border/30">
                  <div className="flex justify-between items-center bg-secondary/30 rounded-2xl p-4 border border-border/50">
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Ritmo Diário</div>
                      <div className="text-sm font-black italic text-foreground uppercase">{getDailyRhythm()}</div>
                    </div>
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
               </div>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-[32px] p-8 space-y-6 shadow-xl relative overflow-hidden group">
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-150 transition-transform duration-1000">
                  <Target className="h-32 w-32" />
               </div>
               <div className="relative z-10 space-y-4">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Insights Táticos</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{getTacticalInsight()}"</p>
               </div>
            </Card>
         </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background/95 backdrop-blur-2xl border border-border/50 rounded-[40px] p-0 overflow-hidden max-w-3xl shadow-[0_0_120px_rgba(0,0,0,0.6)] border-none max-h-[90vh] flex flex-col">
          <div className="flex flex-1 flex-col md:flex-row overflow-hidden min-h-0">
            <div className="w-full md:w-[280px] bg-secondary/30 border-r border-border/50 p-10 flex flex-col justify-between relative overflow-hidden hidden md:flex">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/5" />
               <div className="relative z-10 space-y-10">
                  <div className="h-20 w-20 bg-background border border-border rounded-[24px] flex items-center justify-center text-primary shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    {logType === 'call' ? <Phone className="h-10 w-10" /> : <MapPin className="h-10 w-10" />}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-black tracking-tighter uppercase italic text-foreground leading-none">
                       {logType === 'call' ? 'Call' : 'Visita'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-6 bg-primary rounded-full" />
                      <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.4em]">Log Operacional</p>
                    </div>
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

            <div className="flex-1 p-10 md:p-14 overflow-y-auto relative bg-transparent scrollbar-thin scrollbar-thumb-primary/10">
              <form onSubmit={saveActivity} className="space-y-10">
                <div className="space-y-8">
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="h-1 w-8 bg-primary/30 rounded-full" />
                        <h4 className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Dados Principais</h4>
                     </div>
                     <div className="space-y-3">
                       <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Identificação do Cliente / Empresa</Label>
                       <div className="relative group">
                         <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                         <Input 
                           required 
                           placeholder="Ex: FortSecure Corp..." 
                           value={clientName} 
                           onChange={e => setClientName(e.target.value)} 
                           className="h-14 pl-14 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                         />
                       </div>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Data & Hora</Label>
                        <Input 
                          type="datetime-local" 
                          value={scheduledTime} 
                          onChange={e => setScheduledTime(e.target.value)} 
                          className="h-14 px-6 bg-secondary/40 border-border rounded-2xl text-[13px] text-foreground focus:ring-primary/20 transition-all outline-none" 
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Prioridade</Label>
                        <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                          <SelectTrigger className="h-14 bg-secondary/40 border-border rounded-2xl text-[10px] font-black uppercase tracking-widest px-6">
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
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Negócio Vinculado</Label>
                      <Select value={relatedOpportunity} onValueChange={setRelatedOpportunity}>
                        <SelectTrigger className="h-14 bg-secondary/40 border-border rounded-2xl text-[10px] font-black uppercase tracking-widest px-6">
                          <SelectValue placeholder="SELECIONE UMA OPORTUNIDADE (OPCIONAL)" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {opps.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="space-y-8">
                   {logType === 'call' ? (
                     <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Tipo de Chamada</Label>
                          <Select value={callType} onValueChange={setCallType}>
                            <SelectTrigger className="h-14 bg-secondary/40 border-border rounded-2xl text-[10px] font-black uppercase tracking-widest px-6">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="cold-call">Cold Call</SelectItem>
                              <SelectItem value="follow-up">Follow-up</SelectItem>
                              <SelectItem value="apresentacao">Apresentação</SelectItem>
                              <SelectItem value="fechamento">Fechamento</SelectItem>
                              <SelectItem value="suporte">Suporte Tático</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Duração (Minutos)</Label>
                          <Input 
                            type="number"
                            placeholder="Ex: 15" 
                            value={callDuration} 
                            onChange={e => setCallDuration(e.target.value)} 
                            className="h-14 px-6 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                          />
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-8 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Local da Visita</Label>
                            <Input 
                              placeholder="Ex: Escritório Central" 
                              value={visitLocation} 
                              onChange={e => setVisitLocation(e.target.value)} 
                              className="h-14 px-6 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Interlocutor</Label>
                            <Input 
                              placeholder="Nome do contato..." 
                              value={visitContact} 
                              onChange={e => setVisitContact(e.target.value)} 
                              className="h-14 px-6 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Objetivo Estratégico</Label>
                          <Select value={visitObjective} onValueChange={setVisitObjective}>
                            <SelectTrigger className="h-14 bg-secondary/40 border-border rounded-2xl text-[10px] font-black uppercase tracking-widest px-6">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              <SelectItem value="prospeccao">Prospecção de Campo</SelectItem>
                              <SelectItem value="demonstracao">Demonstração Técnica</SelectItem>
                              <SelectItem value="entrega">Entrega / Kick-off</SelectItem>
                              <SelectItem value="cortesia">Visita de Cortesia</SelectItem>
                              <SelectItem value="reuniao-diretoria">Reunião de Diretoria</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                     </div>
                   )}

                   <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Desfecho / Resultado</Label>
                      <Input 
                        placeholder="Ex: Proposta enviada, follow-up agendado..." 
                        value={outcome} 
                        onChange={e => setOutcome(e.target.value)} 
                        className="h-14 px-6 bg-secondary/40 border-border rounded-2xl text-sm text-foreground focus:ring-primary/20 transition-all outline-none" 
                      />
                   </div>

                   <div className="space-y-3 pb-4">
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 ml-1">Resumo Executivo & Notas</Label>
                     <Textarea 
                       placeholder="Detalhes técnicos, objeções e próximos passos..." 
                       value={description} 
                       onChange={e => setDescription(e.target.value)} 
                       className="bg-secondary/40 border-border rounded-3xl p-6 text-sm text-foreground min-h-[140px] focus:ring-primary/20 outline-none transition-all resize-none shadow-inner" 
                     />
                   </div>
                </div>

                <div className="sticky bottom-0 pt-8 pb-4 bg-gradient-to-t from-background via-background to-transparent flex gap-4 mt-12 z-20">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 py-7 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] hover:bg-secondary/50 transition-all text-muted-foreground/40">Abortar</Button>
                  <Button 
                    type="submit" 
                    disabled={busy || !clientName}
                    className="flex-[2.5] py-7 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 gap-3"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : editingId ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    Finalizar Registro Tático
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

function TypeFreq({ label, count, total, color, icon }: any) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
            <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center text-white shadow-sm", color)}>{icon}</div>
            <span className="text-[10px] font-black text-foreground uppercase tracking-tight italic">{label}</span>
          </div>
          <span className="text-xs font-mono font-bold text-foreground/40">{count}</span>
       </div>
       <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden shadow-inner border border-border/20">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className={cn("h-full shadow-lg", color)}
          />
       </div>
    </div>
  );
}
