-- Create interactive_playbooks table
CREATE TABLE IF NOT EXISTS public.interactive_playbooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.interactive_playbooks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read playbooks
CREATE POLICY "interactive_playbooks_read"
  ON public.interactive_playbooks FOR SELECT
  TO authenticated
  USING (true);

-- Only admins or gestores can insert/update/delete
CREATE POLICY "interactive_playbooks_admin_write"
  ON public.interactive_playbooks FOR ALL
  TO authenticated
  USING (
    public.is_manager_or_admin(auth.uid())
  )
  WITH CHECK (
    public.is_manager_or_admin(auth.uid())
  );

-- Seed Data: Kaspersky Quote Process
INSERT INTO public.interactive_playbooks (title, description, nodes, edges) VALUES (
  'Processo de Cotação Kaspersky',
  'Fluxograma completo de identificação e tratativa de oportunidade Kaspersky',
  '[
      {
        "id": "1",
        "type": "task",
        "title": "Identificou Oportunidade",
        "description": "Você identificou uma oportunidade Kaspersky no cliente.",
        "nextId": "2",
        "position": { "x": 250, "y": 50 }
      },
      {
        "id": "2",
        "type": "task",
        "title": "Efetuar Registro de Oportunidade",
        "description": "Acesse o portal da Kaspersky e realize o registro da oportunidade.",
        "nextId": "3",
        "position": { "x": 250, "y": 150 }
      },
      {
        "id": "3",
        "type": "condition",
        "title": "Qual o tipo de Cliente?",
        "description": "Determine se o órgão do cliente é Governo ou Corporativo.",
        "options": [
          { "id": "opt-gov", "label": "Governo", "targetId": "4" },
          { "id": "opt-corp", "label": "Corporativo", "targetId": "7" }
        ],
        "position": { "x": 250, "y": 250 }
      },
      {
        "id": "4",
        "type": "task",
        "title": "Solicitar preço para ESY",
        "description": "Solicitar preço para a Marina (ESY) com cópia para o AM.",
        "nextId": "5",
        "position": { "x": 100, "y": 400 }
      },
      {
        "id": "5",
        "type": "task",
        "title": "Elaborar TR",
        "description": "Entrar em contato com o órgão para elaborar o Termo de Referência (TR).",
        "nextId": "6",
        "position": { "x": 100, "y": 500 }
      },
      {
        "id": "6",
        "type": "end",
        "title": "Fim do Processo (Governo)",
        "description": "Oportunidade governamental encaminhada.",
        "position": { "x": 100, "y": 600 }
      },
      {
        "id": "7",
        "type": "task",
        "title": "Solicitar preço para AM",
        "description": "Solicitar preço direto para o AM da Kaspersky.",
        "nextId": "8",
        "position": { "x": 400, "y": 400 }
      },
      {
        "id": "8",
        "type": "end",
        "title": "Fim do Processo (Corporativo)",
        "description": "Oportunidade corporativa encaminhada.",
        "position": { "x": 400, "y": 500 }
      }
  ]'::jsonb,
  '[
      { "id": "e1-2", "source": "1", "target": "2" },
      { "id": "e2-3", "source": "2", "target": "3" },
      { "id": "e3-4", "source": "3", "target": "4", "label": "Governo" },
      { "id": "e3-7", "source": "3", "target": "7", "label": "Corporativo" },
      { "id": "e4-5", "source": "4", "target": "5" },
      { "id": "e5-6", "source": "5", "target": "6" },
      { "id": "e7-8", "source": "7", "target": "8" }
  ]'::jsonb
);
