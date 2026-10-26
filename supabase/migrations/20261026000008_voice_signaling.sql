-- ============================================================================
-- Migration 000008: Presença em canal de voz e sinalização WebRTC
-- - voice_states: quem está em qual canal de voz (heartbeat do cliente)
-- - voice_signals: offer/answer/ICE entre dois participantes do mesmo canal
-- Entrar exige CONNECT (1048576) no canal de voz da guilda.
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_states (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  display_name VARCHAR(64) NOT NULL,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_deafened BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  from_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL CHECK (kind IN ('offer', 'answer', 'ice', 'bye')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_signal_not_self CHECK (from_id <> to_id),
  CONSTRAINT chk_signal_size CHECK (octet_length(payload::text) <= 16384)
);
CREATE INDEX IF NOT EXISTS idx_voice_signals_to ON voice_signals(to_id, created_at);

ALTER TABLE voice_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_signals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_connect_voice(cid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM channels c WHERE c.id = cid AND c.type = 'voice'
                 AND public.has_guild_permission(c.guild_id, 1048576));
$$;
REVOKE EXECUTE ON FUNCTION public.can_connect_voice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_connect_voice(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.in_voice_channel(cid uuid, uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM voice_states WHERE user_id = uid AND channel_id = cid);
$$;
REVOKE EXECUTE ON FUNCTION public.in_voice_channel(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.in_voice_channel(uuid, uuid) TO authenticated;

CREATE POLICY voice_states_select_policy ON voice_states FOR SELECT
  USING (public.is_guild_member((SELECT guild_id FROM channels WHERE id = channel_id)));
CREATE POLICY voice_states_insert_policy ON voice_states FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.can_connect_voice(channel_id));
CREATE POLICY voice_states_update_policy ON voice_states FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.can_connect_voice(channel_id));
CREATE POLICY voice_states_delete_policy ON voice_states FOR DELETE USING (user_id = auth.uid());

-- Sinal só entre dois participantes presentes no mesmo canal
CREATE POLICY voice_signals_insert_policy ON voice_signals FOR INSERT WITH CHECK (
  from_id = auth.uid()
  AND public.in_voice_channel(channel_id, auth.uid())
  AND public.in_voice_channel(channel_id, to_id));
CREATE POLICY voice_signals_select_policy ON voice_signals FOR SELECT USING (to_id = auth.uid());
CREATE POLICY voice_signals_delete_policy ON voice_signals FOR DELETE USING (to_id = auth.uid() OR from_id = auth.uid());
