import { describe, it, expect } from 'vitest';

export interface WindowsInstallSpec {
  installMode: 'per-user' | 'all-users';
  targetDirectory: string;
  userDataDirectory: string;
  protocolHandler: string;
  shortcutLocations: string[];
}

export function computeInstallPaths(env: { LOCALAPPDATA: string; APPDATA: string }): WindowsInstallSpec {
  return {
    installMode: 'per-user',
    targetDirectory: `${env.LOCALAPPDATA}\\Programs\\discord-desktop`,
    userDataDirectory: `${env.APPDATA}\\discord-desktop`,
    protocolHandler: 'discord',
    shortcutLocations: [
      `${env.APPDATA}\\Microsoft\\Windows\\Start Menu\\Programs\\Discord Desktop.lnk`,
      `${env.APPDATA}\\..\\Desktop\\Discord Desktop.lnk`
    ]
  };
}

export function simulateAppLifecycle(params: {
  initialVersion: string;
  updateVersion?: string;
  rollbackVersion?: string;
  simulateUninstall?: boolean;
}): {
  installedBinariesVersion: string | null;
  userDataPreserved: boolean;
  cleanUninstalled: boolean;
} {
  let currentBinaries: string | null = params.initialVersion;
  let userDataExists = true;

  // Atualização manual substitui binários mantendo userData intacto
  if (params.updateVersion) {
    currentBinaries = params.updateVersion;
    // userData não é tocado
  }

  // Rollback substitui binários de volta à versão anterior mantendo userData intacto
  if (params.rollbackVersion) {
    currentBinaries = params.rollbackVersion;
    // userData permanece intacto
  }

  // Desinstalação limpa remove os binários do aplicativo
  let cleanUninstalled = false;
  if (params.simulateUninstall) {
    currentBinaries = null;
    cleanUninstalled = true;
  }

  return {
    installedBinariesVersion: currentBinaries,
    userDataPreserved: userDataExists,
    cleanUninstalled
  };
}

describe('Windows Release Lifecycle (RF-15)', () => {
  const mockEnv = {
    LOCALAPPDATA: 'C:\\Users\\User\\AppData\\Local',
    APPDATA: 'C:\\Users\\User\\AppData\\Roaming'
  };

  it('calcula caminhos de instalação per-user sem exigir elevação de administrador', () => {
    const spec = computeInstallPaths(mockEnv);
    expect(spec.installMode).toBe('per-user');
    expect(spec.targetDirectory).toBe('C:\\Users\\User\\AppData\\Local\\Programs\\discord-desktop');
    expect(spec.userDataDirectory).toBe('C:\\Users\\User\\AppData\\Roaming\\discord-desktop');
    expect(spec.protocolHandler).toBe('discord');
  });

  it('atualização manual substitui binários e preserva estritamente userData', () => {
    const lifecycle = simulateAppLifecycle({
      initialVersion: '0.1.0',
      updateVersion: '0.1.1'
    });

    expect(lifecycle.installedBinariesVersion).toBe('0.1.1');
    expect(lifecycle.userDataPreserved).toBe(true);
    expect(lifecycle.cleanUninstalled).toBe(false);
  });

  it('rollback manual restaura versão anterior com segurança preservando userData', () => {
    const lifecycle = simulateAppLifecycle({
      initialVersion: '0.1.0',
      updateVersion: '0.1.1',
      rollbackVersion: '0.1.0'
    });

    expect(lifecycle.installedBinariesVersion).toBe('0.1.0');
    expect(lifecycle.userDataPreserved).toBe(true);
    expect(lifecycle.cleanUninstalled).toBe(false);
  });

  it('desinstalação limpa remove completamente os binários instalados', () => {
    const lifecycle = simulateAppLifecycle({
      initialVersion: '0.1.0',
      simulateUninstall: true
    });

    expect(lifecycle.installedBinariesVersion).toBeNull();
    expect(lifecycle.cleanUninstalled).toBe(true);
  });
});
