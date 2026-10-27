-- ============================================================================
-- Migration 000009: Presença online e compartilhamento de tela
-- - profiles.last_seen_at: heartbeat do cliente; online = visto há menos de 70s
-- - voice_states.is_screen_sharing: quem transmite a tela no canal de voz
-- O vídeo da tela viaja pelo mesmo WebRTC P2P do áudio (sem servidor de mídia).
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE voice_states ADD COLUMN IF NOT EXISTS is_screen_sharing BOOLEAN NOT NULL DEFAULT false;
