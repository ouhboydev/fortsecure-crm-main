-- =========================================================
-- Tabela de notificações in-app + flag de envio nas atividades
-- =========================================================

-- 1. Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'warning' CHECK (type IN ('warning','info','success','error')),
  read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Cada usuário lê e gerencia apenas as próprias notificações
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_system" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete_own" ON public.notifications;

CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notif_insert_system" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notif_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime para notificações aparecerem instantaneamente
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Coluna de controle de envio na tabela de atividades (evita spam)
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS notification_sent_3d_at TIMESTAMPTZ;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS notification_sent_24h_at TIMESTAMPTZ;

-- Índice para a query de prazos não ficar lenta
CREATE INDEX IF NOT EXISTS activities_due_date_status_idx 
  ON public.activities (due_date, status) 
  WHERE status = 'pendente';
