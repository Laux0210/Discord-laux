import { contextBridge, ipcRenderer } from 'electron';
import { createPreloadApi, type PreloadApi } from './api';

const api = createPreloadApi(ipcRenderer);

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: PreloadApi;
  }
}
