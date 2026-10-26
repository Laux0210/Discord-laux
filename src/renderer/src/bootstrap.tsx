import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createLocalAppServices } from './services/local-app-services';
import { createRemoteAppServices } from './services/remote-app-services';
import { createSupabaseAppServices, resolveSupabaseConfig } from './services/supabase-app-services';

export async function mountLocalApp(container: HTMLElement): Promise<() => void> {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const shared = env?.VITE_SHARED_BACKEND === 'true' ||
    (typeof document !== 'undefined' && document.querySelector('meta[name="app-backend"]')?.getAttribute('content') === 'shared');
  const supabase = resolveSupabaseConfig(env);
  const services = supabase
    ? await createSupabaseAppServices(supabase)
    : shared ? await createRemoteAppServices() : await createLocalAppServices();
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App {...services} />
    </React.StrictMode>
  );
  return () => root.unmount();
}
