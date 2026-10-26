# Discord desktop 1.0.9265: módulos e IPC

Data: 2026-10-26. Análise só estática. O Discord não foi executado nem alterado.
Reaproveitamento: só ideias e padrões; nenhum código do Discord foi copiado.

## Alvos

| Artefato | Caminho (`%LOCALAPPDATA%\Discord\app-1.0.9265\`) | SHA-256 |
| --- | --- | --- |
| Host | `resources\app.asar` | `0025c02c7241045a...f672` |
| Núcleo | `modules\discord_desktop_core-1\discord_desktop_core\core.asar` | `922c22e53eceb3a6...a48e` |

Método: `grep -a` nos bytes dos dois `.asar` (comandos abaixo), mais Evidence REA anterior
(`ev_8f85433b...` no host). As linhas marcadas **[inferido]** não foram observadas diretamente.

## 1. Módulos principais

```
Discord.exe (Update.exe/Squirrel)
  app.asar  (host: bootstrap, updater, splash, settings)
    -> modules\discord_desktop_core  (core.asar)
         bundle.js            processo main: janela, IPC handlers, segurança
         mainScreenPreload.js preload: expõe window.DiscordNative via contextBridge
         frameViewPreload.js  preload das frame views (atividades embutidas)
    -> 16 outros módulos nativos (voice, krisp, rpc, overlay, notifications, ...)
  renderer remoto: https://discord.com/app  (UI React, fora do pacote)
```

| Módulo | Papel | Evidência |
| --- | --- | --- |
| Host `app.asar` | Updater, splash, endpoints (`API_ENDPOINT` etc.) | `parametros-host-1.0.9265.md` |
| `bundle.js` | Janela principal 1280x720, `webPreferences`, handlers IPC | `parametros-core-1.0.9265.md` |
| `mainScreenPreload.js` | `contextBridge.exposeInMainWorld("DiscordNative",...)` com 24 namespaces | idem |
| Renderer | Carregado de `WEBAPP_ENDPOINT` + `/app` | `WEBAPP_PATHS={APP:"/app",...}` |
| Módulos nativos | 17 pastas `discord_*` | `ls modules` |

## 2. IPC

**Contagens observadas no `core.asar`:**

| Chamada | Ocorrências |
| --- | --- |
| `ipcMain.handle(` | 23 |
| `ipcMain.on(` | 17 |
| `ipcRenderer.invoke` | 24 |
| `ipcRenderer.sendSync` | 13 |
| `ipcRenderer.on` | 12 |
| `ipcRenderer.send` | 5 |
| `.handle(...IPCEvents.X` (via wrapper) | 108 |
| `.on(...IPCEvents.X` (via wrapper) | 35 |

As contagens diretas (`ipcMain.*`) e as feitas via wrapper se sobrepõem. **[inferido]**

**Padrão:** os canais vêm de um enum central, `IPCEvents`. O wrapper `DiscordIPC` só repassa a chamada:
`exports.DiscordIPC={main:class{static on(channel,listener){electron_1.default.ipcMain.on(channel,...)}static handle(...)...},renderer:class{static sendSync...invoke...on...}}`.
O wrapper não valida payload nem remetente. A validação, quando existe, fica dentro de cada handler.

**Main -> renderer:** `mainWindow.webContents.send(\`${DISCORD_NAMESPACE}${event}\`,...)`, com `DISCORD_NAMESPACE="DISCORD_"`.

**Grupos de canais (por prefixo `DISCORD_*`, número de ocorrências):**

| Grupo | Ocorr. | Direção | Finalidade |
| --- | --- | --- | --- |
| `APP_*` | 81 | renderer -> main (invoke/sendSync) | versão, arquitetura, badge, relaunch, path |
| `FRAME_*` / `FRAME_VIEW_*` | 78 | ambos | atividades embutidas (create, load, input, layout) |
| `WINDOW_*` | 75 | renderer -> main | minimizar, maximizar, foco, always-on-top |
| `PROCESS_*` | 36 | renderer -> main | CPU, GPU, crash info, flush cookies/DNS |
| `FILE_*` | 30 | renderer -> main | diálogos abrir/salvar, pastas de módulo |
| `NOTIFICATIONS_*` | 24 | renderer -> main | enviar, remover, autorização |
| `POWER_*`, `CLIPBOARD_*`, `SPELLCHECK_*` | 24/24/18 | renderer -> main | sistema |
| `ACTIVITY_*` | 18 | renderer -> main | captura de atividade (stream) |

Lista dos handlers via wrapper: comando 3 (saída truncada em ~2500 caracteres).

**Validação do remetente observada (só em alguns handlers):**
`ACTIVITY_CAPTURE_STREAM_START,(event,options)=>{let consumerFrame=event.sender.mainFrame;if(event.senderFrame!==consumerFrame)throw Error("Activity capture must be requested by the main fra...`

**Segurança relacionada:**
- `BLOCKED_URL_PROTOCOLS=["file:","javascript:","vbscript:","data:","about:","chrome:","ms-cxh:","ms-cxh-full:","ms-word:","shell:","ms-msdt:","search-ms:","ms-officecmd:","ms-appinstaller:"]`
- `shouldOpenExternalUrl`: rejeita URL inválida, protocolo bloqueado e protocolo com menos de 2 letras.
- `setPermissionRequestHandler`: libera `accessibility-events`; libera `notifications` só para a mesma origem (`checkUrlOriginMatches`).
- `setWindowOpenHandler`: abre popout só para `DISCORD_*` + mesma origem + `/popout`; senão manda ao navegador por `saferShell`.
- `webPreferences`: `contextIsolation:!0`, `nodeIntegration:!1`, `sandbox:!1`.

## 3. Comandos de evidência (reproduzíveis)

```bash
C="$LOCALAPPDATA/Discord/app-1.0.9265/modules/discord_desktop_core-1/discord_desktop_core/core.asar"
grep -aoE 'ipcMain\.(handle|on|once)\(' "$C" | sort | uniq -c                         # 1
grep -aoE 'ipcRenderer\.(invoke|send|sendSync|on|removeListener)' "$C" | sort | uniq -c # 2
grep -aoE '\.(handle|on|handleSync)\(([A-Za-z_0-9]+\.)?IPCEvents\.[A-Z_0-9]+' "$C" | sed -E 's/.*IPCEvents\.//' | sort -u  # 3
grep -aoE 'exports\.DiscordIPC=\{main:class\{.{0,700}' "$C"                              # 4
grep -aoE '.{0,80}senderFrame.{0,80}' "$C"                                               # 5
grep -aoE 'BLOCKED_URL_PROTOCOLS=\[[^]]{0,200}\]' "$C"                                    # 6
grep -aoE 'setPermissionRequestHandler.{0,200}' "$C"                                     # 7
grep -aoE 'DISCORD_[A-Z]+_' "$C" | sort | uniq -c | sort -rn                              # 8
```

## 4. Aproveitável no projeto

| Item | Motivo | Como aplicar | Estado no projeto |
| --- | --- | --- | --- |
| Enum central de canais | Um lugar só, sem strings soltas | Já existe: `IPC_CHANNELS` em `src/common/ipc-channels.ts` | Já feito; manter |
| Prefixo por domínio (`APP_`, `WINDOW_`...) | Fica fácil auditar e filtrar canais | Nomear novos canais como `app:*`, `window:*`, `system:*` | Já segue (`app:get-version`, `system:open-external`) |
| Bloqueio de protocolos perigosos | Evita `file:`, `javascript:`, `ms-msdt:` e outros vetores do Windows | Já está em `DISCORD_CORE_BLOCKED_URL_PROTOCOLS`; o nosso `OPEN_EXTERNAL_URL` é mais rígido (só aceita `http:`/`https:`) | Manter allowlist; a lista do Discord fica como referência |
| Permissão de notificação só para a mesma origem | Hoje o projeto nega tudo (`callback(false)`) | Se notificação nativa entrar no app, liberar só `notifications` e só para a origem esperada | Futuro |
| `senderFrame === mainFrame` | Bloqueia chamadas vindas de iframes | Já em `src/main/ipc-security.ts:8-9`, aplicado a **todos** os handlers e checando também a URL | O nosso já é mais forte |
| Main -> renderer com prefixo | Separa eventos do app de mensagens de terceiros | Usar `webContents.send` só com nomes do enum | Aplicar quando houver push do main |
| Popout restrito por origem e caminho | Modelo para janela de voz/tela separada | `setWindowOpenHandler`: permitir só a URL interna esperada; o resto, `deny` | Futuro (hoje tudo é `deny`) |

## 5. Descartado

| Item | Motivo |
| --- | --- |
| `sandbox:!1` | O projeto exige `sandbox: true` (`src/main/window.ts:48`); seria regressão. |
| `ipcRenderer.sendSync` (13 usos) | Trava o renderer; o projeto só usa `invoke`. |
| Wrapper `DiscordIPC` sem validação | O nosso `validateIpcPayload` por canal é mais seguro. |
| Preload grande com 24 namespaces | Superfície grande demais; o projeto expõe 5 métodos. |
| `FRAME_VIEW_*`, `ACTIVITY_*`, `CLIPS`, overlay | Atividades, clipes e overlay de jogos estão fora do escopo. |
| `PROCESS_UTILS_*` (CPU, GPU, flush DNS) | Telemetria e manutenção que o produto não precisa. |
| Módulos nativos (krisp, hook, game_utils) | Binários proprietários; não dá para reaproveitar. |
| Renderer remoto (`discord.com/app`) | O projeto carrega UI local; remoto aumentaria a superfície. |
| `DANGEROUS_ENABLE_DEVTOOLS_...` | Chave de depuração; não deve existir em produção. |

## 6. Não confirmado

- Mapa exato canal -> handler -> chamada no preload: o grafo semântico do REA truncou (`mainScreenPreload.js` tem 1,1 MB).
- Direção de cada canal individual: a tabela agrupa por prefixo. **[inferido]**
- Comportamento em execução (ordem das mensagens, payload real): não houve análise em runtime.
- As contagens diretas e via wrapper podem se sobrepor.
