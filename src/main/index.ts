import { app, BrowserWindow, ipcMain, shell, desktopCapturer } from 'electron';
import { createMainWindow } from './window';
import { IPC_CHANNELS, validateIpcPayload, type DesktopSourceOptions, type OpenExternalUrlPayload } from '../common/ipc-channels';

function setupIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_DESKTOP_SOURCES, async (_event, opts?: DesktopSourceOptions) => {
    if (!validateIpcPayload(IPC_CHANNELS.GET_DESKTOP_SOURCES, opts)) {
      throw new Error('Payload inválido para obtenção de fontes desktop');
    }

    const types = opts?.types ?? ['screen', 'window'];
    const thumbnailSize = opts?.thumbnailSize ?? { width: 150, height: 150 };

    const sources = await desktopCapturer.getSources({ types, thumbnailSize });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_URL, async (_event, payload?: OpenExternalUrlPayload) => {
    if (!validateIpcPayload(IPC_CHANNELS.OPEN_EXTERNAL_URL, payload) || !payload) {
      throw new Error('URL externa inválida ou insegura');
    }

    await shell.openExternal(payload.url);
    return true;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
