# BASE-LOCAL-02 — Desktop local validado

Data: 2026-10-14. Responsável: principal no papel de orquestrador. **Aceito no escopo local mock**, após revisão independente BASE-REV-02C. O aceite integral BASE, os portões E0/E1/E2 e a distribuição continuam pendentes.

## Problema e correção

O build anterior produzia somente `dist/`; faltava a entrada Electron declarada em package.json. O preload também apontava para uma saída inexistente. A correção compila main ESM em `dist-electron/main/index.js` e agrupa o preload em `dist-electron/preload/index.cjs`, mantendo sandbox, isolamento e Node desativado no renderer. O formato do preload segue as [restrições oficiais do sandbox Electron](https://www.electronjs.org/docs/latest/tutorial/sandbox).

Os IPC exigem a janela, o frame principal e o documento esperado. Navegações externas, novas janelas e webviews são recusados; URLs externas aceitam HTTP(S) sem credenciais. A base mock recusa captura e permissões reais. A meta CSP e o cabeçalho de produção restringem conexões ao próprio aplicativo e bloqueiam mídia, objetos, frames e envio de formulários.

Em desenvolvimento, o Vite autoriza por hash os scripts inline gerados e WebSocket apenas em loopback:5173. A meta precede os scripts. Essas exceções não entram no build de produção. `npm run dev` serve somente o frontend; não inicia Electron.

## Comandos e evidências

No Windows 10 Pro 10.0.19045 x64, Node 26.9.0/npm 11.19.1:

- `npm test`: 60 testes em 13 arquivos passaram, snapshot de 13:36:26. Quatro testes novos verificam artefatos e recusas de emissor IPC.
- `npm run lint`: tipagem passou.
- `npm run test:desktop`: build completo e Electron 35.7.5 passaram. A interface montou, versão 0.1.0 respondeu pelo IPC, sandbox/isolamento ficaram ativos e Node indisponível no renderer.
- O smoke recebeu `securitypolicyviolation` de `connect-src`; a sentinela HTTPS loopback não chegou a `webRequest`. Um bloqueio complementar impediria conexão mesmo se a CSP falhasse. O IPC de captura retornou a recusa prevista.
- Brave em `http://127.0.0.1:5173/`: frontend montado, política antes dos scripts, sem erros/warnings observados.

Para abrir a aplicação local: `npm run desktop`. O smoke usa perfil próprio em `.codex/logs/`, janela oculta e encerra somente seu processo.

Logs, versões, hashes e resultados estão em [base-local-02-evidencias.json](base-local-02-evidencias.json). `AGENTS.md` conserva SHA-256 `dad02adfe188a9345e59ba80039d96f4ec30fe7791c5f0173414d6852ed1a9d1`.

## Ambiente, revisão e limites

O pacote Electron estava instalado sem executável. O instalador encerrou com código 0 durante a extração neste ambiente. O ZIP oficial em cache foi conferido contra o checksum do pacote — `b87b2d6167845ece1d373eb37f5ce49868a07ec90203de44b6bd415d6c673c6d` — e extraído por Expand-Archive no node_modules local. A versão fixada não foi alterada.

BASE-REV-02 identificou a meta CSP ampla; o principal corrigiu e repetiu checks. BASE-REV-02C aprovou os trechos corrigidos em somente leitura. Uma importação de `User` no teste de sessão adicionado por trabalho paralelo foi corrigida para sua definição exportada; esse trabalho foi preservado.

Os checks globais são snapshots de uma pasta com outras alterações em andamento. Módulos de autenticação/comunidades/convites não foram auditados neste lote. Não foram repetidos npm ci limpo, Windows 11, instalador, OAuth real, WebMedia completo ou comparação visual com Discord. E0 permanece BLOQUEADO; nenhuma integração paga ou mídia real foi ativada.

Próximo responsável: principal consolida memória; produção REA e UX/arquiteto completam evidências/contratos antes de atribuir reprodução à construção REA.

