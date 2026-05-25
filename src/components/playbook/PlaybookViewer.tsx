import React, { useState, useMemo } from 'react';
import { Playbook, PlaybookNode } from '@/lib/playbooks-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, CheckCircle2, RotateCcw, Map } from 'lucide-react';
import { ReactFlow, Controls, Background, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface PlaybookViewerProps {
  playbook: Playbook;
}

export function PlaybookViewer({ playbook }: PlaybookViewerProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string>(playbook.nodes[0]?.id);
  const [history, setHistory] = useState<string[]>([]);

  const currentNode = playbook.nodes.find(n => n.id === currentNodeId);

  const handleNext = (nextId: string) => {
    setHistory([...history, currentNodeId]);
    setCurrentNodeId(nextId);
  };

  const handleRestart = () => {
    setHistory([]);
    setCurrentNodeId(playbook.nodes[0]?.id);
  };

  // Preparar dados para o React Flow
  const initialNodes: Node[] = useMemo(() => {
    return playbook.nodes.map((node) => ({
      id: node.id,
      position: node.position,
      data: { label: node.title },
      type: 'default',
      style: {
        background: currentNodeId === node.id ? '#3ecf8e' : '#262626',
        color: '#fff',
        border: currentNodeId === node.id ? '2px solid #fff' : '1px solid #3f3f46',
        borderRadius: '8px',
        padding: '10px',
        fontWeight: currentNodeId === node.id ? 'bold' : 'normal',
        width: 150,
        textAlign: 'center',
        fontSize: '12px'
      }
    }));
  }, [playbook, currentNodeId]);

  const initialEdges: Edge[] = useMemo(() => {
    return playbook.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: history.includes(edge.source) || currentNodeId === edge.source,
      style: { stroke: '#3ecf8e' },
      labelStyle: { fill: '#fff', fontWeight: 700 },
      labelBgStyle: { fill: '#171717' }
    }));
  }, [playbook, history, currentNodeId]);

  return (
    <div className="flex flex-col h-[600px] w-full bg-background border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-xl font-bold text-foreground">{playbook.title}</h2>
        <p className="text-sm text-muted-foreground">{playbook.description}</p>
      </div>

      <Tabs defaultValue="wizard" className="flex-1 flex flex-col w-full h-full">
        <div className="px-4 pt-4 bg-card">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="wizard" className="data-[state=active]:bg-[#3ecf8e] data-[state=active]:text-black">
              Modo Guiado
            </TabsTrigger>
            <TabsTrigger value="flow" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Map className="w-4 h-4 mr-2" />
              Diagrama
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="wizard" className="flex-1 p-6 bg-card m-0 border-none outline-none overflow-y-auto">
          <div className="max-w-2xl mx-auto h-full flex flex-col justify-center">
            {currentNode ? (
              <Card className="border-[#3ecf8e]/30 shadow-lg shadow-[#3ecf8e]/5 bg-background">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-3">
                    {currentNode.type === 'end' ? <CheckCircle2 className="text-[#3ecf8e] w-6 h-6" /> : <div className="w-2 h-2 rounded-full bg-[#3ecf8e]" />}
                    {currentNode.title}
                  </CardTitle>
                  {currentNode.description && (
                    <CardDescription className="text-base mt-2">
                      {currentNode.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-6 border-t border-border/50">
                  {currentNode.type === 'task' && currentNode.nextId && (
                    <Button onClick={() => handleNext(currentNode.nextId!)} className="w-full bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black">
                      Concluído, próximo passo <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}

                  {currentNode.type === 'condition' && currentNode.options && (
                    <div className="flex flex-col gap-3">
                      {currentNode.options.map(opt => (
                        <Button 
                          key={opt.id} 
                          variant="outline" 
                          onClick={() => handleNext(opt.targetId)}
                          className="justify-between h-12 text-sm border-border hover:border-[#3ecf8e] hover:bg-[#3ecf8e]/10"
                        >
                          {opt.label}
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      ))}
                    </div>
                  )}

                  {currentNode.type === 'end' && (
                    <Button onClick={handleRestart} variant="secondary" className="w-full">
                      <RotateCcw className="w-4 h-4 mr-2" /> Reiniciar Processo
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center text-muted-foreground">Nó não encontrado.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="flow" className="flex-1 m-0 border-none outline-none bg-background relative h-full">
          <ReactFlow 
            nodes={initialNodes} 
            edges={initialEdges} 
            fitView
            className="bg-background"
            colorMode="dark"
          >
            <Background color="#3f3f46" gap={16} />
            <Controls className="bg-card border-border fill-foreground" />
          </ReactFlow>
        </TabsContent>
      </Tabs>
    </div>
  );
}
