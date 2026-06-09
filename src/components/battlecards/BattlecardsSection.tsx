import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Shield, Plus, Pencil, Trash2, Loader2, X,
  ChevronDown, ChevronUp, Search, Tag, CheckCircle2,
  AlertTriangle, MessageSquare, Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Objection {
  question: string;
  answer: string;
}

interface Battlecard {
  id: string;
  competitor_name: string;
  description: string | null;
  logo_emoji: string;
  color: string;
  our_strengths: string[];
  their_strengths: string[];
  objections: Objection[];
  tags: string[];
  created_at: string;
}

type EditingCard = Omit<Battlecard, "id" | "created_at"> & { id?: string };

const EMPTY_CARD: EditingCard = {
  competitor_name: "",
  description: "",
  logo_emoji: "🏢",
  color: "#e11d48",
  our_strengths: [""],
  their_strengths: [""],
  objections: [{ question: "", answer: "" }],
  tags: [],
};

const EMOJI_OPTIONS = ["🏢", "🏦", "💼", "🎯", "⚡", "🔥", "🌐", "🛡️", "🚀", "💡"];
const COLOR_OPTIONS = [
  "#e11d48", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

// ─── Admin Modal ──────────────────────────────────────────────────────────────

function BattlecardModal({
  open,
  card,
  onClose,
  onSaved,
}: {
  open: boolean;
  card: EditingCard | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditingCard>(card ?? EMPTY_CARD);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setForm(card ?? EMPTY_CARD);
    setTagInput("");
  }, [card, open]);

  if (!open) return null;

  const updateStrength = (
    field: "our_strengths" | "their_strengths",
    index: number,
    value: string
  ) => {
    const arr = [...form[field]];
    arr[index] = value;
    setForm(f => ({ ...f, [field]: arr }));
  };

  const addStrength = (field: "our_strengths" | "their_strengths") =>
    setForm(f => ({ ...f, [field]: [...f[field], ""] }));

  const removeStrength = (field: "our_strengths" | "their_strengths", index: number) =>
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));

  const updateObjection = (index: number, key: keyof Objection, value: string) => {
    const arr = form.objections.map((o, i) => i === index ? { ...o, [key]: value } : o);
    setForm(f => ({ ...f, objections: arr }));
  };

  const addObjection = () =>
    setForm(f => ({ ...f, objections: [...f.objections, { question: "", answer: "" }] }));

  const removeObjection = (index: number) =>
    setForm(f => ({ ...f, objections: f.objections.filter((_, i) => i !== index) }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  async function handleSave() {
    if (!form.competitor_name.trim()) {
      toast.error("Nome do concorrente é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        competitor_name: form.competitor_name.trim(),
        description: form.description || null,
        logo_emoji: form.logo_emoji,
        color: form.color,
        our_strengths: form.our_strengths.filter(s => s.trim()),
        their_strengths: form.their_strengths.filter(s => s.trim()),
        objections: form.objections.filter(o => o.question.trim()),
        tags: form.tags,
        updated_at: new Date().toISOString(),
      };

      if (form.id) {
        const { error } = await supabase
          .from("battlecards" as any)
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast.success("Battlecard atualizado!");
      } else {
        const { error } = await supabase.from("battlecards" as any).insert(payload);
        if (error) throw error;
        toast.success("Battlecard criado!");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-[#3ecf8e]" />
            <h2 className="text-sm font-semibold text-foreground">
              {form.id ? "Editar Battlecard" : "Novo Battlecard"}
            </h2>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Identidade */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identidade</h3>
            <div className="grid grid-cols-[auto,1fr] gap-3">
              {/* Emoji */}
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Ícone</label>
                <div className="flex flex-wrap gap-1.5 w-[160px]">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setForm(f => ({ ...f, logo_emoji: e }))}
                      className={cn(
                        "h-8 w-8 rounded-lg text-base flex items-center justify-center border transition-all",
                        form.logo_emoji === e
                          ? "border-[#3ecf8e] bg-[#3ecf8e]/10"
                          : "border-border bg-secondary/30 hover:border-border/80"
                      )}
                    >{e}</button>
                  ))}
                </div>
              </div>
              {/* Name + description */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Nome do concorrente *</label>
                  <input
                    value={form.competitor_name}
                    onChange={e => setForm(f => ({ ...f, competitor_name: e.target.value }))}
                    placeholder="Ex: Salesforce, HubSpot..."
                    className="w-full h-9 px-3 bg-secondary/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Descrição</label>
                  <textarea
                    value={form.description ?? ""}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Breve descrição do concorrente..."
                    rows={2}
                    className="w-full px-3 py-2 bg-secondary/30 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">Cor do card</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      form.color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Forças */}
          <div className="grid grid-cols-2 gap-4">
            {/* Nossa vantagem */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Nossas Vantagens
              </h3>
              {form.our_strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={s}
                    onChange={e => updateStrength("our_strengths", i, e.target.value)}
                    placeholder={`Vantagem ${i + 1}...`}
                    className="flex-1 h-8 px-2.5 bg-secondary/30 border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#22c55e]/50"
                  />
                  {form.our_strengths.length > 1 && (
                    <button onClick={() => removeStrength("our_strengths", i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addStrength("our_strengths")}
                className="text-[11px] text-[#22c55e] hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </section>

            {/* Pontos fortes deles */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Pontos Fortes Deles
              </h3>
              {form.their_strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={s}
                    onChange={e => updateStrength("their_strengths", i, e.target.value)}
                    placeholder={`Ponto forte ${i + 1}...`}
                    className="flex-1 h-8 px-2.5 bg-secondary/30 border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50"
                  />
                  {form.their_strengths.length > 1 && (
                    <button onClick={() => removeStrength("their_strengths", i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => addStrength("their_strengths")}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </section>
          </div>

          {/* Objeções */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-[#3ecf8e] flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Objeções & Como Rebater
            </h3>
            {form.objections.map((obj, i) => (
              <div key={i} className="bg-secondary/20 border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-1.5">
                  <div className="flex-1 space-y-2">
                    <input
                      value={obj.question}
                      onChange={e => updateObjection(i, "question", e.target.value)}
                      placeholder='Objeção do cliente... Ex: "Vocês são mais caros"'
                      className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50"
                    />
                    <textarea
                      value={obj.answer}
                      onChange={e => updateObjection(i, "answer", e.target.value)}
                      placeholder="Como rebater essa objeção..."
                      rows={2}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50 resize-none"
                    />
                  </div>
                  {form.objections.length > 1 && (
                    <button onClick={() => removeObjection(i)} className="text-muted-foreground hover:text-destructive mt-1 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={addObjection}
              className="text-[11px] text-[#3ecf8e] hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar objeção
            </button>
          </section>

          {/* Tags */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Adicionar tag e pressionar Enter..."
                className="flex-1 h-8 px-2.5 bg-secondary/30 border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50"
              />
              <button
                onClick={addTag}
                className="h-8 px-3 text-xs bg-secondary/50 border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                Adicionar
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-secondary/50 border border-border/50 text-muted-foreground">
                    {tag}
                    <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}>
                      <X className="h-2.5 w-2.5 hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-card">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 text-xs bg-[#3ecf8e] text-black font-semibold hover:bg-[#3ecf8e]/90"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : form.id ? "Salvar" : "Criar Battlecard"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function BattlecardCard({
  card,
  isAdmin,
  onEdit,
  onDelete,
}: {
  card: Battlecard;
  isAdmin: boolean;
  onEdit: (card: Battlecard) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"strengths" | "objections">("strengths");

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300"
      style={{ boxShadow: expanded ? `0 0 0 1px ${card.color}30` : undefined }}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/10 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
        >
          {card.logo_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{card.competitor_name}</h3>
            {card.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 border border-border/50 text-muted-foreground">{tag}</span>
            ))}
          </div>
          {card.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{card.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-[#22c55e]" />{card.our_strengths.length} vantagens</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-[#3ecf8e]" />{card.objections.length} objeções</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => onEdit(card)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-all"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/50">
          {/* Tab selector */}
          <div className="flex border-b border-border/50">
            <button
              onClick={() => setActiveTab("strengths")}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                activeTab === "strengths"
                  ? "text-foreground border-b-2 border-[#3ecf8e]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Vantagens vs. Deles
            </button>
            <button
              onClick={() => setActiveTab("objections")}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                activeTab === "objections"
                  ? "text-foreground border-b-2 border-[#3ecf8e]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Objeções ({card.objections.length})
            </button>
          </div>

          {activeTab === "strengths" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
              {/* Nossas vantagens */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#22c55e] flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> Nossas Vantagens
                </h4>
                {card.our_strengths.length > 0 ? (
                  <ul className="space-y-1.5">
                    {card.our_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <div className="h-4 w-4 rounded-full bg-[#22c55e]/15 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                        </div>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Nenhuma vantagem cadastrada</p>
                )}
              </div>

              {/* Pontos fortes deles */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> Pontos Fortes Deles
                </h4>
                {card.their_strengths.length > 0 ? (
                  <ul className="space-y-1.5">
                    {card.their_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                        <div className="h-4 w-4 rounded-full bg-amber-400/15 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        </div>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Nenhum ponto registrado</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "objections" && (
            <div className="p-5 space-y-3">
              {card.objections.length > 0 ? (
                card.objections.map((obj, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-secondary/20">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground/90">{obj.question}</p>
                    </div>
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-[#3ecf8e]/5 border-t border-border/30">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#3ecf8e] shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{obj.answer}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-muted-foreground italic text-center py-4">
                  Nenhuma objeção cadastrada para este concorrente
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export function BattlecardsSection() {
  const { isAdmin } = useAuth();
  const [cards, setCards] = useState<Battlecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<EditingCard | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("battlecards" as any)
        .select("*")
        .order("created_at", { ascending: true }) as any;
      if (error) throw error;
      const parsed = (data || []).map((d: any) => ({
        ...d,
        our_strengths: Array.isArray(d.our_strengths) ? d.our_strengths : [],
        their_strengths: Array.isArray(d.their_strengths) ? d.their_strengths : [],
        objections: Array.isArray(d.objections) ? d.objections : [],
        tags: Array.isArray(d.tags) ? d.tags : [],
      }));
      setCards(parsed);
    } catch (err: any) {
      console.error("Erro ao carregar battlecards:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este battlecard? Esta ação não pode ser desfeita.")) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from("battlecards" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Battlecard excluído");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  function openCreate() {
    setEditingCard({ ...EMPTY_CARD });
    setModalOpen(true);
  }

  function openEdit(card: Battlecard) {
    setEditingCard({
      id: card.id,
      competitor_name: card.competitor_name,
      description: card.description ?? "",
      logo_emoji: card.logo_emoji,
      color: card.color,
      our_strengths: card.our_strengths.length ? card.our_strengths : [""],
      their_strengths: card.their_strengths.length ? card.their_strengths : [""],
      objections: card.objections.length ? card.objections : [{ question: "", answer: "" }],
      tags: card.tags,
    });
    setModalOpen(true);
  }

  const allTags = Array.from(new Set(cards.flatMap(c => c.tags)));

  const filtered = cards.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !search || c.competitor_name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    const matchTag = !selectedTag || c.tags.includes(selectedTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all",
                selectedTag === tag
                  ? "bg-[#3ecf8e]/10 border-[#3ecf8e]/30 text-[#3ecf8e]"
                  : "bg-secondary/30 border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Tag className="h-2.5 w-2.5" />{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar concorrente..."
              className="h-9 pl-8 pr-8 w-[180px] bg-card border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onClick={openCreate}
              className="h-9 gap-2 text-xs bg-[#3ecf8e] text-black font-semibold hover:bg-[#3ecf8e]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Battlecard
            </Button>
          )}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[#3ecf8e]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Swords className="h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            {cards.length === 0
              ? "Nenhum battlecard cadastrado ainda"
              : "Nenhum concorrente encontrado"}
          </p>
          {isAdmin && cards.length === 0 && (
            <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5 bg-[#3ecf8e] text-black font-semibold hover:bg-[#3ecf8e]/90">
              <Plus className="h-3.5 w-3.5" /> Criar primeiro battlecard
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(card => (
            <BattlecardCard
              key={card.id}
              card={card}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <BattlecardModal
        open={modalOpen}
        card={editingCard}
        onClose={() => { setModalOpen(false); setEditingCard(null); }}
        onSaved={() => { setModalOpen(false); setEditingCard(null); load(); }}
      />
    </div>
  );
}
