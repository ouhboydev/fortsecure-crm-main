import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Search, Loader2, User, Users, Building2, Mail, Phone,
  MoreHorizontal, Pencil, Trash2,
  Briefcase, Calendar, ChevronRight, ArrowUpRight,
  TrendingUp, Activity, History, ListTodo, MessageSquare,
  ShieldCheck, Clock, Target, List, X, LayoutGrid,
  Bold, Italic, ListOrdered, Download, Upload
} from "lucide-react";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import Papa from "papaparse";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/ui-kit/PageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Clientes — FortSecure" }] }),
  component: () => <AppShell><CustomersPage /></AppShell>,
});

// ─── Avatar helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#3ecf8e", "#1eaedb", "#f59e0b", "#8b5cf6",
  "#ec4899", "#f97316", "#06b6d4", "#22c55e",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const ACTIVITY_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  tarefa:   { icon: List,         color: "text-[#a3a3a3] bg-[#262626]",       label: "Tarefa" },
  ligacao:  { icon: Phone,        color: "text-[#3ecf8e] bg-[#3ecf8e]/10",    label: "Ligação" },
  email:    { icon: Mail,         color: "text-[#1eaedb] bg-[#1eaedb]/10",    label: "E-mail" },
  reuniao:  { icon: User,         color: "text-[#f59e0b] bg-[#f59e0b]/10",    label: "Reunião" },
  visita:   { icon: ShieldCheck,  color: "text-[#1eaedb] bg-[#1eaedb]/10",    label: "Visita" },
  followup: { icon: Target,       color: "text-[#a78bfa] bg-[#a78bfa]/10",    label: "Follow-up" },
  whatsapp: { icon: MessageSquare,color: "text-[#25D366] bg-[#25D366]/10",    label: "WhatsApp" },
};

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

const RichTextEditor = ({ content, onChange }: { content: string, onChange: (val: string) => void }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background">
      <div className="flex items-center gap-1 border-b border-border p-1 bg-secondary/30">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-1.5 rounded-md hover:bg-secondary", editor.isActive('bold') && "bg-secondary text-foreground")}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-1.5 rounded-md hover:bg-secondary", editor.isActive('italic') && "bg-secondary text-foreground")}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("p-1.5 rounded-md hover:bg-secondary", editor.isActive('bulletList') && "bg-secondary text-foreground")}>
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("p-1.5 rounded-md hover:bg-secondary", editor.isActive('orderedList') && "bg-secondary text-foreground")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} className="p-3 min-h-[100px] text-sm max-h-[200px] overflow-y-auto prose prose-sm dark:prose-invert focus:outline-none" />
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

function CustomersPage() {
  const { user, isManager, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerActivities, setCustomerActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", document: "", notes: "" });

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    return v;
  };

  const formatDoc = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    if (v.length > 11) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
    if (v.length > 9) return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
    if (v.length > 6) return v.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
    if (v.length > 3) return v.replace(/^(\d{3})(\d{0,3}).*/, "$1.$2");
    return v;
  };

  const canEdit = (c: any) => {
    if (!user) return false;
    if (isAdmin || isManager) return true;
    return c.owner_id === user.id;
  };

  async function loadCustomerActivities(oppIds: string[]) {
    if (!oppIds.length) { setCustomerActivities([]); return; }
    setActivitiesLoading(true);
    try {
      const { data } = await supabase
        .from("activities")
        .select("*, opportunities(title), profiles(full_name)")
        .in("opportunity_id", oppIds)
        .order("created_at", { ascending: false });
      setCustomerActivities(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers" as any)
        .select("*, opportunities(id, title, value, stage, created_at)")
        .order("name");
      if (error) { setCustomers([]); } else { setCustomers(data || []); }
    } catch { } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    const csvData = customers.map(c => ({
      Nome: c.name,
      Empresa: c.company || "",
      Email: c.email || "",
      Telefone: c.phone || "",
      Documento: c.document || "",
      Notas: c.notes || ""
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!user) return;
        setBusy(true);
        try {
          const rows = results.data as any[];
          const payload = rows.map(r => ({
            owner_id: user.id,
            name: r.Nome || r.name || r.NomeCompleto || "Sem Nome",
            company: r.Empresa || r.company || "",
            email: r.Email || r.email || "",
            phone: r.Telefone || r.phone || "",
            document: r.Documento || r.document || "",
            notes: r.Notas || r.notes || "",
            updated_at: new Date().toISOString()
          }));
          
          const { error } = await supabase.from("customers" as any).insert(payload);
          if (error) throw error;
          
          toast.success(`${payload.length} clientes importados com sucesso!`);
          load();
        } catch (err: any) {
          toast.error("Erro na importação: " + err.message);
        } finally {
          setBusy(false);
          if (e.target) e.target.value = '';
        }
      }
    });
  };

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
      const payload = { owner_id: user.id, name: form.name, company: form.company, email: form.email, phone: form.phone, document: form.document, notes: form.notes, updated_at: new Date().toISOString() };
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
      toast.error(err.message || "Certifique-se de que a tabela 'customers' foi criada.");
    } finally {
      setBusy(false);
    }
  }

  const openNew = () => { setEditingId(null); setForm({ name: "", company: "", email: "", phone: "", document: "", notes: "" }); setIsModalOpen(true); };
  const openEdit = (c: any) => { setEditingId(c.id); setForm({ name: c.name, company: c.company || "", email: c.email || "", phone: c.phone || "", document: c.document || "", notes: c.notes || "" }); setIsModalOpen(true); };
  const openDetail = (c: any) => { setSelectedCustomer(c); setIsDetailOpen(true); loadCustomerActivities(c.opportunities?.map((o: any) => o.id) || []); };

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
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 lg:px-8 pt-8 pb-5 border-b border-border shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-[#3ecf8e]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Clientes</h1>
              <p className="text-sm text-muted-foreground">{customers.length} contatos na base</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar cliente..."
                className="h-9 pl-9 pr-8 w-56 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex bg-secondary/50 border border-border rounded-lg p-1 gap-1">
              <button
                onClick={() => setView("grid")}
                className={cn("h-7 w-7 rounded-md flex items-center justify-center transition-all", view === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn("h-7 w-7 rounded-md flex items-center justify-center transition-all", view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
              <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileUpload} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 px-2.5 text-xs border-border text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                  <DropdownMenuItem onClick={() => document.getElementById('csv-upload')?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Importar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCSV}>
                    <Download className="mr-2 h-4 w-4" /> Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            <Button onClick={openNew} className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2">
              <Plus className="h-3.5 w-3.5" /> Novo Cliente
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-6 pb-8 max-w-[1600px] mx-auto w-full space-y-6">

        {/* ── Metrics Panel ── */}
        {!loading && customers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total de Clientes</p>
                <p className="text-2xl font-black mt-1 text-foreground">{customers.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#3ecf8e]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#3ecf8e]" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Negócios Ativos</p>
                <p className="text-2xl font-black mt-1 text-foreground">
                  {customers.reduce((acc, c) => acc + (c.opportunities?.filter((o:any)=>o.stage !== "ganho" && o.stage !== "perdido").length || 0), 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#1eaedb]/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-[#1eaedb]" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Em Negociação</p>
                <p className="text-2xl font-black font-mono mt-1 text-foreground">
                  {formatCurrency(customers.reduce((acc, c) => acc + (c.opportunities?.filter((o:any)=>o.stage !== "ganho" && o.stage !== "perdido").reduce((sum:number, o:any)=> sum + Number(o.value), 0) || 0), 0))}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#f59e0b]/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-[#f59e0b]" />
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-24">
            <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
              <Building2 className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-foreground">
                {search ? "Nenhum resultado" : "Nenhum cliente cadastrado"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Tente outros termos de busca" : "Comece adicionando seu primeiro contato"}
              </p>
            </div>
            {!search && (
              <Button onClick={openNew} variant="outline" className="border-[#3ecf8e]/30 text-[#3ecf8e] hover:bg-[#3ecf8e]/5 gap-2">
                <Plus className="h-4 w-4" /> Cadastrar Agora
              </Button>
            )}
          </div>
        ) : view === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map(c => {
                const color = avatarColor(c.name);
                const totalValue = c.opportunities?.reduce((acc: number, o: any) => acc + Number(o.value), 0) || 0;
                const wonCount = c.opportunities?.filter((o: any) => o.stage === "ganho").length || 0;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-card/40 hover:bg-card border border-border/60 hover:border-border rounded-2xl p-5 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => openDetail(c)}
                  >
                    {/* Actions menu */}
                    <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          {canEdit(c) && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(c)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => deleteCustomer(c.id)} className="text-destructive">
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
                    </div>

                    {/* Avatar */}
                    <div className="mb-4">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black shadow-sm"
                        style={{ backgroundColor: `${color}20`, color }}>
                        {c.name[0].toUpperCase()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-[#3ecf8e] transition-colors truncate pr-6">{c.name}</h3>
                      {c.company && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.company}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact chips */}
                    <div className="space-y-1.5 mb-4">
                      {c.email && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 rounded-md px-2.5 py-1.5 border border-border/40">
                          <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 rounded-md px-2.5 py-1.5 border border-border/40">
                          <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Negócios</p>
                        <p className="text-sm font-black font-mono text-foreground">{c.opportunities?.length || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Valor Total</p>
                        <p className="text-sm font-black font-mono text-foreground">{formatCurrency(totalValue)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* List view */
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-border bg-secondary/30 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cliente</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Empresa</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contato</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Negócios</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Valor Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <AnimatePresence>
                  {filtered.map(c => {
                    const color = avatarColor(c.name);
                    const totalValue = c.opportunities?.reduce((acc: number, o: any) => acc + Number(o.value), 0) || 0;
                    return (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => openDetail(c)}
                        className="group hover:bg-secondary/20 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                              style={{ backgroundColor: `${color}15`, color }}>
                              {c.name[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-foreground group-hover:text-[#3ecf8e] transition-colors truncate max-w-[180px]">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-muted-foreground truncate max-w-[140px] block">{c.company || "—"}</span>
                          {c.document && <span className="text-[10px] text-muted-foreground/60 font-mono">{c.document}</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[160px]">{c.email || "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{c.phone || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/50 border border-border/50 text-[10px] font-bold text-foreground">
                            {c.opportunities?.length || 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-black font-mono text-foreground">
                            {formatCurrency(totalValue)}
                          </span>
                        </td>
                        <td className="pr-4" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 opacity-0 group-hover:opacity-100 transition-all">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              {canEdit(c) && (
                                <>
                                  <DropdownMenuItem onClick={() => openEdit(c)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => deleteCustomer(c.id)} className="text-destructive">
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!canEdit(c) && (
                                <DropdownMenuItem disabled className="text-[10px] text-muted-foreground italic">Somente o dono pode editar</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border">
            <DialogTitle className="text-base font-semibold">{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription className="text-xs">Insira os dados do contato ou empresa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome Completo *</Label>
              <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-9 bg-background border-border" placeholder="João Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Empresa</Label>
                <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="h-9 bg-background border-border" placeholder="FortSecure LTDA" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">CPF / CNPJ</Label>
                <Input value={form.document} onChange={e => setForm({ ...form, document: formatDoc(e.target.value) })} className="h-9 bg-background border-border" placeholder="000.000.000-00" maxLength={18} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-9 bg-background border-border" placeholder="contato@empresa.com" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} className="h-9 bg-background border-border" placeholder="(11) 98888-7777" maxLength={15} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observações</Label>
              <RichTextEditor content={form.notes} onChange={val => setForm({ ...form, notes: val })} />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="h-9 text-xs">Cancelar</Button>
              <Button type="submit" disabled={busy} className="h-9 bg-[#3ecf8e] text-black font-semibold text-xs gap-2">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detail Slide-over ── */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:max-w-3xl bg-card border-l border-border p-0 overflow-hidden flex flex-col gap-0 w-full sm:w-[800px]">
          {selectedCustomer && (() => {
            const color = avatarColor(selectedCustomer.name);
            const totalValue = selectedCustomer.opportunities?.reduce((acc: number, o: any) => acc + Number(o.value), 0) || 0;
            const wonCount = selectedCustomer.opportunities?.filter((o: any) => o.stage === "ganho").length || 0;
            return (
              <>
                {/* Detail header */}
                <div className="px-8 py-6 border-b border-border shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
                        style={{ backgroundColor: `${color}20`, color }}>
                        {selectedCustomer.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight">{selectedCustomer.name}</h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {selectedCustomer.company && (
                            <Badge variant="outline" className="text-[10px] font-bold border-border px-2 py-0.5">
                              <Building2 className="h-2.5 w-2.5 mr-1" />{selectedCustomer.company}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Cliente desde {new Date(selectedCustomer.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canEdit(selectedCustomer) && (
                      <Button variant="outline" size="sm" onClick={() => { setIsDetailOpen(false); openEdit(selectedCustomer); }} className="h-8 text-xs gap-1.5">
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex min-h-0">
                  {/* Sidebar */}
                  <div className="w-72 border-r border-border p-6 space-y-5 shrink-0 overflow-y-auto">
                    {/* Contact */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contato</h4>
                      <div className="space-y-3">
                        {[
                          { icon: Mail,    label: "E-mail",    value: selectedCustomer.email },
                          { icon: Phone,   label: "Telefone",  value: selectedCustomer.phone },
                          { icon: Building2, label: "Documento", value: selectedCustomer.document },
                        ].map(f => {
                          const Icon = f.icon;
                          return (
                            <div key={f.label} className="flex items-start gap-2.5">
                              <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{f.label}</p>
                                <p className="text-xs text-foreground mt-0.5">{f.value || "—"}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financials */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Resumo Financeiro</h4>
                      <div className="space-y-2">
                        <div className="p-3 bg-secondary/30 border border-border/50 rounded-xl">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Volume Total</p>
                          <p className="text-xl font-black font-mono mt-0.5 text-foreground">{formatCurrency(totalValue)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-secondary/30 border border-border/50 rounded-xl">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Negócios</p>
                            <p className="text-lg font-black font-mono text-foreground">{selectedCustomer.opportunities?.length || 0}</p>
                          </div>
                          <div className="p-3 bg-secondary/30 border border-border/50 rounded-xl">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Ganhos</p>
                            <p className="text-lg font-black font-mono text-[#3ecf8e]">{wonCount}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main area */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <Tabs defaultValue="propostas" className="h-full flex flex-col">
                      <div className="px-6 pt-5 border-b border-border shrink-0">
                        <TabsList className="bg-secondary/30 border border-border h-8 p-0.5 gap-0.5">
                          <TabsTrigger value="propostas" className="text-xs h-7 gap-1.5 data-[state=active]:bg-card">
                            <Briefcase className="h-3 w-3" /> Propostas
                          </TabsTrigger>
                          <TabsTrigger value="notas" className="text-xs h-7 gap-1.5 data-[state=active]:bg-card">
                            <History className="h-3 w-3" /> Histórico
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="propostas" className="flex-1 overflow-y-auto p-6 space-y-3 mt-0">
                        {selectedCustomer.opportunities?.length > 0 ? (
                          selectedCustomer.opportunities.map((o: any) => {
                            const stageColors: Record<string, string> = { ganho: "#3ecf8e", perdido: "#ef4444", proposta: "#3b82f6", negociacao: "#8b5cf6", prospect: "#a3a3a3", qualificado: "#f59e0b" };
                            const sc = stageColors[o.stage] ?? "#a3a3a3";
                            return (
                              <div key={o.id} className="flex items-center gap-4 p-4 bg-secondary/20 border border-border/50 rounded-xl hover:border-[#3ecf8e]/30 transition-all group">
                                <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sc}15`, color: sc }}>
                                  <TrendingUp className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{o.title}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(o.created_at).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black font-mono text-foreground">{formatCurrency(o.value)}</p>
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: `${sc}15`, color: sc }}>{o.stage}</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-16 flex flex-col items-center text-center opacity-40">
                            <Activity className="h-10 w-10 mb-3" />
                            <p className="text-sm">Nenhuma proposta vinculada</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="notas" className="flex-1 overflow-y-auto p-6 mt-0 space-y-5">
                        {/* Notes */}
                        <div className="p-4 bg-secondary/20 border border-border/50 rounded-xl">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Observações</h4>
                          {selectedCustomer.notes ? (
                            <div className="text-xs text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: selectedCustomer.notes }} />
                          ) : (
                            <p className="text-xs text-foreground leading-relaxed">Sem observações registradas.</p>
                          )}
                        </div>

                        {/* Activity timeline */}
                        <div>
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-4">
                            <History className="h-4 w-4 text-[#3ecf8e]" />
                            Histórico de Atividades
                          </h4>
                          {activitiesLoading ? (
                            <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#3ecf8e]" /></div>
                          ) : customerActivities.length === 0 ? (
                            <div className="py-10 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                              Nenhuma atividade registrada
                            </div>
                          ) : (
                            <div className="relative border-l border-border ml-3 pl-5 space-y-4">
                              {customerActivities.map(act => {
                                const cfg = ACTIVITY_TYPE_CONFIG[act.type] || ACTIVITY_TYPE_CONFIG.tarefa;
                                const Icon = cfg.icon;
                                const isDone = act.status === "concluida";
                                const [iconColor, iconBg] = cfg.color.split(" ");
                                return (
                                  <div key={act.id} className="relative">
                                    <div className={cn("absolute -left-[31px] top-1 h-6 w-6 rounded-full border-2 border-card flex items-center justify-center z-10", iconBg, iconColor)}>
                                      <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-semibold text-foreground">{act.title}</p>
                                          <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {new Date(act.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                            {act.profiles?.full_name && ` · ${act.profiles.full_name}`}
                                          </p>
                                        </div>
                                        {act.opportunities?.title && (
                                          <Badge variant="outline" className="text-[9px] border-[#3ecf8e]/20 text-[#3ecf8e] bg-[#3ecf8e]/5 shrink-0">
                                            {act.opportunities.title}
                                          </Badge>
                                        )}
                                      </div>
                                      {act.description && (
                                        <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/20 p-2.5 rounded-lg">{act.description}</p>
                                      )}
                                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {act.outcome && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{act.outcome}</span>
                                        )}
                                        {act.sentiment && (
                                          <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase",
                                            act.sentiment === "quente" && "bg-red-500/10 text-red-500 border-red-500/20",
                                            act.sentiment === "morno" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                            act.sentiment === "frio" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                                            act.sentiment === "neutro" && "bg-secondary text-muted-foreground border-border"
                                          )}>
                                            {act.sentiment}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
