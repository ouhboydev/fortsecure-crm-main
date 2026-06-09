import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Loader2, ArrowUp, ArrowDown, X, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

interface FlowStep {
  id: string;
  label: string;
  description?: string;
  actor?: string;
  type?: "start" | "step" | "end";
}

interface KbFlow {
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

const PRESET_COLORS = [
  { label: "Verde",    value: "#3ecf8e" },
  { label: "Azul",     value: "#1eaedb" },
  { label: "Âmbar",   value: "#f59e0b" },
  { label: "Vermelho", value: "#e84a5f" },
  { label: "Roxo",     value: "#a78bfa" },
  { label: "Laranja",  value: "#f97316" },
  { label: "Ciano",    value: "#06b6d4" },
  { label: "Rosa",     value: "#ec4899" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingFlow: KbFlow | null;
}

function newStep(): FlowStep {
  return { id: crypto.randomUUID(), label: "", description: "", actor: "", type: "step" };
}

export function FlowModal({ open, onClose, onSaved, editingFlow }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("#3ecf8e");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [steps, setSteps] = useState<FlowStep[]>([newStep()]);
  const [activeTab, setActiveTab] = useState<"info" | "steps">("info");

  useEffect(() => {
    if (!open) return;
    if (editingFlow) {
      setTitle(editingFlow.title);
      setProduct(editingFlow.product);
      setCategory(editingFlow.category);
      setColor(editingFlow.color);
      setDescription(editingFlow.description || "");
      setTagsRaw(editingFlow.tags.join(", "));
      setSteps(editingFlow.steps.length > 0 ? editingFlow.steps : [newStep()]);
    } else {
      setTitle(""); setProduct(""); setCategory(""); setColor("#3ecf8e");
      setDescription(""); setTagsRaw(""); setSteps([newStep()]);
    }
    setActiveTab("info");
  }, [open, editingFlow]);

  function updateStep(id: string, field: keyof FlowStep, val: string) {
    setSteps(s => s.map(st => st.id === id ? { ...st, [field]: val } : st));
  }
  function addStep() { setSteps(s => [...s, newStep()]); }
  function removeStep(id: string) { setSteps(s => s.filter(st => st.id !== id)); }
  function moveStep(idx: number, dir: -1 | 1) {
    setSteps(s => {
      const arr = [...s];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  }

  async function handleSave() {
    if (!title.trim() || !product.trim()) {
      toast.error("Título e produto são obrigatórios");
      return;
    }
    if (steps.some(s => !s.label.trim())) {
      toast.error("Todas as etapas precisam de um título");
      setActiveTab("steps");
      return;
    }
    setSaving(true);
    try {
      const finalSteps = steps.map((s, i) => ({
        ...s,
        type: i === 0 ? "start" : i === steps.length - 1 ? "end" : "step",
      }));
      const payload = {
        title: title.trim(),
        product: product.trim(),
        category: category.trim() || "Geral",
        color,
        description: description.trim(),
        tags: tagsRaw.split(",").map(t => t.trim()).filter(Boolean),
        steps: finalSteps,
        updated_at: new Date().toISOString(),
      };
      if (editingFlow) {
        const { error } = await supabase.from("knowledge_flows" as any).update(payload as any).eq("id", editingFlow.id);
        if (error) throw error;
        toast.success("Fluxo atualizado!");
      } else {
        const { error } = await supabase.from("knowledge_flows" as any).insert({
          ...payload, created_by: user?.id, order: 999,
        } as any);
        if (error) throw error;
        toast.success("Fluxo criado!");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-background border border-border rounded-xl p-0 overflow-hidden max-w-2xl shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-semibold text-foreground">
            {editingFlow ? "Editar Fluxo" : "Novo Fluxo"}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border mx-6 mt-4">
          {(["info", "steps"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-all",
                activeTab === tab
                  ? "border-[#3ecf8e] text-[#3ecf8e]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "info" ? "Informações" : `Etapas (${steps.length})`}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* ── Tab: Info ── */}
          {activeTab === "info" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Título *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Fluxo Pós-Venda — KnowBe4" className="h-9 bg-secondary border-border text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Produto *</Label>
                  <Input value={product} onChange={e => setProduct(e.target.value)} placeholder="Ex: KnowBe4" className="h-9 bg-secondary border-border text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Pós-Aceite" className="h-9 bg-secondary border-border text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tags (separadas por vírgula)</Label>
                  <Input value={tagsRaw} onChange={e => setTagsRaw(e.target.value)} placeholder="Ex: KnowBe4, Licenças" className="h-9 bg-secondary border-border text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva brevemente o propósito deste fluxo..."
                  rows={3}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor do Fluxo</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.label}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                        color === c.value ? "border-white scale-110 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <div className="flex items-center gap-2 ml-1">
                    <div className="h-7 w-7 rounded-full border border-border overflow-hidden">
                      <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-10 w-10 -m-1 cursor-pointer" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{color}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Steps ── */}
          {activeTab === "steps" && (
            <div className="space-y-3">
              {steps.map((step, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === steps.length - 1;
                return (
                  <div
                    key={step.id}
                    className="rounded-lg border p-4 space-y-3 transition-all"
                    style={{
                      borderColor: isFirst || isLast ? `${color}50` : "#2a2a2a",
                      backgroundColor: isFirst || isLast ? `${color}08` : "transparent",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isFirst ? "Início" : isLast ? "Fim" : `Etapa ${idx}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveStep(idx, -1)} disabled={isFirst} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                        <button onClick={() => moveStep(idx, 1)} disabled={isLast} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                        <button onClick={() => removeStep(step.id)} disabled={steps.length <= 1} className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Título da Etapa *</Label>
                        <Input value={step.label} onChange={e => updateStep(step.id, "label", e.target.value)} placeholder="O que acontece nesta etapa?" className="h-8 bg-background border-border text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Responsável</Label>
                        <Input value={step.actor || ""} onChange={e => updateStep(step.id, "actor", e.target.value)} placeholder="Ex: Fort Secure (Vendedor)" className="h-8 bg-background border-border text-sm" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Descrição detalhada</Label>
                        <textarea
                          value={step.description || ""}
                          onChange={e => updateStep(step.id, "description", e.target.value)}
                          placeholder="Explique o que acontece nesta etapa..."
                          rows={2}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#3ecf8e]/50 resize-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addStep}
                className="w-full h-9 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:border-[#3ecf8e]/40 hover:text-[#3ecf8e] transition-all flex items-center justify-center gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Etapa
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-3 border-t border-border gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 border-border text-xs">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-[2] h-9 bg-[#3ecf8e] text-black font-semibold text-xs hover:bg-[#3ecf8e]/90 gap-2">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {editingFlow ? "Salvar Alterações" : "Criar Fluxo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
