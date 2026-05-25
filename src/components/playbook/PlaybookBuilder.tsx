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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Playbook, PlaybookNodeType } from '@/lib/playbooks-data';
import { Save, Plus, Trash2, X, Settings2, ArrowLeft } from 'lucide-react';

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
  return (
    <div
      style={{
        border: `2px solid ${selected ? color : '#3f3f46'}`,
        boxShadow: selected ? `0 0 0 3px ${color}30` : undefined,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      className="bg-[#1c1c1c] rounded-xl px-4 py-3 min-w-[170px] max-w-[220px] select-none"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: color, width: 10, height: 10 }}
      />
      <div
        className="text-[8px] uppercase font-black tracking-widest mb-1.5"
        style={{ color }}
      >
        {data.type === 'task'
          ? 'Tarefa'
          : data.type === 'condition'
          ? 'Condição'
          : 'Fim'}
      </div>
      <div className="font-semibold text-[12px] leading-tight text-white">
        {data.title || 'Sem título'}
      </div>
      {data.description && (
        <div className="text-[10px] text-zinc-400 mt-1.5 line-clamp-2">
          {data.description}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: color, width: 10, height: 10 }}
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
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            style: { stroke: '#3ecf8e', strokeWidth: 2 },
          },
          eds
        )
      ),
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
            ? [{ id: getId(), label: 'Opção A', targetId: '' }]
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

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
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

      playbookNodes.forEach((pn: any) => {
        if (pn.type === 'task') {
          const outgoing = edges.find((e) => e.source === pn.id);
          pn.nextId = outgoing ? outgoing.target : undefined;
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
        await supabase.from('interactive_playbooks').update(payload).eq('id', initialPlaybook.id);
      } else {
        await supabase.from('interactive_playbooks').insert(payload);
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
              Clique nos botões acima para adicionar elementos. Arraste os pontos de conexão entre nós para criar setas.
            </p>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div className="flex-1 min-w-0 min-h-0 relative">
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
              color="#2a2a2a"
              gap={20}
            />
            <Controls
              style={{
                background: '#1a1a1a',
                border: '1px solid #3f3f46',
                borderRadius: 8,
              }}
            />
          </ReactFlow>
        </div>

        {/* ── Right Properties Panel ── */}
        <div className="w-72 border-l border-zinc-800 bg-[#161616] flex flex-col shrink-0">
          {selectedNode ? (
            <>
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Propriedades</span>
                <button
                  onClick={deleteSelectedNode}
                  className="h-6 w-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
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

                {selectedNode.data.type === 'condition' && (
                  <div className="space-y-2 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-zinc-400">
                        Opções de resposta
                      </label>
                      <button
                        onClick={() => {
                          const opts = (selectedNode.data.options as any[]) || [];
                          updateSelectedNodeData('options', [
                            ...opts,
                            { id: getId(), label: 'Nova Opção', targetId: '' },
                          ]);
                        }}
                        className="h-5 w-5 rounded flex items-center justify-center text-zinc-400 hover:text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    {((selectedNode.data.options as any[]) || []).map(
                      (opt: any, i: number) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <Input
                            value={opt.label}
                            onChange={(e) => {
                              const opts = [
                                ...((selectedNode.data.options as any[]) || []),
                              ];
                              opts[i] = { ...opts[i], label: e.target.value };
                              updateSelectedNodeData('options', opts);
                            }}
                            className="h-7 text-xs bg-zinc-800 border-zinc-700 text-white"
                          />
                          <button
                            onClick={() => {
                              const opts = (
                                (selectedNode.data.options as any[]) || []
                              ).filter((_: any, idx: number) => idx !== i);
                              updateSelectedNodeData('options', opts);
                            }}
                            className="h-7 w-7 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    )}
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      Puxe as setas do nó até os destinos de cada opção no canvas.
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
