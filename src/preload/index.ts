import { contextBridge, ipcRenderer } from 'electron';
import { createPreloadApi, type PreloadApi } from './api';

const api = createPreloadApi(ipcRenderer);
const bridgeApi = {
  ...api,
  getRuntimeIsolation: () => ({ contextIsolated: process.contextIsolated, sandboxed: process.sandboxed })
};

contextBridge.exposeInMainWorld('electronAPI', bridgeApi);

declare global {
  interface Window {
    electronAPI: PreloadApi & Pick<typeof bridgeApi, 'getRuntimeIsolation'>;
  }
}
