import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';

import { UserSettingsModal } from '../../src/renderer/src/components/UserSettingsModal';
import type { User } from '../../src/common/types';

describe('UserSettingsModal (Configurações do Usuário)', () => {
  const dummyUser: User = {
    id: 'user-1',
    username: 'laux05',
    displayName: 'Laux'
  };

  it('não renderiza nada quando isOpen for falso', () => {
    const html = renderToString(
      <UserSettingsModal
        isOpen={false}
        onClose={() => {}}
        user={dummyUser}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza abas de Minha Conta, Perfil, Voz e Vídeo e Aparência quando aberto', () => {
    const html = renderToString(
      <UserSettingsModal
        isOpen={true}
        onClose={() => {}}
        user={dummyUser}
        onLogout={() => {}}
      />
    );

    expect(html).toContain('data-testid="user-settings-modal"');
    expect(html).toContain('data-testid="settings-tab-account"');
    expect(html).toContain('data-testid="settings-tab-profile"');
    expect(html).toContain('data-testid="settings-tab-voice"');
    expect(html).toContain('data-testid="settings-tab-appearance"');
    expect(html).toContain('data-testid="btn-close-settings"');
    expect(html).toContain('data-testid="btn-logout"');
    expect(html).toContain('Minha Conta');
    expect(html).toContain('Nome de Exibição');
    expect(html).toContain('Nome de Usuário');
  });
});
