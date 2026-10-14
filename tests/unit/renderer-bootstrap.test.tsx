import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import type { AppProps } from '../../src/renderer/src/App';

const renderer = vi.hoisted(() => ({ render: vi.fn(), unmount: vi.fn(), createRoot: vi.fn() }));
vi.mock('react-dom/client', () => ({
  createRoot: renderer.createRoot.mockImplementation(() => renderer)
}));
import { mountLocalApp } from '../../src/renderer/src/bootstrap';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('bootstrap do renderer', () => {
  it('aguarda os seeds e entrega os seis serviços ao App montado; expõe desmontagem', async () => {
    const container = {} as HTMLElement;
    const mounting = mountLocalApp(container);
    expect(renderer.createRoot).not.toHaveBeenCalled();
    const unmount = await mounting;
    expect(renderer.createRoot).toHaveBeenCalledWith(container);
    const strictMode = renderer.render.mock.calls[0][0] as ReactElement<{ children: ReactElement<AppProps> }>;
    const props = strictMode.props.children.props;
    expect(props.authService.getCurrentUser()?.id).toBe('user-1');
    const guilds = await props.guildService!.getUserGuilds('user-1');
    const channels = await props.guildService!.getGuildChannels(guilds[0].id, 'user-1');
    expect(await props.chatService.getMessages(channels[0].id)).toHaveLength(1);
    expect(await props.friendshipService!.getFriends('user-1')).toHaveLength(2);
    expect(props.presenceService!.getPresence('user-2')).toBe('online');
    expect(props.mediaService.getParticipants()).toEqual([]);
    unmount();
    expect(renderer.unmount).toHaveBeenCalledOnce();
  });

  it('o entrypoint real delega a montagem ao bootstrap com o container root', async () => {
    const container = {} as HTMLElement;
    const bootstrap = await import('../../src/renderer/src/bootstrap');
    const mount = vi.spyOn(bootstrap, 'mountLocalApp').mockResolvedValue(() => {});
    const getElementById = vi.fn().mockReturnValue(container);
    vi.stubGlobal('document', { getElementById });
    await import('../../src/renderer/src/main');
    expect(getElementById).toHaveBeenCalledWith('root');
    expect(mount).toHaveBeenCalledWith(container);
  });
});
