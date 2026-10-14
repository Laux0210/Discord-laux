# REA-REF-02A — Catálogo estático inicial do Discord

Data: 2026-10-14. Responsável: `producao_rea`. Estado: **parcial**. Este catálogo documenta o bootstrap, a splash e declarações selecionadas do pacote. REA-REF-02/03 integrais dependem de observação autorizada, contratos e revisão; nenhuma tela principal foi confirmada visualmente.

## Identidade e método

Alvo: `C:/Users/jv883/AppData/Local/Discord/app-1.0.9261/resources/app.asar`, 3.619.342 bytes. SHA-256 revalidado nesta tarefa: `535bcb3de917fa65289519e399ea82ab93d9e4df35f7b437ae8433e5ca9d39ca`. A versão/canal declarados na [identidade](identidade.md) são metadados locais; não atestam autenticidade oficial ou ausência de personalizações.

Foram lidos AGENTS/README, contratos da equipe, Obsidian `Discord/00`, `12` e `14` por Markdown local, e ai-memory `discord/discord` por MCP. O MCP Obsidian não estava anunciado. Essas fontes são histórico/instruções; a confirmação atual vem da leitura dos bytes do alvo.

A skill REA local e suas referências JavaScript, runtime e recovery foram aplicadas. O `inspect_analysis_view` do parent anterior retornou `evidence_integrity_mismatch`, motivo `missing`. A única consulta de recuperação, `get_evidence_bundle` com `detail=summary`, operação e SHA exatos, retornou zero registros retidos e zero correspondências. A ledger anterior **não sobreviveu nesta sessão**. Não se repetiu o produtor ASAR nem se alterou setup.

O principal ratificou leitura estática local delimitada como alternativa: inventário do cabeçalho ASAR com Python e seleção sintática com o parser TypeScript já instalado. Não houve execução do Discord, extração de código/recursos para o repositório, inspeção de settings pessoais, chamada IPC, acesso a endpoint ou captura de UI. Observações locais **não são REA Evidence**; seus identificadores `L-*` servem apenas à rastreabilidade deste relatório.

## Evidências históricas e fontes locais

Os IDs abaixo foram registrados pela investigação anterior em [identidade.md](identidade.md). Seus payloads não puderam ser recuperados nesta conexão; não sustentam novos detalhes sobre funções individuais.

| Papel histórico | Evidence ID |
| --- | --- |
| Parent ASAR | `ev_29c909220a39cbc2854eabe746d7a327c192ea08a95f265dfe02a61c8cca19bb` |
| Resumo | `ev_eec2ba95f7f8912ab876bbd3d20329f4a6813ca1c38b994f66ca85d9e0d6397f` |
| Página 0 | `ev_b1030f58218b94f64eb3935cc930b6a83f70959e712090593e738d52b2c8c807` |
| Página 8 | `ev_a6bdadde69b675e611bf0a8c8e98ca302ebd89a5c91411d053e9837997167c90` |

Os hashes completos dos membros, suas posições no arquivo e os achados selecionados estão no [resumo sanitizado](evidencias/resumo-catalogo.json). Não foi salvo dump, código-fonte ou material de conversa. Em JavaScript, linha é baseada em 1, coluna em 0 e intervalo UTF-16 é `[início, fim)`; esses offsets não são offsets de bytes do ASAR.

| Fonte local | Limite examinado |
| --- | --- |
| L-01 | Cabeçalho/inventário do ASAR e identidade SHA-256 |
| L-02 | `package.json`: nome, entrada, licença e nomes de dependências |
| L-03 | `bundle.js`: declarações IPC, splash, acesso a preferências, carregador e chamada de screenshot |
| L-04 | `splashScreenPreload.js`: canais literais, funções de renderização e comparações de estado |
| L-05 | `splash/index.css`: dimensões/paleta/fontes selecionadas; HTML e assets somente inventariados |

## Observações estabelecidas pelo pacote

| Achado | Observação estática e origem | Limite / uso futuro |
| --- | --- | --- |
| F-01 — Bootstrap | L-01/L-02: 11 membros, incluindo `bundle.js`, preload, splash, duas fontes e mídia de conexão. `package.json` declara `name=discord`, `main=bundle.js`, `license=UNLICENSED` e não apresenta campo `version` | Não confundir os 11 membros do arquivo com os 11 nós da antiga página REA; são inventários distintos. Assets não foram copiados |
| F-02 — Componente externo | L-03: chamada sintática `requireNative` com argumento literal `discord_desktop_core`, linha 10, UTF-16 24755–24792 | Esse componente não é membro do ASAR inventariado. Sua localização/implementação não foram examinadas; origem e conteúdo do renderer permanecem desconhecidos |
| F-03 — Janela de abertura | L-03: objeto da splash declara largura 300, sem moldura, não redimensionável, centralizado e inicialmente `show=false`. `webPreferences`, linha 12, 89322–89523: `nodeIntegration=false`, `sandbox=false`, `contextIsolation=true`, preload de splash | Booleanos foram derivados de literais `!0/!1`; não provam a janela principal ou opções efetivas em execução. A política própria de isolamento segue RF/A |
| F-04 — Estados da splash | L-04: branches para `installing-updates`, `downloading-updates`, `update-failure`, `launching`, `update-manually`; comparação adicional com `checking-for-updates`. São lidos campos `status`, `progress`, `current`, `total`, `seconds`, `newVersion` | São caminhos de código, não estados que tenham sido vistos. Atualização do produto próprio continua manual (RF-15) |
| F-05 — IPC selecionado | L-03/L-04: wrapper de `ipcMain.on/handle/removeListener`, eventos literais da splash e referências de build override; detalhamento abaixo | A seleção não cobre todos os aliases, módulos externos ou canais dinâmicos. Nenhum IPC foi invocado |
| F-06 — Preferências do bootstrap | L-03: `settings.get` lê `START_MINIMIZED` (linha 10, 13567–13602), `enableHardwareAcceleration` (16570–16616) e `openH264Enabled` (18983–19018) com segundo argumento constante false/true/true, respectivamente | Esses argumentos não comprovam valor ativo, default efetivo, controle de UI, formato do arquivo ou codec usado em chamada. Nenhuma preferência pessoal foi lida |
| F-07 — Paleta/fontes da splash | L-05: CSS declara `--brand-purple=#5865f2`, `--account-grey=#282b30`, família `gg sans` e alternativas; `body,html` têm dimensões declaradas 300px×300px. Duas fontes woff2 constam no inventário | Paleta da splash não demonstra tema escuro/claro do app, layout de canais ou escala física da janela. Usar como referência delimitada, sem copiar assets |
| F-08 — Captura de screenshot | L-03: `NAVIGATOR.mediaDevices.getDisplayMedia`, linha 397, 765339–765561, dentro de `useTakeScreenshot`/`createInput`. Opções incluem `audio=false`, superfícies de monitor excluídas, aba corrente preferida, superfície própria incluída e troca de superfície excluída; o caminho também contém `stream.getTracks`/`track.stop` | Não é prova da transmissão de tela do Discord. Dimensões dependem de expressões; fps, som do sistema, seleção de fontes e nove espectadores não foram demonstrados |
| F-09 — Pontes de bibliotecas | L-03: declarações `contextBridge.exposeInMainWorld` para `__SENTRY_IPC__` (linha 507, 1645359–1645439) e `__electronLog` (linha 517, 2243938–2243998) | São superfícies estáticas de bibliotecas; não estabelecem a ponte funcional, autenticação, autorização ou política de captura do produto |

## Canais IPC: fatos e pareamento candidato

L-03 contém o helper `getDiscordIPCEvent`, linha 12, 52535–52621: mantém o argumento quando o regex aceita; caso contrário, adiciona o prefixo `DISCORD_`. Há chamadas desse helper nas funções wrapper. A composição de namespaces permite **inferir pareamentos candidatos**, sem provar ligação efetiva ou execução.

| Canal literal no preload (L-04) | Declaração observada | Correspondência estática candidata no bootstrap (L-03) |
| --- | --- | --- |
| `DISCORD_SPLASH_SCREEN_READY` | `ipcRenderer.send`, linha 28, 7348–7406 | Wrapper `on` recebe `SPLASH_SCREEN_READY`, linha 12, 90344–91199 |
| `DISCORD_SPLASH_SCREEN_QUIT` | `send`, linha 17, 3899–3956, e linha 28, 6425–6482 | Wrapper `on` recebe `SPLASH_SCREEN_QUIT`, linha 12, 91200–91318 |
| `DISCORD_SPLASH_UPDATE_STATE` | `on`, linha 28, 6564–6777 | `webContentsSend` recebe `SPLASH_UPDATE_STATE`, linha 12, 98454–98535 |
| `DISCORD_SPLASH_SCREEN_QUOTE` | `on`, linha 28, 6778–6849 | `webContentsSend` recebe `SPLASH_SCREEN_QUOTE`, linha 12, 90739–90802 |
| `DISCORD_GET_BUILD_OVERRIDE_STATUS` | `invoke`, linha 28, 6850–6916 | Literal prefixed no bundle, linha 1, 3530–3565; `handle` usa `IPCEvents.GET_BUILD_OVERRIDE_STATUS`, linha 10, 27083–27776 |
| `DISCORD_CLEAR_BUILD_OVERRIDE` | `invoke`, linha 28, 6287–6348 | Literal prefixed no bundle, linha 1, 3598–3628; `handle` usa `IPCEvents.CLEAR_BUILD_OVERRIDE`, linha 10, 27777–28558 |

Também foram observados `UPDATED_QUOTES` no wrapper do bootstrap, e canais `__ELECTRON_LOG__`/`__ELECTRON_LOG_IPC__` em código de biblioteca. Nomes e listeners não provam todos os efeitos sugeridos pelos nomes nem permissões em vigor. Chaves/imports e resolução completa dos aliases não foram auditados; não há contrato IPC do nosso app derivado desses nomes.

## Inferências e desconhecidos

**Inferências delimitadas:** o ASAR sustenta um bootstrap com splash e caminho de carregamento de componente externo. Assim, é insuficiente atribuir a ele toda a UI principal. O helper e as constantes acima sugerem comunicação entre splash e bootstrap; a observação passiva ainda deve corroborar estado, origem e resposta. Não foi confirmado renderer remoto nem sua origem.

| Pergunta | Estado e evidência necessária |
| --- | --- |
| U-01 — Comunidades/canais, composição de texto, amizade/DM e presença | Não respondida pela seleção do pacote; observar runtime autorizado, sem conteúdo privado, e separar capacidades visuais das regras de servidor |
| U-02 — Temas e modos online/ausente/ocupado da UI principal | Não confirmados. Paleta da splash e argumento de aceleração não respondem essa pergunta; registrar modos/seleção em tela autorizada |
| U-03 — Dispositivos, mute, chamada, captura com som e espectador | Não confirmados. F-08 documenta screenshot; exigir fonte do módulo efetivo e cenário/runtime apropriado |
| U-04 — Colunas, menus/modais, densidade, tipografia efetiva, foco e teclado | Não observados. UX precisa de capturas/medidas com viewport, DPI, escala, tema, idioma e dados de teste identificados |
| U-05 — Preferências ativas, IPC dinâmico e janela principal | Não examinados. Uma leitura sintática parcial não estabelece ausência, defaults ou aplicação de políticas |
| U-06 — Regras remotas, retenção, capacidade, backup e custos | Pacote/UI não aprovam autorização canônica nem limites operacionais do produto próprio; cumprir RF/AC e E0/E1/E2 |

Contagens históricas zero de IPC/BrowserWindow não foram tratadas como ausência. A leitura local encontrou sintaxe correspondente, mas usa outra seleção e outro método, sem completar o antigo grafo semântico. Não houve sessão nativa aberta; nada exige encerramento de provider nesta tarefa.

## Entrega para UX e construção

A [matriz RF-01–17](matriz-reproducao.md) separa reprodução selecionada, adaptações obrigatórias e ampliações futuras. Estes achados liberam documentação inicial; não liberam cópia da interface principal ou integração de mídia. Login Google, dez dias, DM entre amigos, uma chamada global, orçamento, backup sem texto e atualização manual continuam requisitos próprios.

Próximo responsável: principal para revisão do estado estável; depois produção REA para as lacunas, UX/arquiteto para contratos suficientes e construção REA para módulos explicitamente atribuídos. Apenas o principal consolida Obsidian/ai-memory; esta tarefa não escreveu memória.

