import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BookOpen, ChevronRight, CheckCircle2, ArrowDownCircle,
  Search, Tag, ChevronDown, ChevronUp, X,
  Plus, Pencil, Trash2, Loader2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowModal } from "@/components/ui-kit/FlowModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaybookViewer } from "@/components/playbook/PlaybookViewer";
import { PlaybookBuilder } from "@/components/playbook/PlaybookBuilder";
import { playbooksData, Playbook } from "@/lib/playbooks-data";
import { Workflow } from "lucide-react";

export const Route = createFileRoute("/knowledge")({
  component: () => <AppShell><KnowledgeBase /></AppShell>,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlowStep {
  id: string;
  label: string;
  description?: string;
  actor?: string;
  type?: "start" | "step" | "end";
}

export interface KbFlow {
  id: string;
  title: string;
  product: string;
  category: string;
  color: string;
  description: string;
  tags: string[];
  steps: FlowStep[];
  order?: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function KnowledgeBase() {
  const { isAdmin } = useAuth();
  const [flows, setFlows] = useState<KbFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  // Admin state
  const [adminOpen, setAdminOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<KbFlow | null>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dbPlaybooks, setDbPlaybooks] = useState<Playbook[]>([]);
  
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("knowledge_flows")
        .select("*")
        .order("order", { ascending: true });
      
      if (error) throw error;
      
      const parsed = (data || []).map((d: any) => ({
        ...d,
        steps: typeof d.steps === 'string' ? JSON.parse(d.steps) : d.steps
      })) as KbFlow[];
      setFlows(parsed);
      if (parsed.length > 0 && !expandedFlow) setExpandedFlow(parsed[0].id);
    } catch (err: any) {
      console.error("Erro ao carregar knowledge_flows:", err);
      toast.error("Erro ao carregar os fluxos da base de conhecimento");
    }

    try {
      const { data: pbData, error: pbError } = await supabase
        .from("interactive_playbooks")
        .select("*");
      
      if (pbError) throw pbError;
      if (pbData) {
        setDbPlaybooks(pbData as any);
      }
    } catch (err: any) {
      console.warn("Tabela 'interactive_playbooks' não pode ser acessada (talvez falte rodar db push):", err);
      // Fallback silencioso usando dados locais
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.")) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("knowledge_flows").delete().eq("id", id);
      if (error) throw error;
      toast.success("Fluxo excluído com sucesso");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeletePlaybook(id: string) {
    if (!confirm("Tem certeza que deseja excluir este playbook? Esta ação não pode ser desfeita.")) return;
    try {
      const { error } = await supabase.from("interactive_playbooks").delete().eq("id", id);
      if (error) throw error;
      toast.success("Playbook excluído com sucesso");
      load();
    } catch (err: any) {
      toast.error("Erro ao excluir playbook: " + err.message);
    }
  }

  const categories = ["Todos", ...Array.from(new Set(flows.map(f => f.category)))];
  const allTags = Array.from(new Set(flows.flatMap(f => f.tags)));

  const filtered = flows.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !search || f.title.toLowerCase().includes(q) || f.product.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    const matchCat = selectedCategory === "Todos" || f.category === selectedCategory;
    const matchTag = !selectedTag || f.tags.includes(selectedTag);
    return matchSearch && matchCat && matchTag;
  });
  
  const filteredPlaybooks = dbPlaybooks.length > 0 
    ? dbPlaybooks.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : playbooksData.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  const toggleExpand = (id: string) => {
    setExpandedFlow(expandedFlow === id ? null : id);
    setExpandedPlaybook(null);
  };

  const togglePlaybookExpand = (id: string) => {
    setExpandedPlaybook(expandedPlaybook === id ? null : id);
    setExpandedFlow(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px] mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border mb-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4 text-[#3ecf8e]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Fluxos, playbooks e manuais unificados</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                onClick={() => setAdminOpen(v => !v)}
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-2 text-xs border-border transition-all",
                  adminOpen && "bg-amber-500/10 border-amber-500/30 text-amber-400"
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                Gerenciar Base
              </Button>
              <Button
                onClick={() => setBuilderOpen(true)}
                size="sm"
                className="h-9 gap-2 text-xs bg-[#3ecf8e] text-black font-semibold hover:bg-[#3ecf8e]/90"
              >
                <Workflow className="h-3.5 w-3.5" />
                Novo Playbook
              </Button>
            </>
          )}
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar fluxo..."
              className="w-full h-9 pl-9 pr-8 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Admin Panel (only admins) ── */}
      {isAdmin && adminOpen && (
        <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden shadow-sm">
          {/* Admin header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-amber-500/5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Administração da Base de Conhecimento</h2>
                <p className="text-[10px] text-muted-foreground">Visível apenas para administradores</p>
              </div>
            </div>
            <Button
              onClick={() => { setEditingFlow(null); setModalOpen(true); }}
              size="sm"
              className="h-8 gap-1.5 bg-[#3ecf8e] text-black text-xs font-semibold hover:bg-[#3ecf8e]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Fluxo
            </Button>
          </div>

          {/* Flow list for admin */}
          {flows.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Nenhum fluxo cadastrado ainda.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Clique em "Novo Fluxo" para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {flows.map((flow, idx) => (
                <div key={flow.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/10 transition-colors group">
                  {/* Order indicator */}
                  <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0">{idx + 1}</span>
                  {/* Color dot */}
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: flow.color }} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{flow.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{flow.product}</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">{flow.category}</span>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{flow.steps.length} etapas</span>
                    </div>
                  </div>
                  {/* Tags preview */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    {flow.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground border border-border/50">{tag}</span>
                    ))}
                    {flow.tags.length > 2 && (
                      <span className="text-[9px] text-muted-foreground/50">+{flow.tags.length - 2}</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingFlow(flow); setModalOpen(true); }}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-all"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(flow.id)}
                      disabled={deleting === flow.id}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                      title="Excluir"
                    >
                      {deleting === flow.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-all",
                selectedCategory === cat
                  ? "bg-[#3ecf8e]/15 border-[#3ecf8e]/40 text-[#3ecf8e]"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >{cat}</button>
          ))}
        </div>
        {allTags.length > 0 && (
          <>
            <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 flex-wrap">
              {allTags.slice(0, 8).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-all",
                    selectedTag === tag
                      ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-[#3ecf8e]"
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Flow Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(flow => {
            const isExpanded = expandedFlow === flow.id;
            return (
              <div
                key={flow.id}
                className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 hover:border-border/80"
                style={{ boxShadow: isExpanded ? `0 0 0 1px ${flow.color}22` : undefined }}
              >
                {/* Card header (clickable) */}
                <button
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-secondary/10 transition-colors"
                  onClick={() => setExpandedFlow(isExpanded ? null : flow.id)}
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${flow.color}15`, border: `1px solid ${flow.color}30` }}
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: flow.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-foreground">{flow.title}</h2>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${flow.color}15`, color: flow.color }}
                      >{flow.product}</span>
                      <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50 border border-border/50">{flow.category}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{flow.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">{flow.steps.length} etapas</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded flowchart */}
                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mt-4 mb-6 max-w-2xl leading-relaxed">{flow.description}</p>

                    {/* Tags */}
                    {flow.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
                        {flow.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-secondary/40 border border-border/50 text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Vertical flowchart */}
                    <div className="flex flex-col items-center w-full max-w-[640px] mx-auto">
                      {flow.steps.map((step, idx) => {
                        const isLast = idx === flow.steps.length - 1;
                        const isFirst = idx === 0;
                        const isStepExpanded = expandedStep === step.id;
                        const accent = isFirst || isLast;

                        return (
                          <div key={step.id} className="flex flex-col items-center w-full">
                            <button
                              onClick={() => setExpandedStep(isStepExpanded ? null : step.id)}
                              className="w-full rounded-xl border transition-all duration-200 text-left"
                              style={{
                                borderColor: accent ? `${flow.color}60` : "#2a2a2a",
                                backgroundColor: accent ? `${flow.color}08` : "transparent",
                              }}
                            >
                              <div className="flex items-center gap-3 px-5 py-3.5">
                                <div
                                  className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black"
                                  style={{
                                    backgroundColor: accent ? `${flow.color}20` : "#2a2a2a",
                                    color: accent ? flow.color : "#737373",
                                    border: `1px solid ${accent ? `${flow.color}40` : "#3a3a3a"}`,
                                  }}
                                >
                                  {accent ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground leading-snug">{step.label}</p>
                                  {step.actor && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                      <span className="opacity-60">Responsável:</span>{" "}
                                      <span style={{ color: accent ? flow.color : undefined }}>{step.actor}</span>
                                    </p>
                                  )}
                                </div>
                                {step.description && (
                                  <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform", isStepExpanded && "rotate-90")} />
                                )}
                              </div>
                              {isStepExpanded && step.description && (
                                <div className="px-5 pb-4 border-t border-border/40">
                                  <p className="text-xs text-muted-foreground leading-relaxed pt-3">{step.description}</p>
                                </div>
                              )}
                            </button>

                            {!isLast && (
                              <div className="flex flex-col items-center my-1.5">
                                <div className="w-0.5 h-4" style={{ backgroundColor: `${flow.color}40` }} />
                                <ArrowDownCircle className="h-4 w-4" style={{ color: `${flow.color}60` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
                      Clique em cada etapa para ver detalhes · {flow.steps.length} etapas no total
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <BookOpen className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Nenhum fluxo encontrado</p>
              <button
                onClick={() => { setSearch(""); setSelectedCategory("Todos"); setSelectedTag(null); }}
                className="text-xs text-[#3ecf8e] hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Playbooks Interativos ── */}
      {filteredPlaybooks.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          <h2 className="text-sm font-semibold text-muted-foreground mb-1">Playbooks Interativos</h2>
          {filteredPlaybooks.map(pb => (
            <div key={pb.id} className="border border-border rounded-lg bg-card/50 overflow-hidden transition-all duration-300">
              <div className="p-2">
                <div className="w-full flex items-center justify-between p-3 rounded-md hover:bg-white/5 transition-colors">
                  <button 
                    onClick={() => togglePlaybookExpand(pb.id)}
                    className="flex-1 flex items-center gap-4 text-left mr-4"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#3ecf8e20' }}>
                      <Workflow className="w-5 h-5" style={{ color: '#3ecf8e' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{pb.title}</h3>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#3ecf8e]/10 text-[#3ecf8e]">Interativo</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pb.description}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditingPlaybook(pb); setBuilderOpen(true); }}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-all"
                          title="Editar Playbook"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlaybook(pb.id)}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                          title="Excluir Playbook"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => togglePlaybookExpand(pb.id)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", expandedPlaybook === pb.id && "rotate-180")} />
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedPlaybook === pb.id && (
                <div className="border-t border-border p-4 bg-background">
                  <PlaybookViewer playbook={pb} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Admin Modal ── */}
      {isAdmin && (
        <FlowModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingFlow(null); }}
          onSaved={() => { setModalOpen(false); setEditingFlow(null); load(); }}
          editingFlow={editingFlow}
        />
      )}

      {/* ── Playbook Builder ── */}
      {isAdmin && builderOpen && (
        <PlaybookBuilder
          initialPlaybook={editingPlaybook || undefined}
          onClose={() => { setBuilderOpen(false); setEditingPlaybook(null); }}
          onSaved={() => { setBuilderOpen(false); setEditingPlaybook(null); load(); }}
        />
      )}
    </div>
  );
}
