import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Search, Loader2, User, Building2, Mail, Phone, 
  ExternalLink, MoreHorizontal, Pencil, Trash2, Filter,
  Briefcase, Calendar, ChevronRight, ArrowUpRight,
  TrendingUp, Activity, History, ListTodo
} from "lucide-react";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/ui-kit/PageHeader";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Clientes — FortSecure" }] }),
  component: () => <AppShell><CustomersPage /></AppShell>,
});

function CustomersPage() {
  const { user, isManager, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    document: "",
    notes: ""
  });

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 5) {
      return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
      return v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    }
    return v;
  };

  const formatDoc = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    if (v.length > 11) {
      return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
    } else if (v.length > 9) {
      return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
    } else if (v.length > 6) {
      return v.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
    } else if (v.length > 3) {
      return v.replace(/^(\d{3})(\d{0,3}).*/, "$1.$2");
    }
    return v;
  };

  const canEdit = (customer: any) => {
    if (!user) return false;
    if (isAdmin || isManager) return true;
    return customer.owner_id === user.id;
  };

  async function load() {
    setLoading(true);
    try {
      // Tenta carregar da tabela customers. Se não existir, avisa o usuário.
      const { data, error } = await supabase
        .from("customers" as any)
        .select(`
          *,
          opportunities (
            id,
            title,
            value,
            stage,
            created_at
          )
        `)
        .order("name");

      if (error) {
        console.error("Erro ao carregar clientes:", error);
        // Fallback para uma lista vazia se a tabela não existir ainda
        setCustomers([]);
      } else {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = {
        owner_id: user.id,
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        document: form.document,
        notes: form.notes,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase.from("customers" as any).update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Cliente atualizado");
      } else {
        const { error } = await supabase.from("customers" as any).insert(payload);
        if (error) throw error;
        toast.success("Cliente cadastrado");
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm({ name: "", company: "", email: "", phone: "", document: "", notes: "" });
      load();
    } catch (err: any) {
      toast.error("Certifique-se de que a tabela 'customers' foi criada no Supabase.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", company: "", email: "", phone: "", document: "", notes: "" });
    setIsModalOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      company: c.company || "",
      email: c.email || "",
      phone: c.phone || "",
      document: c.document || "",
      notes: c.notes || ""
    });
    setIsModalOpen(true);
  };

  const openDetail = (c: any) => {
    setSelectedCustomer(c);
    setIsDetailOpen(true);
  };

  async function deleteCustomer(id: string) {
    if (!confirm("Excluir cliente? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase.from("customers" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Cliente removido");
      load();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message);
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-[1600px] mx-auto overflow-hidden bg-background">
      {/* Page Header */}
      <div className="p-6 lg:p-8 shrink-0">
        <PageHeader
          title="Gestão de Clientes"
          subtitle="Visualize e gerencie sua base de contatos e empresas."
          actions={
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 w-64 bg-card border-border text-xs"
                />
              </div>
              <div className="flex bg-secondary border border-border p-1 rounded-md">
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('grid')} className="h-7 w-7 rounded-sm">
                  <Activity className="h-3.5 w-3.5" />
                </Button>
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')} className="h-7 w-7 rounded-sm">
                  <ListTodo className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button onClick={openNew} className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-md shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-2" /> Novo Cliente
              </Button>
            </div>
          }
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-2xl bg-card/20">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum cliente encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              Comece cadastrando seu primeiro cliente para gerenciar propostas e atividades vinculadas.
            </p>
            <Button onClick={openNew} variant="outline" className="mt-6 border-primary/20 text-primary hover:bg-primary/5">
              <Plus className="h-4 w-4 mr-2" /> Cadastrar Agora
            </Button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto h-full pr-2 no-scrollbar">
            {filtered.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => openDetail(c)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      {canEdit(c) && (
                        <>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteCustomer(c.id); }} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </>
                      )}
                      {!canEdit(c) && (
                        <DropdownMenuItem disabled className="text-[10px] text-muted-foreground italic">
                          Somente o dono pode editar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  {c.company && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{c.company}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  {c.email && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 p-1.5 rounded-md border border-border/50">
                      <Mail className="h-3 w-3 text-primary/60" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 p-1.5 rounded-md border border-border/50">
                      <Phone className="h-3 w-3 text-primary/60" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Propostas</span>
                    <span className="text-sm font-black text-foreground font-mono">
                      {c.opportunities?.length || 0}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Valor Total</span>
                    <span className="text-sm font-black text-primary font-mono">
                      {formatCurrency(c.opportunities?.reduce((acc: number, o: any) => acc + Number(o.value), 0) || 0)}
                    </span>
                  </div>
                </div>
                
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="overflow-y-auto flex-1 no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-md border-b border-border">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Empresa</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contato</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Propostas</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Valor Total</th>
                    <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => openDetail(c)}
                      className="group hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                            {c.name[0]}
                          </div>
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-foreground font-medium truncate max-w-[150px]">{c.company || "-"}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{c.document || "S/ documento"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 text-primary/50" />
                            <span className="truncate max-w-[180px]">{c.email || "Não informado"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 text-primary/50" />
                            <span>{c.phone || "Não informado"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="bg-muted text-foreground border-none font-bold text-[10px]">
                          {c.opportunities?.length || 0} Negócios
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-black text-primary font-mono">
                          {formatCurrency(c.opportunities?.reduce((acc: number, o: any) => acc + Number(o.value), 0) || 0)}
                        </span>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            {canEdit(c) && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteCustomer(c.id); }} className="text-destructive">
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                            {!canEdit(c) && (
                              <DropdownMenuItem disabled className="text-[10px] text-muted-foreground italic">
                                Somente o dono pode editar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border p-0 overflow-hidden rounded-xl">
          <DialogHeader className="p-6 border-b border-border bg-muted/50">
            <DialogTitle className="text-lg font-semibold">{editingId ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
            <DialogDescription className="text-xs">Insira os dados principais do contato ou empresa.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Nome Completo</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-10 bg-background border-border" placeholder="Ex: João Silva" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Empresa</Label>
                <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-10 bg-background border-border" placeholder="FortSecure LTDA" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Documento (CPF/CNPJ)</Label>
                <Input 
                  value={form.document} 
                  onChange={e => setForm({ ...form, document: formatDoc(e.target.value) })} 
                  className="h-10 bg-background border-border" 
                  placeholder="000.000.000-00" 
                  maxLength={18}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-10 bg-background border-border" placeholder="contato@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
                <Input 
                  value={form.phone} 
                  onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} 
                  className="h-10 bg-background border-border" 
                  placeholder="(11) 98888-7777" 
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Observações / Histórico</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-background border-border min-h-[100px]" placeholder="Notas importantes sobre o cliente..." />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground font-bold px-8">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl bg-card border-border p-0 overflow-hidden rounded-xl h-[85vh] flex flex-col">
          {selectedCustomer && (
            <>
              <div className="p-8 border-b border-border bg-muted/30 shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex gap-6">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-foreground tracking-tight">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[10px]">
                          {selectedCustomer.company || "Pessoa Física"}
                        </Badge>
                        <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          Cliente desde {new Date(selectedCustomer.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {canEdit(selectedCustomer) && (
                      <Button variant="outline" onClick={() => { setIsDetailOpen(false); openEdit(selectedCustomer); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Sidebar Info */}
                <div className="w-80 border-r border-border p-6 space-y-6 shrink-0 bg-muted/10">
                  <Section title="Contato">
                    <div className="space-y-4 mt-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">E-mail Comercial</span>
                        <span className="text-sm font-medium text-foreground">{selectedCustomer.email || "Não informado"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Telefone</span>
                        <span className="text-sm font-medium text-foreground">{selectedCustomer.phone || "Não informado"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Documento</span>
                        <span className="text-sm font-medium text-foreground">{selectedCustomer.document || "Não informado"}</span>
                      </div>
                    </div>
                  </Section>

                  <Section title="Resumo Financeiro">
                    <div className="grid grid-cols-1 gap-3 mt-3">
                      <div className="p-3 bg-card border border-border rounded-lg">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Volume Total</p>
                        <p className="text-lg font-black text-primary font-mono">
                          {formatCurrency(selectedCustomer.opportunities?.reduce((acc: number, o: any) => acc + Number(o.value), 0) || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-card border border-border rounded-lg">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Propostas Ganhas</p>
                        <p className="text-lg font-black text-foreground font-mono">
                          {selectedCustomer.opportunities?.filter((o: any) => o.stage === 'ganho').length || 0}
                        </p>
                      </div>
                    </div>
                  </Section>
                </div>

                {/* Main Detail Area */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-background/50">
                  <Tabs defaultValue="propostas" className="w-full">
                    <TabsList className="bg-muted/50 border border-border mb-6">
                      <TabsTrigger value="propostas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Briefcase className="h-4 w-4 mr-2" /> Propostas
                      </TabsTrigger>
                      <TabsTrigger value="notas">
                        <History className="h-4 w-4 mr-2" /> Notas & Histórico
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="propostas" className="space-y-4">
                      {selectedCustomer.opportunities?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedCustomer.opportunities.map((o: any) => (
                            <div key={o.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "h-10 w-10 rounded-lg flex items-center justify-center",
                                  o.stage === 'ganho' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{o.title}</h4>
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                                    Criado em {new Date(o.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm font-black font-mono text-foreground">{formatCurrency(o.value)}</p>
                                  <Badge variant="secondary" className="text-[9px] h-4 font-black uppercase tracking-tighter">
                                    {o.stage}
                                  </Badge>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                          <Activity className="h-12 w-12 mb-3" />
                          <p className="text-sm font-medium">Nenhuma proposta vinculada</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notas">
                      <div className="p-6 bg-card border border-border rounded-xl min-h-[200px]">
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {selectedCustomer.notes || "Sem observações registradas para este cliente."}
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
