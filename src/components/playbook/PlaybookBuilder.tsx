import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  ReactFlowProvider,
  Handle,
  Position,
  BackgroundVariant,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Playbook, PlaybookNodeType } from '@/lib/playbooks-data';
import { 
  Save, Plus, Trash2, X, Settings2, ArrowLeft, Copy,
  GitFork, CheckSquare, Flag
} from 'lucide-react';

interface PlaybookBuilderProps {
  initialPlaybook?: Playbook;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  task: '#3ecf8e',
  condition: '#f59e0b',
  end: '#ef4444',
};

const CustomNodeComponent = ({ data, selected }: any) => {
  const color = NODE_COLORS[data.type] || '#3ecf8e';
  const Icon = data.type === 'task' 
    ? CheckSquare 
    : data.type === 'condition' 
    ? GitFork 
    : Flag;

  return (
    <div
      style={{
        border: `2px solid ${selected ? color : '#27272a'}`,
        boxShadow: selected ? `0 0 12px ${color}40` : '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        transition: 'all 0.2s ease-in-out',
      }}
      className="bg-[#18181b] hover:bg-[#202024] rounded-xl px-4 py-3 min-w-[180px] max-w-[235px] select-none text-left"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 8, height: 8 }}
      />
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span
          className="text-[8px] uppercase font-bold tracking-wider"
          style={{ color }}
        >
          {data.type === 'task'
            ? 'Tarefa'
            : data.type === 'condition'
            ? 'Condição'
            : 'Fim'}
        </span>
      </div>
      <div className="font-semibold text-xs leading-tight text-white truncate">
        {data.title || 'Sem título'}
      </div>
      {data.description && (
        <div className="text-[10px] text-zinc-400 mt-1.5 line-clamp-2 leading-normal">
          {data.description}
        </div>
      )}
      
      {/* Condições Visuais no Nó */}
      {data.type === 'condition' && data.options && data.options.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-zinc-800 space-y-1">
          {data.options.map((opt: any) => (
            <div
              key={opt.id}
              className="text-[9px] text-zinc-300 bg-zinc-900/60 rounded px-2 py-1 flex items-center justify-between border border-zinc-800/40"
            >
              <span className="truncate mr-1 font-medium">{opt.label}</span>
              {opt.targetId ? (
                <span className="text-[7px] bg-[#3ecf8e]/10 text-[#3ecf8e] px-1 rounded border border-[#3ecf8e]/20 shrink-0 font-semibold">
                  → Conectado
                </span>
              ) : (
                <span className="text-[7px] bg-red-500/10 text-red-400 px-1 rounded border border-red-500/20 shrink-0 font-semibold">
                  Pendente
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 8, height: 8 }}
      />
    </div>
  );
};

const nodeTypes = { custom: CustomNodeComponent };

let idCounter = 200;
const getId = () => `node-${idCounter++}`;

// ─── Builder Content ──────────────────────────────────────────────────────────

function BuilderContent({ initialPlaybook, onClose, onSaved }: PlaybookBuilderProps) {
  const [title, setTitle] = useState(initialPlaybook?.title || 'Novo Playbook');
  const [description, setDescription] = useState(initialPlaybook?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [nodes, setNodes] = useState<Node[]>(
    initialPlaybook?.nodes.map((n) => ({
      id: n.id,
      position: n.position ?? { x: 100, y: 100 },
      data: { ...n },
      type: 'custom',
    })) || []
  );

  const [edges, setEdges] = useState<Edge[]>(
    initialPlaybook?.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      style: { stroke: '#3ecf8e', strokeWidth: 2 },
      labelStyle: { fill: '#fff', fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: '#171717', fillOpacity: 0.9 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
    })) || []
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) => {
      // Sincronizar conexão a partir de uma condição
      let edgeLabel = '';
      setNodes((nds) => {
        const sourceNode = nds.find((n) => n.id === params.source);
        if (sourceNode && sourceNode.data.type === 'condition') {
          const options = [...((sourceNode.data.options as any[]) || [])];
          const openOptIndex = options.findIndex((o) => !o.targetId);
          if (openOptIndex !== -1) {
            options[openOptIndex] = { ...options[openOptIndex], targetId: params.target };
            edgeLabel = options[openOptIndex].label;
          } else {
            const newLabel = `Opção ${options.length + 1}`;
            options.push({
              id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              label: newLabel,
              targetId: params.target,
            });
            edgeLabel = newLabel;
          }
          return nds.map((n) => (n.id === params.source ? { ...n, data: { ...n.data, options } } : n));
        }
        return nds;
      });

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            label: edgeLabel || undefined,
            style: { stroke: '#3ecf8e', strokeWidth: 2 },
            labelStyle: { fill: '#fff', fontWeight: 700, fontSize: 11 },
            labelBgStyle: { fill: '#171717', fillOpacity: 0.9 },
            labelBgPadding: [4, 6] as [number, number],
            labelBgBorderRadius: 4,
          },
          eds
        )
      );
    },
    []
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const addNode = (type: PlaybookNodeType) => {
    const id = getId();
    const newNode: Node = {
      id,
      type: 'custom',
      position: { x: 150 + Math.random() * 200, y: 80 + Math.random() * 200 },
      data: {
        id,
        type,
        title:
          type === 'task'
            ? 'Nova Tarefa'
            : type === 'condition'
            ? 'Nova Condição'
            : 'Fim do Fluxo',
        description: '',
        options:
          type === 'condition'
            ? [{ id: `opt-${Date.now()}`, label: 'Opção A', targetId: '' }]
            : undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
  };

  const updateSelectedNodeData = (key: string, value: any) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, [key]: value } } : n
      )
    );
  };

  // ─── Novas Ações de Sincronização ──────────────────────────────────────────

  const updateConditionOptionLabel = (optionIndex: number, newLabel: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const node = nds.find((n) => n.id === selectedNodeId);
      if (!node || node.data.type !== 'condition') return nds;

      const options = [...((node.data.options as any[]) || [])];
      const targetId = options[optionIndex]?.targetId;
      options[optionIndex] = { ...options[optionIndex], label: newLabel };

      // Se existir uma aresta conectada a esse target, atualiza a label dela
      if (targetId) {
        setEdges((eds) =>
          eds.map((e) =>
            e.source === selectedNodeId && e.target === targetId
              ? { ...e, label: newLabel }
              : e
          )
        );
      }

      return nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, options } } : n
      );
    });
  };

  const updateConditionOptionTarget = (optionIndex: number, newTargetId: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const node = nds.find((n) => n.id === selectedNodeId);
      if (!node || node.data.type !== 'condition') return nds;

      const options = [...((node.data.options as any[]) || [])];
      const oldTargetId = options[optionIndex]?.targetId;
      const optionLabel = options[optionIndex]?.label || '';
      options[optionIndex] = { ...options[optionIndex], targetId: newTargetId };

      setEdges((eds) => {
        let updatedEdges = [...eds];

        // Remover aresta antiga se não for usada por nenhuma outra opção
        if (oldTargetId) {
          const isOldTargetStillUsed = options.some((o, idx) => idx !== optionIndex && o.targetId === oldTargetId);
          if (!isOldTargetStillUsed) {
            updatedEdges = updatedEdges.filter(
              (e) => !(e.source === selectedNodeId && e.target === oldTargetId)
            );
          }
        }

        // Adicionar ou atualizar aresta nova
        if (newTargetId) {
          const existingEdgeIndex = updatedEdges.findIndex(
            (e) => e.source === selectedNodeId && e.target === newTargetId
          );

          if (existingEdgeIndex !== -1) {
            updatedEdges[existingEdgeIndex] = {
              ...updatedEdges[existingEdgeIndex],
              label: optionLabel,
            };
          } else {
            updatedEdges.push({
              id: `edge-${selectedNodeId}-${newTargetId}-${Date.now()}`,
              source: selectedNodeId,
              target: newTargetId,
              label: optionLabel,
              style: { stroke: '#3ecf8e', strokeWidth: 2 },
              labelStyle: { fill: '#fff', fontWeight: 700, fontSize: 11 },
              labelBgStyle: { fill: '#171717', fillOpacity: 0.9 },
              labelBgPadding: [4, 6] as [number, number],
              labelBgBorderRadius: 4,
            });
          }
        }

        return updatedEdges;
      });

      return nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, options } } : n
      );
    });
  };

  const deleteConditionOption = (optionIndex: number) => {
    if (!selectedNodeId) return;
    setNodes((nds) => {
      const node = nds.find((n) => n.id === selectedNodeId);
      if (!node || node.data.type !== 'condition') return nds;

      const options = [...((node.data.options as any[]) || [])];
      const targetId = options[optionIndex]?.targetId;
      options.splice(optionIndex, 1);

      // Remover aresta correspondente se não for usada por mais ninguém
      if (targetId) {
        const isTargetStillUsed = options.some((o) => o.targetId === targetId);
        if (!isTargetStillUsed) {
          setEdges((eds) =>
            eds.filter((e) => !(e.source === selectedNodeId && e.target === targetId))
          );
        }
      }

      return nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, options } } : n
      );
    });
  };

  const updateTaskNextNode = (newTargetId: string) => {
    if (!selectedNodeId) return;

    setEdges((eds) => {
      let updatedEdges = eds.filter((e) => e.source !== selectedNodeId);

      if (newTargetId) {
        updatedEdges.push({
          id: `edge-${selectedNodeId}-${newTargetId}-${Date.now()}`,
          source: selectedNodeId,
          target: newTargetId,
          style: { stroke: '#3ecf8e', strokeWidth: 2 },
        });
      }
      return updatedEdges;
    });

    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, nextId: newTargetId || undefined } } : n
      )
    );
  };

  const duplicateSelectedNode = () => {
    if (!selectedNodeId) return;
    const nodeToDuplicate = nodes.find((n) => n.id === selectedNodeId);
    if (!nodeToDuplicate) return;

    const newId = getId();
    const duplicatedNode: Node = {
      id: newId,
      type: 'custom',
      position: {
        x: nodeToDuplicate.position.x + 40,
        y: nodeToDuplicate.position.y + 40,
      },
      data: {
        ...nodeToDuplicate.data,
        id: newId,
        title: `${nodeToDuplicate.data.title} (Cópia)`,
        options: nodeToDuplicate.data.type === 'condition'
          ? ((nodeToDuplicate.data.options as any[]) || []).map((o) => ({
              ...o,
              id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              targetId: '', // Começa sem target na cópia
            }))
          : undefined,
        nextId: undefined, // Começa sem destino
      },
    };

    setNodes((nds) => [...nds, duplicatedNode]);
    setSelectedNodeId(newId);
    toast.success('Nó duplicado com sucesso!');
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    
    // Se for condição e tiver opções conectadas, limpar ao deletar
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node && node.data.type === 'condition') {
      const options = (node.data.options as any[]) || [];
      options.forEach((opt) => {
        if (opt.targetId) {
          setEdges((eds) => eds.filter((e) => !(e.source === selectedNodeId && e.target === opt.targetId)));
        }
      });
    }

    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
      )
    );
    setSelectedNodeId(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Dê um título ao playbook.');
      return;
    }
    setIsSaving(true);
    try {
      const playbookNodes = nodes.map((n) => ({
        ...n.data,
        id: n.id,
        position: n.position,
        title: (n.data.title as string) || 'Sem Título',
      }));

      // Sincronização defensiva durante o salvamento
      playbookNodes.forEach((pn: any) => {
        if (pn.type === 'task') {
          const outgoing = edges.find((e) => e.source === pn.id);
          pn.nextId = outgoing ? outgoing.target : undefined;
        } else if (pn.type === 'condition' && pn.options) {
          const outgoingEdges = edges.filter((e) => e.source === pn.id);
          pn.options = pn.options.map((opt: any, index: number) => {
            let matchedEdge = outgoingEdges.find((e) => e.label === opt.label);
            if (!matchedEdge && outgoingEdges.length > index) {
              matchedEdge = outgoingEdges[index];
            }
            return {
              ...opt,
              targetId: matchedEdge ? matchedEdge.target : opt.targetId,
            };
          });
        }
      });

      const playbookEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      }));

      const payload = { title, description, nodes: playbookNodes, edges: playbookEdges };

      if (initialPlaybook?.id) {
        await supabase.from('interactive_playbooks' as any).update(payload as any).eq('id', initialPlaybook.id);
      } else {
        await supabase.from('interactive_playbooks' as any).insert(payload as any);
      }

      toast.success('Playbook salvo com sucesso!');
      onSaved();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const otherNodes = nodes.filter((n) => n.id !== selectedNodeId);

  return (
    // z-[200] garante que fica acima do sidebar (z-40) e de qualquer modal
    <div
      className="fixed inset-0 bg-[#111111] flex flex-col"
      style={{ zIndex: 200 }}
    >
      {/* ── Topbar ── */}
      <div className="h-14 border-b border-zinc-800 bg-[#1a1a1a] px-4 flex items-center gap-3 shrink-0">
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="h-5 w-px bg-zinc-700 shrink-0" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do Playbook"
          className="w-56 h-8 text-sm font-semibold bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#3ecf8e]/50"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)…"
          className="w-72 h-8 text-xs bg-zinc-800 border-zinc-700 text-zinc-300 focus-visible:ring-[#3ecf8e]/50 hidden sm:block"
        />
        <div className="flex-1" />
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="h-8 px-4 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {isSaving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Left Toolbar ── */}
        <div className="w-48 border-r border-zinc-800 bg-[#161616] flex flex-col gap-1 p-3 shrink-0">
          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-1 mb-2">
            Adicionar nó
          </p>
          <button
            onClick={() => addNode('task')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-white bg-zinc-800 hover:bg-[#3ecf8e]/15 hover:text-[#3ecf8e] border border-zinc-700 hover:border-[#3ecf8e]/40 transition-all text-left"
          >
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e] shrink-0" />
            Tarefa
          </button>
          <button
            onClick={() => addNode('condition')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-white bg-zinc-800 hover:bg-amber-500/15 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 transition-all text-left"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            Condição
          </button>
          <button
            onClick={() => addNode('end')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-white bg-zinc-800 hover:bg-red-500/15 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 transition-all text-left"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            Fim
          </button>

          <div className="mt-auto pt-3 border-t border-zinc-800">
            <p className="text-[9px] text-zinc-600 leading-relaxed">
              Arraste conexões ou use o menu de propriedades à direita para ligar os nós de forma automática e organizada.
            </p>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="flex-1 min-w-0 min-h-0 relative bg-[#111111]">
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-6 text-center select-none bg-[#111111]/80">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-[#3ecf8e] animate-pulse">
                <Plus className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">Seu Playbook está vazio</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                Clique nos botões do menu esquerdo (Tarefa, Condição, Fim) para começar a estruturar seu fluxo.
              </p>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            colorMode="dark"
            style={{ width: '100%', height: '100%' }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#222"
              gap={20}
            />
            <Controls
              style={{
                background: '#1a1a1a',
                border: '1px solid #3f3f46',
                borderRadius: 8,
              }}
            />
            <MiniMap
              zoomable
              pannable
              style={{
                background: '#161616',
                border: '1px solid #27272a',
                borderRadius: 8,
              }}
              nodeColor={(node) => {
                const type = (node.data?.type as string) || '';
                return NODE_COLORS[type] || '#3ecf8e';
              }}
              maskColor="rgba(0, 0, 0, 0.4)"
            />
          </ReactFlow>
        </div>

        {/* ── Right Properties Panel ── */}
        <div className="w-72 border-l border-zinc-800 bg-[#161616] flex flex-col shrink-0">
          {selectedNode ? (
            <>
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Propriedades</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={duplicateSelectedNode}
                    title="Duplicar Nó"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={deleteSelectedNode}
                    title="Excluir Nó"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400">Título</label>
                  <Input
                    value={selectedNode.data.title as string}
                    onChange={(e) => updateSelectedNodeData('title', e.target.value)}
                    className="h-8 text-sm bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#3ecf8e]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-zinc-400">Descrição</label>
                  <Textarea
                    value={selectedNode.data.description as string}
                    onChange={(e) => updateSelectedNodeData('description', e.target.value)}
                    placeholder="Descreva o que acontece nesta etapa…"
                    className="text-sm min-h-[90px] resize-none bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#3ecf8e]/50"
                  />
                </div>

                {selectedNode.data.type === 'task' && (
                  <div className="space-y-1.5 pt-3 border-t border-zinc-800">
                    <label className="text-[11px] font-medium text-zinc-400">Próximo Passo</label>
                    <select
                      value={edges.find((e) => e.source === selectedNode.id)?.target || ''}
                      onChange={(e) => {
                        const newTargetId = e.target.value;
                        updateTaskNextNode(newTargetId);
                      }}
                      className="w-full h-8 text-xs bg-zinc-850 border border-zinc-700 rounded px-2 text-white bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
                    >
                      <option value="">Sem destino (Fim do fluxo)</option>
                      {otherNodes.map((on) => (
                        <option key={on.id} value={on.id}>
                          {(on.data as any).type === 'task' ? 'Tarefa' : (on.data as any).type === 'condition' ? 'Cond' : 'Fim'}: {(on.data as any).title || 'Sem título'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedNode.data.type === 'condition' && (
                  <div className="space-y-3 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-400">
                        Opções de resposta
                      </label>
                      <button
                        onClick={() => {
                          const opts = (selectedNode.data.options as any[]) || [];
                          updateSelectedNodeData('options', [
                            ...opts,
                            { id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, label: `Opção ${opts.length + 1}`, targetId: '' },
                          ]);
                        }}
                        className="h-5 w-5 rounded flex items-center justify-center text-zinc-400 hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {((selectedNode.data.options as any[]) || []).map(
                        (opt: any, i: number) => (
                          <div key={opt.id} className="flex flex-col gap-1.5 p-2 rounded bg-zinc-900 border border-zinc-800">
                            <div className="flex items-center gap-2">
                              <Input
                                value={opt.label}
                                onChange={(e) => updateConditionOptionLabel(i, e.target.value)}
                                className="h-7 text-xs bg-zinc-800 border-zinc-700 text-white flex-1"
                                placeholder="Nome da opção"
                              />
                              <button
                                onClick={() => deleteConditionOption(i)}
                                className="h-7 w-7 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-medium text-zinc-500 block">Destino da Opção</label>
                              <select
                                value={opt.targetId || ''}
                                onChange={(e) => {
                                  const newTargetId = e.target.value;
                                  updateConditionOptionTarget(i, newTargetId);
                                }}
                                className="w-full h-7 text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1.5 text-white focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
                              >
                                <option value="">Sem destino</option>
                                {otherNodes.map((on) => (
                                  <option key={on.id} value={on.id}>
                                    {(on.data as any).type === 'task' ? 'Tarefa' : (on.data as any).type === 'condition' ? 'Cond' : 'Fim'}: {(on.data as any).title || 'Sem título'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      Você pode arrastar conexões no canvas ou simplesmente escolher o destino de cada opção nos menus suspensos acima.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Settings2 className="w-10 h-10 mb-3 text-zinc-700" />
              <p className="text-sm font-medium text-zinc-400">Nenhum nó selecionado</p>
              <p className="text-[11px] text-zinc-600 mt-1 leading-relaxed">
                Clique em uma caixinha no fluxograma para editar suas propriedades aqui.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlaybookBuilder(props: PlaybookBuilderProps) {
  return ReactDOM.createPortal(
    <ReactFlowProvider>
      <BuilderContent {...props} />
    </ReactFlowProvider>,
    document.body
  );
}
