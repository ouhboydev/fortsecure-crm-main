-- Create knowledge_flows table
CREATE TABLE IF NOT EXISTS public.knowledge_flows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  product text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Geral',
  color text NOT NULL DEFAULT '#3ecf8e',
  description text DEFAULT '',
  tags text[] DEFAULT '{}',
  steps jsonb DEFAULT '[]',
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.knowledge_flows ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "knowledge_flows_read"
  ON public.knowledge_flows FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "knowledge_flows_admin_write"
  ON public.knowledge_flows FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed: KnowBe4
INSERT INTO public.knowledge_flows (title, product, category, color, description, tags, steps, "order") VALUES
(
  'Fluxo Pós-Venda — KnowBe4', 'KnowBe4', 'Pós-Aceite', '#3ecf8e',
  'Processo completo após o aceite do cliente para a contratação do KnowBe4, desde a confirmação da Quote até o faturamento pela Fort Secure.',
  ARRAY['KnowBe4', 'Pós-Venda', 'Adobe Sign', 'Licenças'],
  '[
    {"id":"s1","label":"Cliente aceitou a proposta","description":"Recebemos o aceite formal do cliente confirmando interesse na contratação.","type":"start","actor":"Cliente"},
    {"id":"s2","label":"Responder e-mail de proposta (KnowBe4)","description":"Responder o e-mail de proposta da KnowBe4 dando o aceite da Quote. Este e-mail confirma ao distribuidor/fabricante que a venda está aprovada.","type":"step","actor":"Fort Secure (Vendedor)"},
    {"id":"s3","label":"AM da KnowBe4 gera e envia proposta para assinatura","description":"O Account Manager da KnowBe4 gera o contrato e envia para o responsável legal via Adobe Sign.","type":"step","actor":"KnowBe4 (AM)"},
    {"id":"s4","label":"Responsável Legal da Fort Secure assina a proposta","description":"O representante legal da Fort Secure assina o documento recebido via Adobe Sign, formalizando o contrato.","type":"step","actor":"Fort Secure (Jurídico/Diretoria)"},
    {"id":"s5","label":"KnowBe4 fatura e gera as licenças","description":"Após a assinatura, a KnowBe4 emite a fatura e gera as licenças enviadas diretamente para o cliente final.","type":"step","actor":"KnowBe4"},
    {"id":"s6","label":"Enviar valores e condições de pagamento ao Financeiro","description":"Enviar os valores acordados e as condições de pagamento para o Financeiro da Fort Secure faturar o cliente.","type":"end","actor":"Fort Secure (Vendedor → Financeiro)"}
  ]'::jsonb,
  0
),
-- Seed: CrowdStrike
(
  'Fluxo Pós-Venda — CrowdStrike', 'CrowdStrike', 'Pós-Aceite', '#e84a5f',
  'Processo de ativação e entrega de licenças CrowdStrike após confirmação da venda.',
  ARRAY['CrowdStrike', 'Pós-Venda', 'Licenças', 'EDR'],
  '[
    {"id":"cs1","label":"Cliente aceitou a proposta","description":"Aceite formal do cliente para contratação do CrowdStrike Falcon.","type":"start","actor":"Cliente"},
    {"id":"cs2","label":"Enviar Purchase Order para o distribuidor","description":"Emitir e enviar a PO ao distribuidor autorizado CrowdStrike com os detalhes da licença.","type":"step","actor":"Fort Secure (Financeiro/Vendedor)"},
    {"id":"cs3","label":"Distribuidor processa a ordem junto à CrowdStrike","description":"O distribuidor repassa o pedido à CrowdStrike para provisionamento das licenças no portal Falcon.","type":"step","actor":"Distribuidor"},
    {"id":"cs4","label":"CrowdStrike ativa as licenças no console","description":"As licenças são ativadas no console Falcon. O cliente recebe as credenciais de acesso.","type":"step","actor":"CrowdStrike"},
    {"id":"cs5","label":"Onboarding técnico com o cliente","description":"Agendar sessão de onboarding para instalação dos agentes e configuração inicial do EDR.","type":"step","actor":"Fort Secure (Técnico/Pré-Venda)"},
    {"id":"cs6","label":"Faturamento Fort Secure ao cliente","description":"Emitir nota fiscal ao cliente com as condições de pagamento acordadas.","type":"end","actor":"Fort Secure (Financeiro)"}
  ]'::jsonb,
  1
),
-- Seed: Fortinet
(
  'Fluxo Pós-Venda — Fortinet', 'Fortinet', 'Pós-Aceite', '#f59e0b',
  'Processo de entrega e suporte pós-venda para soluções Fortinet (Firewall, FortiGate, etc.).',
  ARRAY['Fortinet', 'Pós-Venda', 'Firewall', 'Entrega'],
  '[
    {"id":"ft1","label":"Cliente aceitou a proposta","description":"Confirmação formal da venda de hardware/licença Fortinet.","type":"start","actor":"Cliente"},
    {"id":"ft2","label":"Emissão de PO para distribuidor Fortinet","description":"Emitir Purchase Order para o distribuidor autorizado com especificações do equipamento e licenças.","type":"step","actor":"Fort Secure (Financeiro)"},
    {"id":"ft3","label":"Aguardar entrega do hardware","description":"O distribuidor processa o pedido e realiza a entrega do equipamento físico. Prazo médio: 15–30 dias úteis.","type":"step","actor":"Distribuidor / Logística"},
    {"id":"ft4","label":"Ativar licenças no FortiCare","description":"Registrar o número de série do equipamento no portal FortiCare e ativar as licenças contratadas.","type":"step","actor":"Fort Secure (Técnico)"},
    {"id":"ft5","label":"Implantação e configuração com o cliente","description":"Agendar implantação técnica no ambiente do cliente, configuração do FortiGate e testes de segurança.","type":"step","actor":"Fort Secure (Técnico)"},
    {"id":"ft6","label":"Faturamento ao cliente","description":"Emitir nota fiscal ao cliente e repassar as condições de pagamento para o Financeiro.","type":"end","actor":"Fort Secure (Financeiro)"}
  ]'::jsonb,
  2
);
