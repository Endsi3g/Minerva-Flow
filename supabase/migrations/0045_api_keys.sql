-- Migration 0045: API Keys for MCP & Developers
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] DEFAULT ARRAY['all:minerva-flow']::text[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_used_at timestamptz,
  revoked boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS api_keys_restaurant_id_idx ON public.api_keys(restaurant_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their restaurant api keys"
  ON public.api_keys
  FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Managers and owners can insert api keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (is_restaurant_member(restaurant_id, ARRAY['owner'::member_role, 'manager'::member_role]));

CREATE POLICY "Managers and owners can update api keys"
  ON public.api_keys
  FOR UPDATE
  USING (is_restaurant_member(restaurant_id, ARRAY['owner'::member_role, 'manager'::member_role]));

CREATE POLICY "Managers and owners can delete api keys"
  ON public.api_keys
  FOR DELETE
  USING (is_restaurant_member(restaurant_id, ARRAY['owner'::member_role, 'manager'::member_role]));
