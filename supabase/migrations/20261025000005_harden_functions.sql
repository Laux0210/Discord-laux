-- ============================================================================
-- Migration 000005: Endurece funções apontadas pelo Security Advisor
-- - Helpers de RLS: sem acesso para anon/PUBLIC (authenticated precisa para avaliar políticas)
-- - purge_expired_messages com search_path fixo
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.is_guild_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_dm_participant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.member_permissions(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_guild_permission(uuid, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.member_top_position(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guild_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_permissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_guild_permission(uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_top_position(uuid, uuid) TO authenticated;

ALTER FUNCTION public.purge_expired_messages() SET search_path = public;
