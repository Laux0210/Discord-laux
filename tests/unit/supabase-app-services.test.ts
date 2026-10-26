import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionFlags, ALL_PERMISSIONS } from '../../src/common/permissions';
import {
  SINGLE_GUILD_ID,
  SupabaseApiError,
  SupabaseRestClient,
  createSupabaseAppServices,
  resolveSupabaseConfig,
} from '../../src/renderer/src/services/supabase-app-services';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('supabase-app-services (adaptador renderer -> Supabase REST/Auth/RPC)', () => {
  it('valida configuracao VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY e bloqueia service_role no cliente', () => {
    expect(resolveSupabaseConfig({})).toBeNull();
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'https://bsdbfhmgiqizfgwqxhxh.supabase.co/',
        VITE_SUPABASE_ANON_KEY: 'anon-public-jwt-token',
      }),
    ).toEqual({
      url: 'https://bsdbfhmgiqizfgwqxhxh.supabase.co',
      anonKey: 'anon-public-jwt-token',
    });

    // Chave contendo role service_role (mesmo em base64/texto) deve ser recusada no renderer (RF-15)
    const fakeServiceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    expect(() =>
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'https://bsdbfhmgiqizfgwqxhxh.supabase.co',
        VITE_SUPABASE_ANON_KEY: `eyJhbGciOiJIUzI1NiJ9.${fakeServiceRolePayload}.sig`,
      }),
    ).toThrow(/service_role/i);
  });

  it('autentica via GoTrue, hidrata perfil e carrega guilda unica 00000000-0000-0000-0000-000000000001 com cargos bigint', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    const userA = '11111111-1111-1111-1111-111111111111';

    const fetcher: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body });

      if (url.endsWith('/auth/v1/token?grant_type=password')) {
        return new Response(
          JSON.stringify({
            access_token: 'jwt-token-user-a',
            user: { id: userA, email: 'alice@example.com' },
          }),
          { status: 200 },
        );
      }

      if (url.includes('/rest/v1/profiles?id=eq.')) {
        return new Response(
          JSON.stringify([
            {
              id: userA,
              username: 'alice_11111111',
              display_name: 'Alice',
              avatar_url: null,
            },
          ]),
          { status: 200 },
        );
      }

      if (url.includes('/rest/v1/guilds?')) {
        return new Response(
          JSON.stringify([
            {
              id: SINGLE_GUILD_ID,
              name: 'Discord Laux',
              owner_id: userA,
              icon_url: null,
            },
          ]),
          { status: 200 },
        );
      }

      if (url.includes('/rest/v1/roles?')) {
        return new Response(
          JSON.stringify([
            {
              id: SINGLE_GUILD_ID,
              guild_id: SINGLE_GUILD_ID,
              name: '@everyone',
              position: 0,
              permissions: 3149313,
              color: null,
            },
            {
              id: '22222222-2222-2222-2222-222222222222',
              guild_id: SINGLE_GUILD_ID,
              name: 'Moderador',
              position: 10,
              permissions: String(PermissionFlags.MANAGE_CHANNELS | PermissionFlags.MANAGE_ROLES),
              color: '#5865f2',
            },
          ]),
          { status: 200 },
        );
      }

      if (url.endsWith('/rest/v1/rpc/member_permissions')) {
        // Dono retorna -1 na função SQL public.member_permissions
        return new Response(JSON.stringify(-1), { status: 200 });
      }

      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;

    const services = await createSupabaseAppServices({
      url: 'https://bsdbfhmgiqizfgwqxhxh.supabase.co',
      anonKey: 'anon-key-test',
      fetcher,
    });

    const logged = await services.authService.loginWithCredentials!(
      'alice@example.com',
      'SenhaForte123!',
      false,
    );
    expect(logged).toEqual({
      id: userA,
      username: 'alice_11111111',
      displayName: 'Alice',
    });

    const guild = await services.guildService.ensureCommonGuild!(userA);
    expect(guild.id).toBe(SINGLE_GUILD_ID);
    expect(guild.ownerId).toBe(userA);

    const roles = await services.guildService.getGuildRoles!(SINGLE_GUILD_ID);
    expect(roles).toHaveLength(2);
    expect(roles[0].permissions).toBe(3149313n);
    expect(roles[1].permissions).toBe(PermissionFlags.MANAGE_CHANNELS | PermissionFlags.MANAGE_ROLES);

    const effectivePerms = await services.guildService.getMemberPermissions!(SINGLE_GUILD_ID, userA);
    expect(effectivePerms).toBe(ALL_PERMISSIONS);
    expect(calls.some((c) => c.url.endsWith('/rest/v1/rpc/member_permissions'))).toBe(true);
  });

  it('executa fluxo de amizade direcionada, RPC open_dm e envio/exclusao logica de mensagens', async () => {
    const userA = '11111111-1111-1111-1111-111111111111';
    const userB = '22222222-2222-2222-2222-222222222222';
    const dmId = '33333333-3333-3333-3333-333333333333';
    const chanId = '44444444-4444-4444-4444-444444444444';
    const msgId = '55555555-5555-5555-5555-555555555555';

    const fetcher: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;

      if (url.includes('/rest/v1/friendships') && method === 'GET') {
        return new Response(
          JSON.stringify([
            {
              user_id: userB,
              friend_id: userA,
              status: 'pending',
              created_at: '2026-10-25T12:00:00Z',
            },
          ]),
          { status: 200 },
        );
      }

      if (url.includes('/rest/v1/friendships') && method === 'PATCH') {
        expect(body).toEqual({ status: 'accepted' });
        return new Response(
          JSON.stringify([
            {
              user_id: userB,
              friend_id: userA,
              status: 'accepted',
              created_at: '2026-10-25T12:00:00Z',
            },
          ]),
          { status: 200 },
        );
      }

      if (url.endsWith('/rest/v1/rpc/open_dm')) {
        expect(body).toEqual({ other: userB });
        return new Response(JSON.stringify(dmId), { status: 200 });
      }

      if (url.includes('/rest/v1/messages') && method === 'POST') {
        return new Response(
          JSON.stringify([
            {
              id: msgId,
              channel_id: chanId,
              author_id: userA,
              content: body.content,
              created_at: '2026-10-25T12:05:00Z',
              is_deleted: false,
            },
          ]),
          { status: 201 },
        );
      }

      if (url.includes('/rest/v1/messages') && method === 'PATCH') {
        expect(body).toEqual({ is_deleted: true });
        return new Response(JSON.stringify([{ id: msgId, is_deleted: true }]), { status: 200 });
      }

      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;

    const services = await createSupabaseAppServices({
      url: 'https://bsdbfhmgiqizfgwqxhxh.supabase.co',
      anonKey: 'anon-key-test',
      fetcher,
    });

    const friendsWithDirection = await services.friendshipService.getFriends(userA, true);
    expect(friendsWithDirection).toEqual([
      {
        friendId: userB,
        status: 'pending',
        direction: 'incoming',
      },
    ]);

    const accepted = await services.friendshipService.acceptFriendRequest(userA, userB);
    expect(accepted.status).toBe('accepted');

    const dm = await services.friendshipService.getOrCreateDmChannel(userA, userB);
    expect(dm.id).toBe(dmId);
    expect(dm.participantIds).toEqual([userA, userB]);

    const sent = await services.chatService.sendMessage({
      channelId: chanId,
      authorId: userA,
      authorName: 'Alice',
      content: 'Olá via Supabase!',
    });
    expect(sent.id).toBe(msgId);
    expect(sent.content).toBe('Olá via Supabase!');

    const deleted = await services.chatService.deleteMessage({
      messageId: msgId,
      requesterId: userA,
      permissions: 0n,
    });
    expect(deleted).toBe(true);
  });

  it('aborta requisicao em voo quando a geracao de sessao muda e propaga SupabaseApiError em falhas RLS', async () => {
    const client = new SupabaseRestClient(
      'https://bsdbfhmgiqizfgwqxhxh.supabase.co',
      'anon-key-test',
      vi.fn(async () => {
        client.setAccessToken('novo-token');
        return new Response(JSON.stringify([]), { status: 200 });
      }) as unknown as typeof fetch,
    );

    await expect(client.rest('GET', '/guilds')).rejects.toThrow('A sessão mudou durante a operação.');

    const errorClient = new SupabaseRestClient(
      'https://bsdbfhmgiqizfgwqxhxh.supabase.co',
      'anon-key-test',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ message: 'new row violates row-level security policy for table "roles"' }),
          { status: 403 },
        ),
      ) as unknown as typeof fetch,
    );

    await expect(errorClient.rest('POST', '/roles', { name: 'Admin' })).rejects.toBeInstanceOf(
      SupabaseApiError,
    );
  });
});

describe('mensagens de erro do Supabase Auth', () => {
  it('traduz error_code do GoTrue em texto claro', async () => {
    const fetcher = vi.fn(async () => new Response(
      JSON.stringify({ code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )) as unknown as typeof fetch;
    const client = new SupabaseRestClient('https://x.supabase.co', 'anon', fetcher);
    await expect(client.auth('POST', '/token?grant_type=password', { email: 'a@b.c', password: 'x' }))
      .rejects.toThrow('Confirme seu e-mail');
  });
});
