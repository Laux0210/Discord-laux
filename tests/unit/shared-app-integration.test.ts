import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { createSharedServer } from '../../src/server/shared-server';
import { createRemoteAppServices } from '../../src/renderer/src/services/remote-app-services';
import { PermissionFlags } from '../../src/common/permissions';

let server: Server | undefined;
let directory = '';

afterEach(async () => {
  if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
  if (directory) rmSync(directory, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('integração dos adaptadores com backend compartilhado', () => {
  it('recarrega sessão/histórico e conecta duas contas à mesma comunidade com cargos reais no backend', async () => {
    directory = mkdtempSync(join(tmpdir(), 'discord-adapter-integration-'));
    server = createSharedServer({ dataDir: directory });
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Porta de teste ausente');
    const options = { baseUrl: `http://127.0.0.1:${address.port}/api` };
    const ownerStorage = new Map<string, string>();
    const setBrowser = (storage: Map<string, string>) => vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } });
    setBrowser(ownerStorage);
    const owner = await createRemoteAppServices(options);
    expect(owner.authService.getCurrentUser()).toBeNull();
    const ownerUser = await owner.authService.loginWithCredentials('owner@example.test', 'local-test-password', true, 'Dono');
    await owner.chatService.sendMessage({ channelId: 'chan-general', authorId: ownerUser.id, authorName: 'Dono', content: 'Conversa sobrevive ao F5' });

    const reloaded = await createRemoteAppServices(options);
    expect(reloaded.authService.getCurrentUser()?.id).toBe(ownerUser.id);
    expect((await reloaded.chatService.getMessages('chan-general'))[0].content).toBe('Conversa sobrevive ao F5');
    // O primeiro poll pode alcançar uma mensagem criada após a leitura inicial.
    const received: string[] = [];
    const unsubscribe = reloaded.chatService.onNewMessage('chan-general', message => received.push(message.content));
    await vi.waitFor(() => expect(received).toContain('Conversa sobrevive ao F5'));
    unsubscribe();
    setBrowser(new Map());
    const member = await createRemoteAppServices(options);
    const memberUser = await member.authService.loginWithCredentials('member@example.test', 'local-test-password', true, 'Membro');
    const guild = (await member.guildService.getUserGuilds(memberUser.id))[0];
    expect(guild.id).toBe('guild-community');
    expect(guild.ownerId).toBe(ownerUser.id);
    expect(await owner.guildService.getMemberPermissions!(guild.id, ownerUser.id)).toBeTypeOf('bigint');
    expect(await member.guildService.getMemberPermissions!(guild.id, memberUser.id)).toBeTypeOf('bigint');
    expect(await member.chatService.getMessages('chan-general')).toHaveLength(1);
    await expect(member.guildService.createChannel({ guildId: guild.id, actorId: ownerUser.id, name: 'forjado', type: 'text' })).rejects.toThrow();
    const role = await owner.guildService.createRole({ guildId: guild.id, actorId: ownerUser.id, name: 'Criador de canais', permissions: PermissionFlags.MANAGE_CHANNELS, position: 2 });
    await owner.guildService.assignRole({ guildId: guild.id, actorId: ownerUser.id, roleId: role.id, targetUserId: memberUser.id });
    expect((await member.guildService.getGuildRoles!(guild.id)).find(item => item.id === role.id)?.permissions).toBe(PermissionFlags.MANAGE_CHANNELS);
    const voice = await member.guildService.createChannel({ guildId: guild.id, actorId: memberUser.id, name: 'Sala de estudo', type: 'voice' });
    expect((await owner.guildService.getGuildChannels(guild.id, ownerUser.id)).some(channel => channel.id === voice.id && channel.type === 'voice')).toBe(true);
    await owner.friendshipService.sendFriendRequest(ownerUser.id, memberUser.id);
    expect((await member.friendshipService.getFriends(memberUser.id, true))[0].direction).toBe('incoming');
    await member.friendshipService.acceptFriendRequest(memberUser.id, ownerUser.id);
    const dm = await owner.friendshipService.getOrCreateDmChannel(ownerUser.id, memberUser.id);
    await owner.friendshipService.sendDmMessage({ dmChannelId: dm.id, authorId: ownerUser.id, authorName: 'Dono', content: 'DM persistente' });
    expect((await member.friendshipService.getDmMessages(dm.id, memberUser.id))[0].content).toBe('DM persistente');
    expect(await member.userDirectory()).toHaveLength(2);
    const snapshots: string[][] = [];
    const stopSnapshots = member.chatService.onMessagesUpdated('chan-general', messages => snapshots.push(messages.map(message => message.id)));
    try {
      await vi.waitFor(() => expect(snapshots.at(-1)).toHaveLength(1));
      const message = (await owner.chatService.getMessages('chan-general'))[0];
      await owner.chatService.deleteMessage({ messageId: message.id, requesterId: ownerUser.id, permissions: 0n });
      await vi.waitFor(() => expect(snapshots.at(-1)).toEqual([]), { timeout: 3000 });
    } finally { stopSnapshots(); }
  });
});
