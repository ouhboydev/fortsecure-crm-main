-- 1. Garantir que os tipos ENUM existam no banco de dados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'vendedor');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opp_stage') THEN
    CREATE TYPE public.opp_stage AS ENUM ('prospect','qualificado','proposta','negociacao','ganho','perdido');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE public.activity_type AS ENUM ('ligacao','email','reuniao','tarefa','followup');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_status') THEN
    CREATE TYPE public.activity_status AS ENUM ('pendente','concluida','atrasada');
  END IF;
END$$;

-- 1.5. Garantir que a tabela user_roles exista para o controle de permissões
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_select_all" ON public.user_roles;
CREATE POLICY "roles_select_all" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- 1.6. Garantir que as tabelas de oportunidades e atividades existam
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  stage public.opp_stage NOT NULL DEFAULT 'prospect',
  probability INT NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  type public.activity_type NOT NULL DEFAULT 'tarefa',
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status public.activity_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 2. Garantir que as funções auxiliares de RLS existam no banco
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gestor'))
$$;

-- 3. Criar a tabela de clientes se ela não existir
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  document TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS para a tabela de clientes
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para clientes
DROP POLICY IF EXISTS "cust_select_all" ON public.customers;
DROP POLICY IF EXISTS "cust_insert" ON public.customers;
DROP POLICY IF EXISTS "cust_update" ON public.customers;
DROP POLICY IF EXISTS "cust_delete" ON public.customers;

CREATE POLICY "cust_select_all" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "cust_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "cust_update" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "cust_delete" ON public.customers FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));

-- 4. Adicionar o relacionamento de cliente na tabela de oportunidades se não existir
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- 5. Adicionar o tipo 'whatsapp' no enum de tipo de atividade (activity_type)
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'whatsapp';

-- 6. Adicionar novas colunas de inteligência e desfecho na tabela de atividades (activities)
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS next_action_type public.activity_type;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS next_action_title TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS next_action_due TIMESTAMPTZ;

-- 7. Incluir a tabela de clientes no Realtime se ainda não estiver inclusa
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
