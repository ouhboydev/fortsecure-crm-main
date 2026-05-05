
-- ENUM para papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'vendedor');
CREATE TYPE public.opp_stage AS ENUM ('prospect','qualificado','proposta','negociacao','ganho','perdido');
CREATE TYPE public.activity_type AS ENUM ('ligacao','email','reuniao','tarefa','followup');
CREATE TYPE public.activity_status AS ENUM ('pendente','concluida','atrasada');

-- TEAMS
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22d3ee',
  monthly_goal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Função has_role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gestor'))
$$;

-- GOALS
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- OPPORTUNITIES
CREATE TABLE public.opportunities (
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

-- ACTIVITIES
CREATE TABLE public.activities (
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

-- MEETINGS
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BADGES
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COMMISSIONS
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  month INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDIT
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_opps BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: todos autenticados leem (necessário p/ rankings); cada um edita o seu; admin edita tudo
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: todos leem (para checks no app); só admin escreve
CREATE POLICY "roles_select_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- teams: todos leem; admin/gestor escreve
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_write" ON public.teams FOR ALL TO authenticated
  USING (public.is_manager_or_admin(auth.uid())) WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- goals: dono ou gestor/admin
CREATE POLICY "goals_select" ON public.goals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "goals_write" ON public.goals FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_manager_or_admin(auth.uid()));

-- opportunities: dono CRUD; gestor/admin tudo; todos autenticados podem LER (pra rankings/TV)
CREATE POLICY "opps_select" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "opps_insert" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "opps_update" ON public.opportunities FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "opps_delete" ON public.opportunities FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));

-- activities
CREATE POLICY "act_select" ON public.activities FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "act_write" ON public.activities FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()))
  WITH CHECK (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));

-- meetings
CREATE POLICY "meet_select" ON public.meetings FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "meet_write" ON public.meetings FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()))
  WITH CHECK (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));

-- badges: todos leem (gamificação); sistema/admin insere
CREATE POLICY "badges_select" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges_write" ON public.badges FOR ALL TO authenticated
  USING (public.is_manager_or_admin(auth.uid())) WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- commissions: dono lê o seu; gestor/admin tudo
CREATE POLICY "comm_select" ON public.commissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_manager_or_admin(auth.uid()));
CREATE POLICY "comm_write" ON public.commissions FOR ALL TO authenticated
  USING (public.is_manager_or_admin(auth.uid())) WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- audit: só admin lê
CREATE POLICY "audit_admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
