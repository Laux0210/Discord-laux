-- ============================================================================
-- Migration 000003: Procedimento de Purga Física Periódica de Mensagens
-- Garante que o texto de mensagens seja fisicamente destruído após 10 dias
-- ============================================================================

CREATE OR REPLACE FUNCTION purge_expired_messages() RETURNS integer AS $$
DECLARE
  deleted_guild_count integer := 0;
  deleted_dm_count integer := 0;
  cutoff_time timestamptz := now() - interval '10 days';
BEGIN
  -- 1. Remove fisicamente mensagens expiradas dos canais de comunidade
  WITH deleted_rows AS (
    DELETE FROM messages
    WHERE created_at < cutoff_time
    RETURNING 1
  )
  SELECT count(*) INTO deleted_guild_count FROM deleted_rows;

  -- 2. Remove fisicamente mensagens expiradas das conversas diretas (DMs)
  WITH deleted_dm_rows AS (
    DELETE FROM dm_messages
    WHERE created_at < cutoff_time
    RETURNING 1
  )
  SELECT count(*) INTO deleted_dm_count FROM deleted_dm_rows;

  -- Retorna total consolidado de linhas purgadas
  RETURN deleted_guild_count + deleted_dm_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
