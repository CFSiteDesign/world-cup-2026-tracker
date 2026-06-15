
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  match_id TEXT NOT NULL,
  home_pred INTEGER NOT NULL,
  away_pred INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT predictions_unique_player_match UNIQUE (player_name, match_id),
  CONSTRAINT predictions_scores_nonneg CHECK (home_pred >= 0 AND away_pred >= 0 AND home_pred <= 30 AND away_pred <= 30),
  CONSTRAINT predictions_player_name_len CHECK (char_length(player_name) BETWEEN 1 AND 40)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO anon, authenticated;
GRANT ALL ON public.predictions TO service_role;

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Public can insert predictions" ON public.predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update predictions" ON public.predictions FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER predictions_set_updated_at
BEFORE UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
