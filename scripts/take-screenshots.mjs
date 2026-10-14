import { app, BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const htmlUrl = new URL('../dist/index.html', import.meta.url).href;
const artifactDir = 'C:/Users/jv883/.gemini/antigravity-cli/brain/152eca37-3297-4cd3-80f2-2ec47131e4aa/screenshots';

app.whenReady().then(async () => {
  mkdirSync(artifactDir, { recursive: true });

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: fileURLToPath(new URL('../dist-electron/preload/index.cjs', import.meta.url)),
      contextIsolation: true,
      sandbox: true
    }
  });

  await win.loadURL(htmlUrl);

  // Espera a montagem completa da interface
  await win.webContents.executeJavaScript(`new Promise((resolve) => {
    const timer = setInterval(() => {
      if (document.getElementById('root')?.textContent.includes('Comunidade dos Amigos')) {
        clearInterval(timer);
        resolve(true);
      }
    }, 50);
  })`);

  // Delay de renderização inicial
  await new Promise(r => setTimeout(r, 600));

  // Screenshot 1: Canal de Chat (#geral)
  let img = await win.webContents.capturePage();
  writeFileSync(join(artifactDir, '01-chat-geral.png'), img.toPNG());
  console.log('Gravado 01-chat-geral.png');

  // Clica especificamente no span 'Voz Principal'
  await win.webContents.executeJavaScript(`(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    const span = spans.find(s => s.textContent === 'Voz Principal');
    span?.click();
  })()`);

  await new Promise(r => setTimeout(r, 700));

  // Screenshot 2: Sala de Voz
  img = await win.webContents.capturePage();
  writeFileSync(join(artifactDir, '02-sala-voz.png'), img.toPNG());
  console.log('Gravado 02-sala-voz.png');

  // Clica no botão de Mensagens Diretas (DMs) na barra lateral
  await win.webContents.executeJavaScript(`(() => {
    const dmBtn = document.querySelector('[data-testid="btn-dm-home"]');
    if (dmBtn) dmBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 700));

  // Screenshot 3: Amigos
  img = await win.webContents.capturePage();
  writeFileSync(join(artifactDir, '03-amigos.png'), img.toPNG());
  console.log('Gravado 03-amigos.png');

  // Clica em 'Mensagem Direta' para abrir DM com Amigo Dois
  await win.webContents.executeJavaScript(`(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const dmBtn = buttons.find(b => b.textContent && b.textContent.includes('Mensagem Direta'));
    if (dmBtn) dmBtn.click();
  })()`);

  await new Promise(r => setTimeout(r, 700));

  // Screenshot 4: Conversa Privada (DM)
  img = await win.webContents.capturePage();
  writeFileSync(join(artifactDir, '04-dm-conversa.png'), img.toPNG());
  console.log('Gravado 04-dm-conversa.png');

  app.quit();
}).catch((err) => {
  console.error(err);
  app.exit(1);
});
