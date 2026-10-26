# Parametros do modulo `discord_desktop_core` 1.0.9265 (`core.asar`)

Data: 2026-10-25. Analise somente estatica (complementar a `parametros-host-1.0.9265.md`). O aplicativo Discord nao foi executado nem alterado.

## Alvo e Evidencias REA

- Caminho: `%LOCALAPPDATA%\Discord\app-1.0.9265\modules\discord_desktop_core-1\discord_desktop_core\core.asar`
- Tamanho: `1.832.667` bytes
- SHA-256 (antes e depois da inspecao): `922c22e53eceb3a62fdfa51240ebbbb55e8e75cbc03caa6b711f6193448fa48e`
- Membros do pacote ASAR: `bundle.js` (`439.665` bytes), `mainScreenPreload.js` (`1.116.629` bytes), `frameViewPreload.js` (`21.149` bytes), `package.json` (`1.536` bytes), `data/`

| Operacao REA | Evidence ID | Escopo / Observacao |
| --- | --- | --- |
| `analyze_javascript_application` (parent) | `ev_c8dc56268ba8965d67a874ee0c79b10adb60f3e20b606e1a892915ef814fad2a` | 4 arquivos relevantes, 3 JS parseados (`1.578.979` bytes lidos), `274.373` nos AST, `1.820` findings, `7` observacoes de validacao de emissor |
| `inspect_analysis_view` (`summary`) | `ev_0cbe9e4431cc5fc3d03978036997f1d25ddb1a0d1f246e6ad62c7e5e4520793c` | Cobertura estatica dos modulos (`571/613` examinados); grafo semantico parcial por orcamento em `frameViewPreload.js` e `mainScreenPreload.js` |
| `inspect_analysis_view` (`page`, offset 0, limit 16) | `ev_e356f033c1cd2fa3270a5ce0b18a71dceeeb41f268781daca5ce12c67e57ad52` | Pagina de identidades de modulos em `bundle.js` e `mainScreenPreload.js` |
| `inspect_analysis_view` (`item`, `bundle.js`) | `ev_a6844562794c9cc1451889d89a2818d5041c38456114d703eba243d53bfc9bae` | No `jag_node_01e5e579d7d98b30a51bdc81c2a846dfee67c6c2a8946fd6bd1496b90bc3be4f` (SHA-256 `af460603a22f6d1b6cf766150fa0a11f9120da167ef334fc57c03b0c14acfcbd`) |

## Parametros encontrados no `core.asar` (Janela Principal, Preload e IPC)

Estes achados respondem aos itens que estavam pendentes em `parametros-host-1.0.9265.md` (dimensoes de janela, cor de fundo da janela principal, opcoes de `BrowserWindow`, preload `DiscordNative` e canais IPC do nucleo desktop):

| Parametro | Valor | Evidencia literal (`core.asar`) |
| --- | --- | --- |
| `DEFAULT_WIDTH` (`mainWindowOptions.width`) | `1280` | `bundle.js`: `mainWindowOptions={title:"Discord",backgroundColor:getBackgroundColor(),width:1280,height:720,minWidth:MIN_WIDTH,minHeight:MIN_HEIGHT,...}` |
| `DEFAULT_HEIGHT` (`mainWindowOptions.height`) | `720` | `bundle.js`: `width:1280,height:720,minWidth:MIN_WIDTH,minHeight:MIN_HEIGHT` |
| `MIN_WIDTH` | `940` (sobrescrevivel por settings) | `bundle.js`: `MIN_WIDTH=settings?.get("MIN_WIDTH",940)` |
| `MIN_HEIGHT` | `500` (sobrescrevivel por settings) | `bundle.js`: `MIN_HEIGHT=settings?.get("MIN_HEIGHT",500)` |
| `POPOUT_MIN_WIDTH` / `POPOUT_MIN_HEIGHT` | `320` / `180` | `bundle.js`: `DEFAULT_POPOUT_OPTIONS={title:"Discord Popout",backgroundColor:"#2f3136",minWidth:320,minHeight:180,transparent:!1,frame:!1,resizable:!0,show:!0,...}` |
| `DEFAULT_BACKGROUND_COLOR` | `#2f3136` | `bundle.js`: `let DEFAULT_BACKGROUND_COLOR="#2f3136",BACKGROUND_COLOR_KEY="BACKGROUND_COLOR"` |
| `getBackgroundColor()` | `settings?.get("BACKGROUND_COLOR", "#2f3136") ?? "#2f3136"` | `bundle.js`: `function getBackgroundColor(){return settings?.get(BACKGROUND_COLOR_KEY,DEFAULT_BACKGROUND_COLOR)??DEFAULT_BACKGROUND_COLOR}` |
| `getSavedWindowBounds()` | Clamping por `Math.max(MIN_WIDTH, width)` e `Math.max(MIN_HEIGHT, height)` | `bundle.js`: `bounds.width=Math.max(MIN_WIDTH,bounds.width),bounds.height=Math.max(MIN_HEIGHT,bounds.height)` |
| `MAIN_WINDOW_BLINK_FEATURES` | `"EnumerateDevices,AudioOutputDevices"` | `bundle.js`: `exports.MAIN_WINDOW_BLINK_FEATURES="EnumerateDevices,AudioOutputDevices"` |
| `WEBAPP_PATHS` | `{ APP: "/app", CONFERENCE_MODE: "/conference-mode" }` | `bundle.js`: `exports.WEBAPP_PATHS={APP:"/app",CONFERENCE_MODE:"/conference-mode"}` |
| `mainWindowOptions.webPreferences` | `nodeIntegration: false`, `sandbox: false`, `contextIsolation: true`, `spellcheck: true`, `preload: "mainScreenPreload.js"` | `bundle.js` (offset UTF-16 `180321`): `webPreferences:{enableBlinkFeatures:exports.MAIN_WINDOW_BLINK_FEATURES,nodeIntegration:!1,sandbox:!1,preload:path_1.default.join(__dirname,"mainScreenPreload.js"),spellcheck:!0,contextIsolation:!0,...}` |
| Chaves adicionais de `settings` no core | `MIN_WIDTH`, `MIN_HEIGHT`, `WINDOW_BOUNDS`, `BACKGROUND_COLOR`, `WEBAPP_PATH`, `enableConferenceMode`, `DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING` | `bundle.js` (offsets `175252`–`179074`) |
| Preload `contextBridge` principal | `DiscordNative` (exposto em `mainScreenPreload.js`, `36` namespaces de modulo + `isRenderer` e `setUncaughtExceptionHandler`) | `mainScreenPreload.js` (offsets UTF-16 `1114500`–`1116000`): `contextBridge.exposeInMainWorld("DiscordNative",DiscordNative)` com `nativeModules`, `process`, `os`, `app`, `clipboard`, `ipc`, `gpuSettings`, `window`, `powerMonitor`, `ntpClock`, `spellCheck`, `crashReporter`, `desktopCapture`, `activityCapture`, `fileManager`, `clips`, `processUtils`, `powerSaveBlocker`, `frameDebugger`, `frameView`, `http`, `accessibility`, `features`, `settings`, `userDataCache`, `thumbar`, `safeStorage`, `hardware`, `tracing`, `riotGames`, `cs2Gsi`, `dotaGsi`, `rocketLeagueStatsApi`, `webAuthn`, `gcEvents`, `sysimg` |
| Whitelist `nativeModules.requireModule(name)` | Regex `/^discord_[a-z0-9_-]+$/` ou `"erlpack"`, bloqueando `PRELOAD_ONLY_MODULES = new Set(["discord_premap"])` | `mainScreenPreload.js` (modulo `7927`, offset UTF-16 `364000`): `if(!/^discord_[a-z0-9_-]+$/.test(name)&&"erlpack"!==name\|\|PRELOAD_ONLY_MODULES.has(name))throw Error(...)` |
| `DESKTOP_CAPTURER_GET_SOURCES` (`desktopCapture`) | Canal `DISCORD_DESKTOP_CAPTURER_GET_SOURCES`; filtra `opts.types` em lowercase contra `["screen", "window"]`, propaga `thumbnailSize` e define `fetchWindowIcons: true` | `bundle.js` (offset UTF-16 `49707`) e `mainScreenPreload.js` (offset UTF-16 `23840`) |
| `frameViewPreload.js` (`DISCORD_FRAME_VIEW_*`) | Exige `process.isMainFrame` (erro `"Preload scripts should not be running in a subframe"`), canais `DISCORD_FRAME_VIEW_SHELL_READY`, `DISCORD_FRAME_VIEW_SHELL_LOAD`, `DISCORD_FRAME_VIEW_SHELL_EXIT`, e `overscan = 2 / window.devicePixelRatio` | `frameViewPreload.js` (modulo `8331`, offsets UTF-16 `1800`–`4500`) |
| Canais IPC de janela e settings (`IPCEvents`) | `DISCORD_WINDOW_MINIMIZE`, `DISCORD_WINDOW_MAXIMIZE`, `DISCORD_WINDOW_RESTORE`, `DISCORD_WINDOW_CLOSE`, `DISCORD_WINDOW_FOCUS`, `DISCORD_WINDOW_BLUR`, `DISCORD_WINDOW_FLASH_FRAME`, `DISCORD_WINDOW_TOGGLE_FULLSCREEN`, `DISCORD_WINDOW_SET_ALWAYS_ON_TOP`, `DISCORD_WINDOW_IS_ALWAYS_ON_TOP`, `DISCORD_WINDOW_SET_MINIMUM_SIZE`, `DISCORD_WINDOW_SET_PROGRESS_BAR`, `DISCORD_WINDOW_SET_BACKGROUND_THROTTLING`, `DISCORD_WINDOW_SET_WINDOW_CONTENT_PROTECTION`, `DISCORD_SETTINGS_GET`, `DISCORD_SETTINGS_GET_SYNC`, `DISCORD_SETTINGS_SET`, `DISCORD_SETTINGS_UPDATE_BACKGROUND_COLOR` | `core.asar`: `204` strings literais unicas entre aspas (`216` tokens unicos `DISCORD_[A-Z0-9_]+` no arquivo inteiro, sendo `212` em `bundle.js`, `209` em `mainScreenPreload.js` e `203` em `frameViewPreload.js`) |
| `BLOCKED_URL_PROTOCOLS` (`securityUtils`) | `["file:", "javascript:", "vbscript:", "data:", "about:", "chrome:", "ms-cxh:", "ms-cxh-full:", "ms-word:", "shell:", "ms-msdt:", "search-ms:", "ms-officecmd:", "ms-appinstaller:"]` (`14` protocolos) | `bundle.js` (offsets UTF-16 `254000`–`255500`): `BLOCKED_URL_PROTOCOLS=[...]`; `shouldOpenExternalUrl(e)` faz parse com `new URL(e).protocol.toLowerCase()` e rejeita protocolos na blocklist ou esquemas de 1 letra (`protocol.replace(/:$/, "").length < 2`) |
| `checkUrlOriginMatches(urlA, urlB)` (`securityUtils`) | Compara estritamente `parsedUrlA.protocol === parsedUrlB.protocol && parsedUrlA.host === parsedUrlB.host` apos `new URL(...)` | `bundle.js` (offsets UTF-16 `254000`–`255500`): retorna `false` se qualquer URL lancar excecao em `new URL()` |
| `setPermissionRequestHandler` / `setPermissionCheckHandler` (`mainScreen`) | `requestAllowed`: `["accessibility-events", "notifications", "pointerLock", "fullscreen", "clipboard-sanitized-write", "media"]`; `checkAllowed`: `["notifications", "fullscreen", "pointerLock", "clipboard-sanitized-write", "media"]` | `bundle.js` (offsets UTF-16 `181600`–`183500`): handlers anexados a `mainWindow.webContents.session` (`media` exige correspondencia de origem com `WEBAPP_ENDPOINT` ou `AllowedMediaOrigins`) |
| `connectionBackoff` (`mainScreen`) | `new Backoff(1000, 20000)` (`minDelayMs = 1000`, `maxDelayMs = 20000`) | `bundle.js` (offset UTF-16 `175800`): `connectionBackoff=new Backoff_1.default(1e3,2e4)` |
| `systemTray` (`TRAY_ICON_NAMES`, `TrayGuidByChannel`, `IDLE_STATES`, `getTrayIcon()`) | Icones: `DEFAULT` (`tray`), `UNREAD` (`tray-unread`), `CONNECTED` (`tray-connected`), `SPEAKING` (`tray-speaking`), `MUTED` (`tray-muted`), `DEAFENED` (`tray-deafened`); GUIDs: `stable` (`699e423d-73da-42ba-b94e-881ff8672467`), `ptb` (`8bdf397e-37fc-440a-ac55-ec80cc585152`), `canary` (`d9c5e1da-d4ab-424f-97cf-00c2ce9bec67`), `development` (`6603ea8b-b21d-46e9-8ea5-d87b9105613f`); precedencia: conectado `DEAFENED > MUTED > SPEAKING > CONNECTED`, desconectado `UNREAD > DEFAULT` | `bundle.js` (offsets UTF-16 `255600`–`260100`): modulo `systemTray.js` embutido em `bundle.js` |

## Diferencas e Adaptacoes para o Projeto Proprio

1. **Seguranca de Sandbox (`RF-01` / `BASE-LOCAL-02`):** Enquanto o `core.asar` do Discord define `sandbox: false` na janela principal para carregar modulos nativos no preload, o nosso projeto mantem obrigatoriamente `sandbox: true` e `contextIsolation: true` em `src/main/window.ts` (verificado pelo smoke test `npm run test:desktop`).
2. **Validacao de `openExternal`:** Enquanto o `core.asar` usa blocklist de 14 protocolos (`BLOCKED_URL_PROTOCOLS`), o nosso projeto aplica allowlist estrita (`http:` e `https:`) em `src/common/ipc-channels.ts` (que rejeita todos os 14 protocolos bloqueados pelo Discord mais qualquer esquema customizado). As constantes e funcoes de referencia do `core.asar` estao codificadas e testadas em `src/common/discord-core-reference.ts` e `tests/unit/discord-core-reference.test.ts`.
3. **Endpoints:** As URLs `https://discord.com` e `https://discord.com/api` sao apenas referencia documental da instalacao inspecionada; o aplicativo proprio nunca deve enviar trafego para servidores do Discord.

## Limitacoes

- Analise puramente estatica de `core.asar`; nenhuma funcao foi executada em runtime.
- O grafo semantico de `mainScreenPreload.js` e `frameViewPreload.js` teve truncamento parcial por orcamento de memoria do worker REA, mas todos os fatos estaticos e literais citados acima foram extraidos e verificados diretamente nos bytes do artefato.
- A paleta completa de temas CSS e componentes React da UI principal continua sendo servida pelo webapp remoto e nao reside em `core.asar`.
