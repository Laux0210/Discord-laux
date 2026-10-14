import { BrowserWindow, session } from 'electron';
import { fileURLToPath } from 'node:url';

export function rendererURL(devURL?: string): string {
  if (!devURL) return new URL('../../dist/index.html', import.meta.url).href;
  const parsed = new URL(devURL);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  if (!loopback || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('O servidor de desenvolvimento deve usar uma URL HTTP local sem credenciais');
  }
  return parsed.href;
}

export function createMainWindow(expectedURL: string, show = true): BrowserWindow {
  const localSession = session.defaultSession;
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  localSession.setDisplayMediaRequestHandler((_request, callback) => callback({}));

  const connectSource = expectedURL.startsWith('file:') ? "'self'" : "'self' " + new URL(expectedURL).origin;
  localSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'none'; connect-src " + connectSource + "; object-src 'none'; frame-src 'none';"
        ]
      }
    });
  });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    show,
    title: 'Discord Desktop',
    backgroundColor: '#313338',
    webPreferences: {
      preload: fileURLToPath(new URL('../preload/index.cjs', import.meta.url)),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== expectedURL) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  return mainWindow;
}
