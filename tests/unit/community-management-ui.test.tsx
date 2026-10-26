// @vitest-environment happy-dom
import { act } from 'react';
import { Storage } from 'happy-dom';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ServerSettingsModal } from '../../src/renderer/src/components/ServerSettingsModal';
import { FriendsArea } from '../../src/renderer/src/components/FriendsArea';
import { App } from '../../src/renderer/src/App';
import { MockChatService } from '../../src/renderer/src/services/mock-chat';
import { MockMediaService } from '../../src/renderer/src/services/mock-media';
import { realtimeNetworkService } from '../../src/renderer/src/services/realtime-network-service';
import { ChannelList } from '../../src/renderer/src/components/ChannelList';
import { Sidebar } from '../../src/renderer/src/components/Sidebar';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { PermissionFlags } from '../../src/common/permissions';
import type { Guild, User } from '../../src/common/types';

vi.mock('../../src/renderer/src/services/realtime-network-service', () => ({ realtimeNetworkService: { init: vi.fn(), onRemoteScreenStream: () => () => {} } }));

const owner: User = { id: 'owner', username: 'owner', displayName: 'Dono' };
let host: HTMLDivElement, root: Root, service: InMemoryGuildService, guild: Guild;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('localStorage', new Storage());
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  service = new InMemoryGuildService();
  guild = await service.createGuild({ ownerId: owner.id, name: 'Servidor único' });
  service.addMemberDirect(guild.id, 'member');
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function mount(user = owner, changed = vi.fn(async () => {})) {
  await act(async () => root.render(<ServerSettingsModal guildId={guild.id} user={user} service={service} onClose={() => {}} onChannelsChanged={changed} />));
  return changed;
}
async function input(label: string, value: string) {
  const element = host.querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${label}"]`)!;
  expect(element).not.toBeNull();
  await act(async () => {
    const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function click(text: string) {
  const element = [...host.querySelectorAll('button')].find(button => button.textContent === text)!;
  expect(element).toBeDefined(); await act(async () => element.click());
}
async function submit(index: number) {
  await act(async () => (host.querySelector('[role="dialog"]') ?? host).querySelectorAll('form')[index].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

describe('administração da comunidade', () => {
  it('cria canais de texto e voz e atualiza a seleção após sucesso', async () => {
    const changed = await mount();
    await input('Nome do canal', 'projetos'); await submit(0);
    await input('Nome do canal', 'Sala de áudio'); await input('Tipo de canal', 'voice'); await submit(0);
    const channels = await service.getGuildChannels(guild.id, owner.id);
    expect(channels.find(channel => channel.name === 'projetos')?.type).toBe('text');
    expect(channels.find(channel => channel.name === 'Sala de áudio')?.type).toBe('voice');
    expect(changed).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('Canal criado.');
  });

  it('cria cargo e atribui e remove de um membro', async () => {
    await mount();
    await input('Nome do cargo', 'Leitores'); await submit(1);
    const role = (await service.getGuildRoles(guild.id)).find(item => item.name === 'Leitores')!;
    expect(role.permissions).toBe(PermissionFlags.VIEW_CHANNEL);
    await input('Membro', 'member'); await input('Cargo para atribuição', role.id);
    await click('Atribuir cargo');
    expect((await service.getGuildMembers(guild.id)).find(item => item.userId === 'member')?.roleIds).toContain(role.id);
    await click('Remover cargo');
    expect((await service.getGuildMembers(guild.id)).find(item => item.userId === 'member')?.roleIds).not.toContain(role.id);
  });

  it('não oferece criação e concessão de cargos a membro sem permissão', async () => {
    await mount({ id: 'member', username: 'member', displayName: 'Membro' });
    expect(host.querySelector('form')).toBeNull();
    expect(host.textContent).toContain('Você não tem permissão para gerenciar canais.');
    expect(host.textContent).toContain('Você não tem permissão para gerenciar cargos.');
  });

  it('mostra falha de escrita sem anunciar criação bem-sucedida', async () => {
    vi.spyOn(service, 'createChannel').mockRejectedValue(new Error('Armazenamento cheio'));
    await mount(); await input('Nome do canal', 'canal'); await submit(0);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Armazenamento cheio');
    expect(host.textContent).not.toContain('Canal criado.');
  });
});

describe('amizades e navegação por teclado', () => {
  it('navegação de amigos e servidor usa botões e não oferece criação sem ação', async () => {
    const home = vi.fn(), select = vi.fn();
    await act(async () => root.render(<Sidebar guilds={[guild]} selectedGuildId={guild.id} onSelectDmHome={home} onSelectGuild={select} />));
    const dm = host.querySelector('[data-testid="btn-dm-home"]') as HTMLButtonElement;
    const server = host.querySelector(`[data-testid="guild-item-${guild.id}"]`) as HTMLButtonElement;
    expect(dm.tagName).toBe('BUTTON'); expect(dm.type).toBe('button');
    expect(dm.getAttribute('aria-label')).toContain('amigos');
    expect(server.tagName).toBe('BUTTON'); expect(server.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-testid="btn-add-guild"]')).toBeNull();
    await act(async () => { dm.click(); server.click(); });
    expect(home).toHaveBeenCalledOnce(); expect(select).toHaveBeenCalledWith(guild.id);
    const create = vi.fn();
    await act(async () => root.render(<Sidebar guilds={[guild]} onOpenCreateGuild={create} />));
    const add = host.querySelector('[data-testid="btn-add-guild"]') as HTMLButtonElement;
    expect(add.tagName).toBe('BUTTON');
    await act(async () => add.click());
    expect(create).toHaveBeenCalledOnce();
  });

  it('não mostra atividades e status fictícios no servidor compartilhado', async () => {
    await act(async () => root.render(<FriendsArea currentUserId="me" showDemoActivity={false} friends={[
      { friendId: 'user-2', displayName: 'Ana', status: 'accepted' },
    ]} onAcceptFriendRequest={() => {}} onSendFriendRequest={async () => {}} onOpenDm={() => {}} />));
    expect(host.textContent).toContain('Amigos — 1');
    expect(host.textContent).toContain('Presença não sincronizada');
    expect(host.textContent).not.toContain('GABS e Senfador');
    expect(host.textContent).not.toContain('ROBLOX');
    expect(host.textContent).not.toContain('Juntar-se');
    expect(host.textContent).toContain('Nenhuma atividade compartilhada disponível');
  });

  it('descobre usuários cadastrados, exclui a própria conta e envia pelo ID real', async () => {
    let resolve!: () => void;
    const request = vi.fn(() => new Promise<void>(done => { resolve = done; }));
    await act(async () => root.render(<FriendsArea currentUserId="me" users={[
      { id: 'me', username: 'membro-123', displayName: 'Eu' },
      { id: 'real-user-2', username: 'membro-456', displayName: 'Ana' },
    ]} friends={[]} onAcceptFriendRequest={() => {}} onSendFriendRequest={request} onOpenDm={() => {}} />));
    await act(async () => (host.querySelector('[data-testid="tab-friends-add"]') as HTMLElement).click());
    expect(host.textContent).toContain('Seu usuário: membro-123');
    expect(host.querySelector('[aria-label="Adicionar Eu"]')).toBeNull();
    const add = host.querySelector('[aria-label="Adicionar Ana"]') as HTMLButtonElement;
    expect(add).not.toBeNull();
    expect(host.textContent).toContain('@membro-456');
    await act(async () => add.click());
    expect(request).toHaveBeenCalledWith('real-user-2');
    expect(add.disabled).toBe(true);
    await act(async () => add.click());
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(add.textContent).toBe('Pendente');
    expect(add.disabled).toBe(true);
    expect(host.querySelector('[role="status"]')?.textContent).toContain('enviado com sucesso');
  });

  it('mostra erro da sugestão de amizade e permite tentar novamente', async () => {
    const request = vi.fn(async () => { throw new Error('Conexão interrompida'); });
    await act(async () => root.render(<FriendsArea currentUserId="me" users={[
      { id: 'real-user-2', username: 'ana', displayName: 'Ana' },
    ]} friends={[]} onAcceptFriendRequest={() => {}} onSendFriendRequest={request} onOpenDm={() => {}} />));
    await act(async () => (host.querySelector('[data-testid="tab-friends-add"]') as HTMLElement).click());
    const add = host.querySelector('[aria-label="Adicionar Ana"]') as HTMLButtonElement;
    await act(async () => add.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Conexão interrompida');
    expect(add.disabled).toBe(false);
    expect(add.textContent).toBe('Adicionar');
  });

  it('mostra pedidos enviados sem botão de aceitar e recebe erros do aceite', async () => {
    const accept = vi.fn(async () => { throw new Error('Pedido revogado'); });
    await act(async () => root.render(<FriendsArea currentUserId="me" friends={[
      { friendId: 'out', displayName: 'Enviado', status: 'pending', direction: 'outgoing' },
      { friendId: 'in', displayName: 'Recebido', status: 'pending', direction: 'incoming' },
    ]} onAcceptFriendRequest={accept} onSendFriendRequest={async () => {}} onOpenDm={() => {}} />));
    await act(async () => (host.querySelector('[data-testid="tab-friends-pending"]') as HTMLElement).click());
    expect(host.querySelector('[data-testid="btn-accept-out"]')).toBeNull();
    expect(host.textContent).toContain('Enviado · aguardando resposta');
    await act(async () => (host.querySelector('[data-testid="btn-accept-in"]') as HTMLElement).click());
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Pedido revogado');
  });

  it('abre canal com Enter e espaço', async () => {
    const select = vi.fn();
    await act(async () => root.render(<ChannelList selectedChannelId="text" channels={[
      { id: 'text', guildId: 'g', name: 'geral', type: 'text' }, { id: 'voice', guildId: 'g', name: 'voz', type: 'voice' },
    ]} onSelectChannel={select} />));
    await act(async () => host.querySelector('[aria-label="Abrir canal de texto geral"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    await act(async () => host.querySelector('[aria-label="Abrir canal de voz voz"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })));
    expect(select.mock.calls).toEqual([['text'], ['voice']]);
  });
});


describe('App com servidor compartilhado', () => {
  it('carrega o servidor e abre a administração sem conectar ao broker público', async () => {
    vi.spyOn(service, 'ensureCommonGuild').mockResolvedValue(guild);
    const auth = { getCurrentUser: () => owner, login: async () => owner, logout: async () => {} };
    await act(async () => root.render(<App authService={auth} chatService={new MockChatService()} mediaService={new MockMediaService()} guildService={service} sharedBackend userDirectory={async () => [owner]} />));
    expect(host.textContent).toContain('Servidor único');
    expect(host.textContent).toContain('histórico salvo no servidor');
    const open = host.querySelector('[data-testid="server-settings-open"]') as HTMLElement;
    expect(open).not.toBeNull();
    await act(async () => open.click());
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await input('Nome do canal', 'Equipe'); await submit(0);
    expect(host.querySelector('[data-testid="chat-area"]')?.textContent).toContain('Equipe');
    expect(realtimeNetworkService.init).not.toHaveBeenCalled();
  });

  it('oferece apenas login de e-mail e senha quando usa backend compartilhado', async () => {
    const auth = { getCurrentUser: () => null, login: async () => null, logout: async () => {} };
    await act(async () => root.render(<App authService={auth} chatService={new MockChatService()} mediaService={new MockMediaService()} sharedBackend />));
    expect(host.querySelector('[data-testid="form-login-credentials"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="btn-login-google"]')).toBeNull();
    expect(host.querySelector('[data-testid="btn-login-amigo-1"]')).toBeNull();
    expect(host.textContent).toContain('servidor compartilhado');
    expect(host.querySelector<HTMLInputElement>('#login-password')?.minLength).toBe(8);
    expect(host.querySelector<HTMLInputElement>('#login-password')?.maxLength).toBe(128);
  });
});
