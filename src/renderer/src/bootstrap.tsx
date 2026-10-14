import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createLocalAppServices } from './services/local-app-services';

export async function mountLocalApp(container: HTMLElement): Promise<() => void> {
  const services = await createLocalAppServices();
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App {...services} />
    </React.StrictMode>
  );
  return () => root.unmount();
}
