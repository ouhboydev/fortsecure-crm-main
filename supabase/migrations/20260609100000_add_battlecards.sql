-- Battlecards table for competitor intelligence
CREATE TABLE IF NOT EXISTS public.battlecards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name TEXT NOT NULL,
  description TEXT,
  logo_emoji  TEXT DEFAULT '🏢',
  color       TEXT DEFAULT '#e11d48',
  our_strengths  JSONB DEFAULT '[]'::jsonb,
  their_strengths JSONB DEFAULT '[]'::jsonb,
  objections  JSONB DEFAULT '[]'::jsonb,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.battlecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read battlecards"
  ON public.battlecards FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only admins can insert battlecards"
  ON public.battlecards FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update battlecards"
  ON public.battlecards FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete battlecards"
  ON public.battlecards FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
