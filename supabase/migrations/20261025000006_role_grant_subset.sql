-- ============================================================================
-- Migration 000006: Cargo só concede permissões que o autor já possui
-- Corrige escalada: membro com MANAGE_ROLES podia dar ADMINISTRATOR ao @everyone.
-- Regra (como no Discord): bits concedidos ⊆ permissões efetivas do autor.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_grant_permissions(gid uuid, perms numeric) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (perms::bigint & ~public.member_permissions(gid)) = 0;
$$;
REVOKE EXECUTE ON FUNCTION public.can_grant_permissions(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_grant_permissions(uuid, numeric) TO authenticated;

DROP POLICY IF EXISTS roles_insert_policy ON roles;
CREATE POLICY roles_insert_policy ON roles FOR INSERT WITH CHECK (
  public.has_guild_permission(guild_id, 268435456) AND position < public.member_top_position(guild_id)
  AND public.can_grant_permissions(guild_id, permissions));

DROP POLICY IF EXISTS roles_update_policy ON roles;
CREATE POLICY roles_update_policy ON roles FOR UPDATE
  USING (public.has_guild_permission(guild_id, 268435456) AND (id = guild_id OR position < public.member_top_position(guild_id)))
  WITH CHECK (public.has_guild_permission(guild_id, 268435456)
              AND (id = guild_id OR position < public.member_top_position(guild_id))
              AND public.can_grant_permissions(guild_id, permissions));
