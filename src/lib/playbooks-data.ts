export type PlaybookNodeType = 'task' | 'condition' | 'end';

export interface PlaybookOption {
  id: string;
  label: string;
  targetId: string;
}

export interface PlaybookNode {
  id: string;
  type: PlaybookNodeType;
  title: string;
  description?: string;
  options?: PlaybookOption[]; // Usado para 'condition', e para 'task' pode ser o botão de "Próximo"
  nextId?: string; // Usado para 'task' caso não tenha options
  position: { x: number; y: number }; // Posição para o React Flow
}

export interface PlaybookEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Playbook {
  id: string;
  title: string;
  description: string;
  nodes: PlaybookNode[];
  edges: PlaybookEdge[];
}

export const playbooksData: Playbook[] = [
  {
    id: "kaspersky-quote",
    title: "Processo de Cotação Kaspersky",
    description: "Fluxograma completo de identificação e tratativa de oportunidade Kaspersky",
    nodes: [
      {
        id: "1",
        type: "task",
        title: "Identificou Oportunidade",
        description: "Você identificou uma oportunidade Kaspersky no cliente.",
        nextId: "2",
        position: { x: 250, y: 50 },
      },
      {
        id: "2",
        type: "task",
        title: "Efetuar Registro de Oportunidade",
        description: "Acesse o portal da Kaspersky e realize o registro da oportunidade.",
        nextId: "3",
        position: { x: 250, y: 150 },
      },
      {
        id: "3",
        type: "condition",
        title: "Qual o tipo de Cliente?",
        description: "Determine se o órgão do cliente é Governo ou Corporativo.",
        options: [
          { id: "opt-gov", label: "Governo", targetId: "4" },
          { id: "opt-corp", label: "Corporativo", targetId: "7" }
        ],
        position: { x: 250, y: 250 },
      },
      {
        id: "4",
        type: "task",
        title: "Solicitar preço para ESY",
        description: "Solicitar preço para a Marina (ESY) com cópia para o AM.",
        nextId: "5",
        position: { x: 100, y: 400 },
      },
      {
        id: "5",
        type: "task",
        title: "Elaborar TR",
        description: "Entrar em contato com o órgão para elaborar o Termo de Referência (TR).",
        nextId: "6",
        position: { x: 100, y: 500 },
      },
      {
        id: "6",
        type: "end",
        title: "Fim do Processo (Governo)",
        description: "Oportunidade governamental encaminhada.",
        position: { x: 100, y: 600 },
      },
      {
        id: "7",
        type: "task",
        title: "Solicitar preço para AM",
        description: "Solicitar preço direto para o AM da Kaspersky.",
        nextId: "8",
        position: { x: 400, y: 400 },
      },
      {
        id: "8",
        type: "end",
        title: "Fim do Processo (Corporativo)",
        description: "Oportunidade corporativa encaminhada.",
        position: { x: 400, y: 500 },
      }
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2" },
      { id: "e2-3", source: "2", target: "3" },
      { id: "e3-4", source: "3", target: "4", label: "Governo" },
      { id: "e3-7", source: "3", target: "7", label: "Corporativo" },
      { id: "e4-5", source: "4", target: "5" },
      { id: "e5-6", source: "5", target: "6" },
      { id: "e7-8", source: "7", target: "8" },
    ]
  }
];
