import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Package, Plus, Trash2, Edit3,
  Search, Filter, ShoppingBag,
  DollarSign, Tag, Info, X,
  Loader2, Save, MoreHorizontal, ArrowUpRight,
  Database, LayoutGrid, Zap, Sparkles,
  ShieldCheck, Globe, Cpu, BarChart3,
  Boxes, Layers, Shield, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Gestão de Produtos — FortSecure" }] }),
  component: () => <AppShell><Products /></AppShell>,
});

function Products() {
  const { isManager, user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: "", 
    description: "", 
    price: "",
    sku: "",
    category: "Software",
    cost_price: "",
    stock: "Disponível",
    technical_notes: ""
  });

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setItems(data ?? []);
    } catch (e: any) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        metadata: {
          sku: form.sku,
          category: form.category,
          cost_price: form.cost_price,
          stock: form.stock,
          technical_notes: form.technical_notes
        }
      };

      if (editingId) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", editingId);
        if (error) throw error;
        toast.success("Produto atualizado");
      } else {
        const { error } = await supabase.from("products").insert(payload as any);
        if (error) throw error;
        toast.success("Produto adicionado");
      }

      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const resetForm = () => {
    setForm({ 
      name: "", description: "", price: "", 
      sku: "", category: "Software", cost_price: "", stock: "Disponível", technical_notes: "" 
    });
  };

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Produto removido");
      load();
    }
  }

  const filtered = items
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

  function toggleSort() {
    if (sortOrder === 'name') setSortOrder('price-asc');
    else if (sortOrder === 'price-asc') setSortOrder('price-desc');
    else setSortOrder('name');
  }

  if (!isManager) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000">
       <div className="relative">
          <div className="absolute inset-0 bg-destructive/10 blur-3xl rounded-full" />
          <Shield className="h-20 w-20 text-destructive/30 relative" />
       </div>
       <div className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.5em]">Acesso Restrito ao Comando</div>
    </div>
  );

  return (
    <div className="p-8 md:p-12 lg:p-20 space-y-16 max-w-[1600px] mx-auto min-h-screen pb-40 relative selection:bg-primary selection:text-primary-foreground">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[180px] rounded-full -mr-32 -mt-32" />
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[150px] rounded-full -ml-32 -mb-32" />
      </div>

      <PageHeader
        title="Catálogo de Produtos"
        subtitle="Gestão estratégica de inventário e soluções táticas de segurança"
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="h-16 px-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-emerald-500/20 gap-3"
          >
            <Plus className="h-5 w-5" /> Registrar Nova Solução
          </Button>
        }
      />

      {/* Analytics Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         <StatCard label="Total em Catálogo" value={items.length} icon={<Boxes />} />
         <StatCard label="Ticket Médio" value={formatCurrency(items.reduce((s, p) => s + p.price, 0) / (items.length || 1))} icon={<BarChart3 />} />
         <StatCard label="Disponibilidade" value="100%" icon={<ShieldCheck className="text-primary" />} />
         <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-focus-within:text-primary transition-all z-10" />
               <Input
                 placeholder="Filtrar inventário..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="h-16 pl-14 pr-6 bg-card/40 backdrop-blur-md border-border rounded-2xl text-sm focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/20"
               />
            </div>
            <Button
              variant="outline"
              onClick={toggleSort}
              className="h-16 px-6 bg-secondary/50 border-border rounded-2xl text-muted-foreground hover:text-foreground transition-all"
            >
              <Filter className="h-4 w-4" />
            </Button>
         </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group bg-card/40 backdrop-blur-3xl rounded-[40px] border-border hover:border-primary/30 transition-all flex flex-col h-[500px] relative overflow-hidden shadow-2xl border-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <CardHeader className="p-10 pb-0">
                  <div className="flex items-start justify-between">
                     <div className="h-16 w-16 bg-secondary border border-border rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-all shadow-inner">
                        <ShoppingBag className="h-8 w-8" />
                     </div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingId(p.id); setForm({ ...form, name: p.name, description: p.description || "", price: String(p.price), sku: p.metadata?.sku || "", category: p.metadata?.category || "Software", cost_price: p.metadata?.cost_price || "", stock: p.metadata?.stock || "Disponível", technical_notes: p.metadata?.technical_notes || "" }); setIsModalOpen(true); }} className="h-10 w-10 rounded-xl bg-secondary/50 border border-border hover:text-primary"><Edit3 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="h-10 w-10 rounded-xl bg-secondary/50 border border-border hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                     </div>
                  </div>
                  <div className="mt-8 space-y-1">
                     <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{p.metadata?.category || 'General Solution'}</div>
                     <CardTitle className="text-2xl font-black text-foreground group-hover:text-primary transition-colors tracking-tighter italic uppercase">{p.name}</CardTitle>
                  </div>
                </CardHeader>
                
                <CardContent className="p-10 pt-6 flex-1 space-y-6">
                  <p className="text-[11px] text-muted-foreground/60 font-medium leading-relaxed line-clamp-4">
                    {p.description || "Detalhes e especificações do produto selecionado para ambientes corporativos."}
                  </p>
                  <div className="flex items-center gap-4">
                     <Badge variant="outline" className="bg-secondary/50 border-border text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">SKU: {p.metadata?.sku || 'N/A'}</Badge>
                     <Badge variant="outline" className="bg-emerald-500/5 border-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{p.metadata?.stock || 'Em Estoque'}</Badge>
                  </div>
                </CardContent>

                <CardFooter className="p-10 pt-0 flex items-center justify-between mt-auto">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest italic">Ticket Delta</div>
                    <div className="text-4xl font-black font-mono text-foreground tracking-tighter">{formatCurrency(p.price)}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => nav({ to: "/pipeline" })} className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center hover:bg-primary/5 group/btn transition-all shadow-inner">
                    <ArrowUpRight className="h-6 w-6 text-muted-foreground/20 group-hover/btn:text-primary transition-colors" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="col-span-full py-40 text-center space-y-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40 mx-auto" />
            <div className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.5em]">Acessando Vault de Inventário...</div>
          </div>
        )}
      </div>

      {/* Complex Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border border-border/50 rounded-[48px] p-0 overflow-hidden max-w-4xl shadow-[0_0_120px_rgba(0,0,0,0.6)] border-none">
          <div className="flex h-[800px]">
            {/* Left Strategic Side */}
            <div className="w-[280px] bg-secondary/30 border-r border-border/50 p-12 flex flex-col justify-between relative">
               <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
               <div className="relative z-10 space-y-12">
                  <div className="h-20 w-20 bg-background border border-border rounded-3xl flex items-center justify-center text-primary shadow-2xl">
                    <Cpu className="h-10 w-10" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black tracking-tighter uppercase italic text-foreground leading-tight">
                       Cadastro de <span className="text-primary">Produto</span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.4em] leading-relaxed">Registro Delta-Stock // v4.2</p>
                  </div>
                  
                  <div className="space-y-6 pt-10 border-t border-border/30">
                     <div className="flex items-center gap-4 text-primary">
                        <Shield className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Painel Financeiro</span>
                     </div>
                     <p className="text-[10px] text-muted-foreground/30 leading-relaxed uppercase font-black tracking-widest italic">A precificação e a margem bruta são fundamentais para o cálculo de Net Revenue no Comando HQ.</p>
                  </div>
               </div>

               <div className="relative z-10 flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 italic">Sincronização Ativa</span>
               </div>
            </div>

            {/* Main Form Body */}
            <div className="flex-1 p-16 overflow-y-auto no-scrollbar bg-card/10 backdrop-blur-3xl relative">
              <div className="absolute top-0 right-0 p-10">
              </div>

              <form onSubmit={handleSubmit} className="space-y-12">
                <section className="space-y-8">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_10px_#10b981]" />
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Especificação Base</h4>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Nomenclatura Técnica</Label>
                        <Input 
                           required 
                           placeholder="Ex: FortShield Core v9"
                           value={form.name}
                           onChange={e => setForm({...form, name: e.target.value})}
                           className="h-18 px-8 bg-secondary/40 border-border rounded-[24px] text-xl font-black italic tracking-tight focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Part Number / SKU</Label>
                        <Input 
                           required 
                           placeholder="FS-PROD-XXXX"
                           value={form.sku}
                           onChange={e => setForm({...form, sku: e.target.value})}
                           className="h-18 px-8 bg-secondary/40 border-border rounded-[24px] text-lg font-mono font-bold focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Categoria de Ativo</Label>
                        <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                          <SelectTrigger className="h-18 bg-secondary/40 border-border rounded-[24px] text-xs font-black uppercase tracking-widest px-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Software">Software / SaaS</SelectItem>
                            <SelectItem value="Hardware">Hardware / Appliance</SelectItem>
                            <SelectItem value="Serviços">Serviços Profissionais</SelectItem>
                            <SelectItem value="Suporte">Suporte e Manutenção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Status de Estoque</Label>
                        <Select value={form.stock} onValueChange={v => setForm({...form, stock: v})}>
                          <SelectTrigger className="h-18 bg-secondary/40 border-border rounded-[24px] text-xs font-black uppercase tracking-widest px-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="Disponível">Disponível</SelectItem>
                            <SelectItem value="Sob Consulta">Sob Consulta</SelectItem>
                            <SelectItem value="EOL">End of Life (EOL)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                   </div>
                </section>

                <section className="space-y-8">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="h-1 w-12 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                      <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em]">Arquitetura Financeira</h4>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Preço de Venda (MSRP)</Label>
                        <div className="relative group">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/20 italic group-focus-within:text-primary transition-colors">R$</span>
                           <Input 
                              required 
                              type="number"
                              placeholder="0,00"
                              value={form.price}
                              onChange={e => setForm({...form, price: e.target.value})}
                              className="h-18 pl-16 bg-secondary/40 border-border rounded-[24px] text-2xl font-black font-mono focus:ring-primary/20 transition-all outline-none"
                           />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Custo Operacional Estimado</Label>
                        <div className="relative group">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/20 italic group-focus-within:text-blue-500 transition-colors">R$</span>
                           <Input 
                              type="number"
                              placeholder="0,00"
                              value={form.cost_price}
                              onChange={e => setForm({...form, cost_price: e.target.value})}
                              className="h-18 pl-16 bg-secondary/40 border-border rounded-[24px] text-2xl font-black font-mono focus:ring-blue-500/20 transition-all outline-none"
                           />
                        </div>
                      </div>
                   </div>
                </section>

                <section className="space-y-6">
                   <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 ml-1">Especificações Técnicas</Label>
                   <Textarea 
                     placeholder="Detalhes da solução, integrações suportadas e compliance..."
                     value={form.technical_notes}
                     onChange={e => setForm({...form, technical_notes: e.target.value})}
                     className="bg-secondary/40 border-border rounded-[32px] p-8 text-sm font-medium leading-relaxed min-h-[160px] focus:ring-primary/20 transition-all outline-none resize-none shadow-inner"
                   />
                </section>

                <div className="pt-10 flex gap-6">
                   <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-20 rounded-[24px] border-border text-[11px] font-black uppercase tracking-widest hover:bg-secondary transition-all text-muted-foreground/30">Abortar</Button>
                   <Button 
                    type="submit" 
                    disabled={busy}
                    className="flex-[2] h-20 bg-primary text-primary-foreground rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-4"
                   >
                     {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : editingId ? <RefreshCw className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                     {editingId ? 'Sincronizar Atualização' : 'Efetivar Registro de Produto'}
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

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="bg-card/40 backdrop-blur-md rounded-3xl border-border hover:border-primary/20 transition-all group shadow-xl relative overflow-hidden border-none">
       <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
       <CardContent className="p-8">
          <div className="flex justify-between items-start mb-6">
             <div className="h-12 w-12 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground/30 group-hover:text-primary transition-all group-hover:border-primary/30 shadow-inner">{icon}</div>
          </div>
          <div className="text-4xl font-black font-mono text-foreground mb-1 tracking-tighter">{value}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">{label}</div>
       </CardContent>
    </Card>
  );
}
