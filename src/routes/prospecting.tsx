import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, Calendar, Target, User, Activity, MoreHorizontal, ArrowRight, CheckCircle2, Plus, Edit, PhoneCall, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/prospecting")({
  head: () => ({ meta: [{ title: "Prospecção — FortSecure" }] }),
  component: () => <AppShell><ProspectingPage /></AppShell>,
});

function ProspectingPage() {
  const { user, isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [prospects, setProspects] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ 
    client_name: "",
    logCall: false,
    callOutcome: "Conectada",
    callNotes: "",
    scheduleNextStep: false,
    nextStepTitle: "",
    nextStepDate: ""
  });
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const [activeProspect, setActiveProspect] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callForm, setCallForm] = useState({ outcome: "Conectada", notes: "", nextStepTitle: "", nextStepDate: "" });

  useEffect(() => {
    if (isModalOpen) loadCustomers();
  }, [isModalOpen]);

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setExistingCustomers(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (user) {
      if (isAdmin || isManager) {
        loadSellers();
      } else {
        setSelectedSellerId(user.id);
      }
    }
  }, [user, isAdmin, isManager]);

  useEffect(() => {
    if (user && selectedSellerId) {
      loadProspects();
    }
  }, [user, selectedSellerId]);

  async function loadSellers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (error) throw error;
      setSellers(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function loadProspects() {
    setLoading(true);
    try {
      let query = supabase
        .from("opportunities")
        .select(`
          id, 
          client_name, 
          title, 
          created_at,
          activities (
            id, type, status, outcome, sentiment, next_action_type, next_action_title, next_action_due, created_at
          )
        `)
        .eq("stage", "prospect")
        .order("created_at", { ascending: false });

      if (selectedSellerId !== "all") {
        query = query.eq("owner_id", selectedSellerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProspects(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar prospecções.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let finalCustomerId = null;
      let finalClientName = "";
      const ownerId = selectedSellerId !== "all" ? selectedSellerId : user.id;

      if (customerMode === "new") {
        // Create new customer
        if (!form.client_name) throw new Error("Nome do cliente é obrigatório");
        
        // As types don't officially enforce "customers", type coercion
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers" as any)
          .insert({ name: form.client_name, owner_id: ownerId })
          .select()
          .single();
          
        if (customerError) throw customerError;
        finalCustomerId = newCustomer.id;
        finalClientName = newCustomer.name;
      } else {
        // Use existing
        if (!selectedCustomerId) {
          toast.error("Selecione um cliente existente.");
          setBusy(false);
          return;
        }
        finalCustomerId = selectedCustomerId;
        const cust = existingCustomers.find(c => c.id === selectedCustomerId);
        finalClientName = cust ? cust.name : "Cliente Existente";
      }

      const payload = {
        client_name: finalClientName,
        customer_id: finalCustomerId,
        title: `Prospecção - ${finalClientName}`,
        value: 0,
        owner_id: ownerId,
        stage: "prospect",
        probability: 10,
      };

      const { data: newOpp, error } = await supabase.from("opportunities").insert(payload).select().single();
      if (error) throw error;
      
      // Handle activity creation if requested
      if (form.logCall || form.scheduleNextStep) {
        const activityPayload: any = {
          opportunity_id: newOpp.id,
          owner_id: ownerId,
          title: form.logCall ? "Ligação Inicial de Prospecção" : "Registro de Prospecção",
          type: form.logCall ? "ligacao" : "tarefa",
          status: "concluida", // The action of logging is done
          description: form.callNotes || null,
        };

        if (form.logCall) {
          activityPayload.outcome = form.callOutcome;
        }

        if (form.scheduleNextStep && form.nextStepTitle) {
          activityPayload.next_action_title = form.nextStepTitle;
          if (form.nextStepDate) {
            activityPayload.next_action_due = new Date(form.nextStepDate).toISOString();
          }
        }

        const { error: activityError } = await supabase.from("activities").insert(activityPayload);
        if (activityError) console.error("Erro ao registrar atividade:", activityError);
      }

      toast.success("Prospecção adicionada!");
      setIsModalOpen(false);
      setForm({ 
        client_name: "", logCall: false, callOutcome: "Conectada", callNotes: "", 
        scheduleNextStep: false, nextStepTitle: "", nextStepDate: "" 
      });
      setSelectedCustomerId("");
      loadProspects();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao adicionar prospecção.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta prospecção?")) return;
    try {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
      toast.success("Excluído com sucesso!");
      loadProspects();
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.from("opportunities").update({ client_name: editName }).eq("id", activeProspect.id);
      if (error) throw error;
      toast.success("Atualizado com sucesso!");
      setEditModalOpen(false);
      loadProspects();
    } catch (err) {
      toast.error("Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCallSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const activityPayload: any = {
        opportunity_id: activeProspect.id,
        owner_id: user?.id,
        title: "Ligação",
        type: "ligacao",
        status: "concluida",
        outcome: callForm.outcome,
        description: callForm.notes || null,
      };

      if (callForm.nextStepTitle) {
        activityPayload.next_action_title = callForm.nextStepTitle;
        if (callForm.nextStepDate) {
          activityPayload.next_action_due = new Date(callForm.nextStepDate).toISOString();
        }
      }

      const { error } = await supabase.from("activities").insert(activityPayload);
      if (error) throw error;
      toast.success("Ligação registrada!");
      setCallModalOpen(false);
      loadProspects();
    } catch (err) {
      toast.error("Erro ao registrar ligação.");
    } finally {
      setBusy(false);
    }
  }

  const getCallQuantity = (activities: any[]) => {
    if (!activities) return 0;
    return activities.filter((a: any) => a.type === 'ligacao').length;
  };

  const getLastCallStatus = (activities: any[]) => {
    if (!activities) return null;
    const calls = activities.filter((a: any) => a.type === 'ligacao').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (calls.length === 0) return null;
    const lastCall = calls[0];
    return lastCall.outcome || lastCall.status;
  };

  const getNextSteps = (activities: any[]) => {
    if (!activities) return null;
    // Pega as atividades que têm um next_action definido
    const actionsWithNextSteps = activities.filter((a: any) => a.next_action_title);
    if (actionsWithNextSteps.length === 0) return null;
    // Pega a mais recente
    actionsWithNextSteps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return actionsWithNextSteps[0];
  };

  return (
    <div className="flex flex-col h-screen max-w-[1600px] mx-auto overflow-hidden bg-background">
      <div className="p-6 lg:p-8 shrink-0">
        <PageHeader
          title="Prospecção"
          subtitle="Acompanhe o status das ligações e os próximos passos para os seus prospects."
          actions={
            <div className="flex items-center gap-3">
              {(isAdmin || isManager) && (
                <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                  <SelectTrigger className="w-[250px] h-9 bg-card border-border text-xs">
                    <SelectValue placeholder="Todos os Vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Vendedores</SelectItem>
                    {sellers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={() => setIsModalOpen(true)} className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-md shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-2" /> Nova Prospecção
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : prospects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-2xl bg-card/20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum prospect encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              {selectedSellerId === "all" ? "A equipe ainda não tem oportunidades na fase de prospecção." : "Você ainda não tem oportunidades na fase de prospecção."}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="overflow-y-auto flex-1 no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-md border-b border-border">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Ligações Feitas</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status da Última Ligação</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Próximos Passos</th>
                    <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {prospects.map((p) => {
                    const callCount = getCallQuantity(p.activities);
                    const lastStatus = getLastCallStatus(p.activities);
                    const nextStep = getNextSteps(p.activities);

                    return (
                      <tr key={p.id} className="group hover:bg-primary/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                              {p.client_name[0]?.toUpperCase() || <User className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                                {p.client_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{p.title}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="secondary" className="bg-muted text-foreground border-none font-bold">
                            <Phone className="h-3 w-3 mr-1.5 opacity-70" />
                            {callCount} {callCount === 1 ? 'Ligação' : 'Ligações'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {lastStatus ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-medium text-foreground uppercase tracking-tight">{lastStatus}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Nenhuma ligação registrada</span>
                          )}
                        </td>
                        <td className="p-4">
                          {nextStep ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <ArrowRight className="h-3 w-3 text-primary" />
                                <span>{nextStep.next_action_title}</span>
                              </div>
                              {nextStep.next_action_due && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                  <Calendar className="h-2.5 w-2.5" />
                                  <span>{format(new Date(nextStep.next_action_due), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground border-dashed">
                              Definir próximos passos
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { 
                                setActiveProspect(p); 
                                setCallForm({ outcome: "Conectada", notes: "", nextStepTitle: "", nextStepDate: "" });
                                setCallModalOpen(true); 
                              }}>
                                <PhoneCall className="h-4 w-4 mr-2" /> Registrar Ligação
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { 
                                setActiveProspect(p); 
                                setEditName(p.client_name);
                                setEditModalOpen(true); 
                              }}>
                                <Edit className="h-4 w-4 mr-2" /> Editar Nome
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden rounded-2xl gap-0 max-h-[90vh]">
          <div className="flex h-full">
            {/* Left panel */}
            <div className="hidden sm:flex w-52 shrink-0 flex-col justify-between bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6">
              <div>
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-white font-bold text-lg leading-tight">Nova Prospecção</h2>
                <p className="text-white/70 text-xs mt-2 leading-relaxed">Registre um novo prospect e comece a acompanhar o pipeline comercial.</p>
              </div>
              <div className="space-y-2">
                {([{ icon: User, label: 'Vincule um cliente' }, { icon: Phone, label: 'Registre uma ligação' }, { icon: Calendar, label: 'Defina próximos passos' }] as const).map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-white/15 flex items-center justify-center shrink-0"><Icon className="h-2.5 w-2.5 text-white" /></div>
                    <span className="text-white/80 text-[10px] font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right panel */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border shrink-0">
                <p className="text-sm font-bold text-foreground">Cadastrar Prospecção</p>
                <p className="text-[11px] text-muted-foreground">Preencha os dados para iniciar o acompanhamento</p>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Step 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Cliente</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setCustomerMode('existing')}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${customerMode === 'existing' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                        <User className={`h-4 w-4 mb-1.5 ${customerMode === 'existing' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`text-[11px] font-bold ${customerMode === 'existing' ? 'text-primary' : 'text-foreground'}`}>Existente</p>
                        <p className="text-[10px] text-muted-foreground">Da base de clientes</p>
                      </button>
                      <button type="button" onClick={() => setCustomerMode('new')}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${customerMode === 'new' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                        <Plus className={`h-4 w-4 mb-1.5 ${customerMode === 'new' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`text-[11px] font-bold ${customerMode === 'new' ? 'text-primary' : 'text-foreground'}`}>Novo</p>
                        <p className="text-[10px] text-muted-foreground">Criar cadastro agora</p>
                      </button>
                    </div>
                    {customerMode === 'existing' ? (
                      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger className="h-10 bg-background border-border"><SelectValue placeholder="Escolha um cliente..." /></SelectTrigger>
                        <SelectContent>
                          {existingCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          {existingCustomers.length === 0 && <div className="p-2 text-sm text-muted-foreground italic text-center">Nenhum cliente cadastrado.</div>}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input required={customerMode === 'new'} value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className="h-10 bg-background border-border" placeholder="Ex: Acme Corp" />
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Ligação Recente</span>
                      </div>
                      <Switch id="logCall" checked={form.logCall} onCheckedChange={c => setForm({ ...form, logCall: c })} />
                    </div>
                    {form.logCall && (
                      <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Resultado da Ligação</Label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {["Conectada", "Não Atendeu", "Caixa Postal", "Número Inválido"].map(opt => (
                              <button key={opt} type="button" onClick={() => setForm({ ...form, callOutcome: opt })}
                                className={`py-2 px-3 rounded-lg text-[11px] font-semibold border transition-all ${form.callOutcome === opt ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground">Anotações</Label>
                          <Textarea value={form.callNotes} onChange={e => setForm({ ...form, callNotes: e.target.value })} className="h-16 bg-muted/30 border-border text-xs resize-none" placeholder="O que foi conversado?" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Próximos Passos</span>
                      </div>
                      <Switch id="scheduleStep" checked={form.scheduleNextStep} onCheckedChange={c => setForm({ ...form, scheduleNextStep: c })} />
                    </div>
                    {form.scheduleNextStep && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-primary/80">O que fazer a seguir?</Label>
                          <Input required={form.scheduleNextStep} value={form.nextStepTitle} onChange={e => setForm({ ...form, nextStepTitle: e.target.value })} className="h-9 bg-background border-primary/20" placeholder="Ex: Ligar novamente, Enviar e-mail..." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-semibold text-primary/80">Para quando?</Label>
                          <Input type="datetime-local" required={form.scheduleNextStep} value={form.nextStepDate} onChange={e => setForm({ ...form, nextStepDate: e.target.value })} className="h-9 bg-background border-primary/20 w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky footer */}
                <div className="px-6 py-4 border-t border-border bg-card/80 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
                  <Button type="button" variant="ghost" className="h-9" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={busy} className="h-9 bg-primary text-primary-foreground font-bold px-6">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Prospecção"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-sm bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-6 border-b border-border bg-muted/50">
            <DialogTitle className="text-lg font-semibold">Editar Prospecção</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Nome do Cliente</Label>
              <Input required value={editName} onChange={e => setEditName(e.target.value)} className="h-10 bg-background border-border" />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground font-bold px-8">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-6 border-b border-border bg-muted/50">
            <DialogTitle className="text-lg font-semibold">Registrar Ligação</DialogTitle>
            <DialogDescription className="text-xs">Registre a interação com {activeProspect?.client_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCallSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Resultado da Ligação</Label>
              <Select value={callForm.outcome} onValueChange={v => setCallForm({ ...callForm, outcome: v })}>
                <SelectTrigger className="h-10 bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conectada">Conectada</SelectItem>
                  <SelectItem value="Não Atendeu">Não Atendeu</SelectItem>
                  <SelectItem value="Caixa Postal">Caixa Postal</SelectItem>
                  <SelectItem value="Número Inválido">Número Inválido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Anotações da Ligação</Label>
              <Textarea value={callForm.notes} onChange={e => setCallForm({ ...callForm, notes: e.target.value })} className="h-20 bg-background border-border text-sm resize-none" placeholder="O que foi conversado?" />
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm font-bold text-primary">Agendar Próximo Passo? (Opcional)</Label>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-primary/80">O que fazer a seguir?</Label>
                <Input value={callForm.nextStepTitle} onChange={e => setCallForm({ ...callForm, nextStepTitle: e.target.value })} className="h-9 bg-background border-primary/20" placeholder="Ex: Ligar novamente, Enviar e-mail..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-primary/80">Para quando?</Label>
                <Input type="datetime-local" value={callForm.nextStepDate} onChange={e => setCallForm({ ...callForm, nextStepDate: e.target.value })} className="h-9 bg-background border-primary/20 w-full" />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setCallModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground font-bold px-8">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
