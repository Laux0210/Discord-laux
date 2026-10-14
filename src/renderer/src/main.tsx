import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { MockAuthService } from './services/mock-auth';
import { MockChatService } from './services/mock-chat';
import { MockMediaService } from './services/mock-media';
import './index.css';

const authService = new MockAuthService();
const chatService = new MockChatService();
const mediaService = new MockMediaService();

// Inicializa com usuário padrão em desenvolvimento local
authService.login('amigo-1').then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App
        authService={authService}
        chatService={chatService}
        mediaService={mediaService}
      />
    </React.StrictMode>
  );
});
