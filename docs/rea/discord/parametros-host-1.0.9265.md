# Parametros do host Discord desktop 1.0.9265

Data: 2026-10-25. Analise somente estatica. O app nao foi executado nem alterado.

## Alvo

- Caminho: `%LOCALAPPDATA%\Discord\app-1.0.9265\resources\app.asar`
- SHA-256: `0025c02c7241045a12464309604ec4d5b8ec7ed2ce43cce05d5dacb8f253f672`
- `build_info.json`: releaseChannel `stable`, version `1.0.9265`, sentryDist `stable-win-x64`
- REA Evidence: `ev_8f85433b75e69b381385786883b966b34401bb1c2b0dcdf7cd787aec7b5e55b7` (analyze_javascript_application, cobertura parcial; semantica de bundle.js nao iniciada por limite de orcamento)

## Parametros encontrados

| Parametro | Valor | Evidencia (trecho literal no app.asar) |
| --- | --- | --- |
| APP_NAME | `"Discord"` + sufixo do canal | `exports.APP_NAME="Discord"+appNameSuffix` |
| APP_ID | `com.squirrel.Discord.Discord` | ``exports.APP_ID=`com.squirrel.${exports.APP_NAME}.${exports.APP_NAME}` `` |
| APP_PROTOCOL | `Discord` | `exports.APP_PROTOCOL="Discord"` |
| API_ENDPOINT | `https://discord.com/api` (sobrescrevivel por settings) | `API_ENDPOINT=settings?.get("API_ENDPOINT")\|\|"https://discord.com/api"` |
| UPDATE_ENDPOINT | settings ou API_ENDPOINT | `exports.UPDATE_ENDPOINT=settings?.get("UPDATE_ENDPOINT")\|\|exports.API_ENDPOINT` |
| URL de updates | `https://updates.discord.com/` | string literal |
| CDN | `https://cdn.discordapp.com` | string literal |
| Download | `https://discord.com/api/download/` | string literal |
| Chaves de settings | `ALLOW_OPTIONAL_UPDATES`, `ALWAYS_ALLOW_UPDATES`, `ALWAYS_BOOTSTRAP_MODULES`, `DISCORD_CLEAR_BUILD_OVERRIDE` | strings literais |
| Eventos do splash | `DISCORD_SPLASH_SCREEN_READY`, `DISCORD_SPLASH_SCREEN_QUIT`, `DISCORD_SPLASH_UPDATE_STATE`, `DISCORD_SPLASH_SCREEN_QUOTE` | strings literais |
| Flags de inicializacao | `DESKTOP_TTI_DNSTCP_WARMUP`, `DESKTOP_TTI_EARLY_UPDATE_CHECK`, `DESKTOP_TTI_SPLASH_USE_WEBP` | strings literais |
| Modulos nativos | discord_cloudsync, desktop_core, desktop_overlay, dispatch, erlpack, game_utils, hook, krisp, media, modules, notifications, overlay2, rpc, spellcheck, utils, voice, zstd | pasta `app-1.0.9265\modules` |

## Limitacoes

- O `app.asar` e so o host (bootstrap, updater, splash). A interface principal carrega remotamente de `https://discord.com`; nao foi inspecionada.
- Tamanhos de janela e cores nao apareceram como literais claros; ficam pendentes.
- Endpoints de produto (canais, mensagens, gateway) nao estao neste pacote.
