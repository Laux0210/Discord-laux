import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2] ?? 'http://127.0.0.1:5181/dm-validation.html';
const url = new URL(target);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') {
  throw new Error('O smoke aceita somente a página de validação em loopback.');
}

if (!process.versions.electron) {
  const electron = (await import('electron')).default;
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, [fileURLToPath(import.meta.url), target], {
    cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  let stderr = '';
  const timer = setTimeout(() => { console.error('Smoke de DM excedeu 30 segundos.'); child.kill(); process.exitCode = 1; }, 30_000);
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', (error) => { clearTimeout(timer); console.error(error.message); process.exitCode = 1; });
  child.on('exit', (code) => {
    clearTimeout(timer);
    const line = output.split(/\r?\n/).find((item) => item.startsWith('DM_SMOKE_RESULT '));
    if (line) console.log(line.slice('DM_SMOKE_RESULT '.length));
    else console.error('Electron não entregou o resultado do smoke de DM. ' + stderr.slice(-2000));
    process.exitCode = code === 0 && line ? 0 : 1;
  });
} else {
  // Não bloquear a avaliação do módulo ESM aguardando o evento ready do Electron.
  void (async () => {
  const { app, BrowserWindow, session } = await import('electron');
  app.setPath('userData', path.join(root, '.codex/logs', `dm-smoke-${process.pid}`));
  await app.whenReady();
  const isolated = session.fromPartition(`dm-validation-${process.pid}`, { cache: false });
  const blocked = [];
  isolated.setPermissionCheckHandler(() => false);
  isolated.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  isolated.setDisplayMediaRequestHandler((_request, callback) => callback({}));
  isolated.webRequest.onBeforeRequest((details, callback) => {
    const request = new URL(details.url);
    const allow = ['http:', 'ws:'].includes(request.protocol) && request.host === url.host;
    if (!allow) blocked.push(request.origin);
    callback({ cancel: !allow });
  });
  const window = new BrowserWindow({ show: false, width: 1280, height: 820,
    webPreferences: { session: isolated, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const errors = [];
  window.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  const run = (source) => window.webContents.executeJavaScript(source);
  const wait = async (condition) => {
    const deadline = Date.now() + 8_000;
    while (!await run(condition)) {
      if (Date.now() > deadline) throw new Error(`Condição não observada: ${condition}`);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  };
  const click = async (selector) => {
    await wait(`!!document.querySelector(${JSON.stringify(selector)})`);
    await run(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const shot = async (name) => {
    await run('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const image = await window.webContents.capturePage();
    const destination = path.join(root, 'docs/validacao/evidencias', name);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, image.toPNG());
  };
  try {
    await window.loadURL(target);
    await click('[data-testid="btn-dm-home"]');
    await click('[data-testid="btn-open-dm-user-2"]');
    await wait('!!document.querySelector("textarea:not(:disabled)")');
    await run(`(() => { const input = document.querySelector('textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Mensagem fictícia: validação de DM local');
      input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await wait('!document.querySelector("button[type=submit]").disabled');
    await run('document.querySelector("textarea").form.requestSubmit()');
    await wait('document.querySelector("ol")?.textContent.includes("Mensagem fictícia: validação de DM local")');
    await shot('dm-local-04-envio.png');
    await run(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Voltar para Amigos').click()`);
    await click('[data-testid="btn-open-dm-user-2"]');
    await wait('document.querySelector("ol")?.textContent.includes("Mensagem fictícia: validação de DM local")');
    await click('[data-testid^="guild-item-"]');
    await click('[data-testid="btn-logout"]');
    await click('[data-testid="btn-login-amigo-2"]');
    await click('[data-testid="btn-dm-home"]');
    await click('[data-testid="btn-open-dm-user-1"]');
    await wait('document.querySelector("ol")?.textContent.includes("Mensagem fictícia: validação de DM local")');
    await shot('dm-local-04-outro-participante.png');
    await click('[data-testid^="guild-item-"]');
    await click('[data-testid="btn-logout"]');
    await click('[data-testid="btn-login-amigo-3"]');
    await click('[data-testid="btn-dm-home"]');
    await wait('!!document.querySelector("[data-testid=friends-area]")');
    if (await run('document.body.textContent.includes("Mensagem fictícia: validação de DM local") || !!document.querySelector("[data-testid^=btn-open-dm-]")')) {
      throw new Error('Terceiro recebeu acesso visual à DM.');
    }
    if (blocked.length || errors.length) throw new Error(`Tentativas externas: ${blocked.length}; erros de console: ${errors.join('; ')}`);
    console.log('DM_SMOKE_RESULT ' + JSON.stringify({ ok: true, sent: true, reopened: true,
      otherParticipantRead: true, thirdPartyHidden: true, externalRequests: blocked.length,
      consoleErrors: errors.length, electron: process.versions.electron, fixture: target }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.log('DM_SMOKE_RESULT ' + JSON.stringify({ ok: false, error: error.message, externalRequests: blocked.length, consoleErrors: errors }));
    window.destroy();
    app.exit(1);
  }
  })().catch((error) => { console.error(error); process.exit(1); });
}
