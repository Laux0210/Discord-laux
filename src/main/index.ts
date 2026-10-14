import { app, BrowserWindow, ipcMain, session, shell, type IpcMainInvokeEvent } from 'electron';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createMainWindow, rendererURL } from './window';
import { isTrustedIpcSender } from './ipc-security';
import { IPC_CHANNELS, validateIpcPayload, type DesktopSourceOptions, type OpenExternalUrlPayload } from '../common/ipc-channels';

const smoke = process.argv.includes('--desktop-smoke');
const expectedURL = rendererURL(smoke ? undefined : process.env.VITE_DEV_SERVER_URL);
let mainWindow: BrowserWindow | null = null;

if (smoke) {
  const profile = fileURLToPath(new URL(`../../.codex/logs/desktop-smoke-${process.pid}/`, import.meta.url));
  mkdirSync(profile, { recursive: true });
  app.setPath('userData', profile);
}

function requireLocalRenderer(event: IpcMainInvokeEvent): void {
  if (!mainWindow || !isTrustedIpcSender(event, { webContents: mainWindow.webContents, expectedURL })) {
    throw new Error('Emissor IPC não autorizado');
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, (event, payload?: unknown) => {
    requireLocalRenderer(event);
    if (!validateIpcPayload(IPC_CHANNELS.GET_APP_VERSION, payload)) throw new Error('Payload de versão inválido');
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_DESKTOP_SOURCES, (event, opts?: DesktopSourceOptions) => {
    requireLocalRenderer(event);
    if (!validateIpcPayload(IPC_CHANNELS.GET_DESKTOP_SOURCES, opts)) {
      throw new Error('Payload inválido para obtenção de fontes desktop');
    }
    throw new Error('Captura real indisponível nesta base mock; depende dos gates de mídia');
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_URL, async (event, payload?: OpenExternalUrlPayload) => {
    requireLocalRenderer(event);
    if (!validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, payload) || !payload) {
      throw new Error('URL externa inválida ou insegura');
    }
    const parsed = new URL(payload.url);
    if (parsed.username || parsed.password) throw new Error('URL externa com credenciais não permitida');
    await shell.openExternal(payload.url);
    return true;
  });
}

async function verifySmoke(window: BrowserWindow): Promise<void> {
  let probeReachedNetwork = false;
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['https://127.0.0.1:9/*'] }, (_details, callback) => {
    probeReachedNetwork = true;
    callback({ cancel: true });
  });
  const page = await window.webContents.executeJavaScript(`(async () => {
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      function check() {
        if (document.getElementById('root')?.textContent.includes('Comunidade dos Amigos')) return resolve();
        if (Date.now() >= deadline) return reject(new Error('A interface não montou em cinco segundos'));
        setTimeout(check, 25);
      }
      check();
    });
    const version = await window.electronAPI.getAppVersion();
    let captureBlocked = false;
    try { await window.electronAPI.getSystemSources({ types: ['screen'] }); }
    catch (error) { captureBlocked = String(error).includes('Captura real indisponível'); }
    const cspConnectBlocked = await new Promise((resolve) => {
      const timer = setTimeout(() => { document.removeEventListener('securitypolicyviolation', onViolation); resolve(false); }, 2000);
      function onViolation(event) {
        if (event.effectiveDirective === 'connect-src' && event.blockedURI.startsWith('https://127.0.0.1:9')) {
          clearTimeout(timer);
          document.removeEventListener('securitypolicyviolation', onViolation);
          resolve(true);
        }
      }
      document.addEventListener('securitypolicyviolation', onViolation);
      fetch('https://127.0.0.1:9/desktop-csp-probe').catch(() => {});
    });
    return {
      version, captureBlocked, cspConnectBlocked, bridgeIsolation: window.electronAPI.getRuntimeIsolation(), rendererLoaded: location.protocol === 'file:',
      nodeUnavailable: typeof require === 'undefined' && typeof process === 'undefined'
    };
  })()`, true);
  const isolation = page.bridgeIsolation.contextIsolated === true && page.bridgeIsolation.sandboxed === true;
  if (!page.rendererLoaded || !page.captureBlocked || !page.cspConnectBlocked || probeReachedNetwork || !page.nodeUnavailable || page.version !== app.getVersion() || !isolation) {
    throw new Error('Falha de carregamento, isolamento, CSP ou ponte IPC no smoke desktop');
  }
  console.log('DESKTOP_SMOKE_RESULT ' + JSON.stringify({ ok: true, electron: process.versions.electron, ...page, isolation, probeReachedNetwork }));
}

app.whenReady().then(async () => {
  setupIpcHandlers();
  mainWindow = createMainWindow(expectedURL, !smoke);
  mainWindow.webContents.on('preload-error', (_event, _path, error) => console.error('Preload:', error.message));
  await mainWindow.loadURL(expectedURL);
  if (smoke) {
    await verifySmoke(mainWindow);
    app.quit();
    return;
  }

  mainWindow.show();
  mainWindow.focus();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(expectedURL);
      void mainWindow.loadURL(expectedURL);
    }
  });
}).catch((error: Error) => {
  if (smoke) console.log('DESKTOP_SMOKE_RESULT ' + JSON.stringify({ ok: false, error: error.message }));
  else console.error(error.message);
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || smoke) {
    app.quit();
  }
});
