## Retomada de 2026-10-14 — BASE-LOCAL-02 e REA-REF-02A

O usuário autorizou continuar. O principal retomou a correção do desktop local; serviços reais e mídia continuam dependentes de E0/E1/E2. Produção REA examinou a referência em leitura estática, sem iniciar ou alterar o Discord.

- **BASE-LOCAL-02 aceito no escopo mock:** build main ESM/preload CJS e renderer, IPC com verificação de emissor/frame/documento, recusa de captura e CSP local. BASE-REV-02 encontrou meta ampla; a correção passou em BASE-REV-02C.
- **Checks do principal:** npm test com 60 testes/13 arquivos às 13:36:26; npm run lint e npm run test:desktop completos passaram. O Electron 35.7.5 montou a UI e confirmou isolamento/sandbox, ponte de versão, Node indisponível, captura recusada e connect-src bloqueado sem requisição à sentinela. Brave confirmou o frontend com CSP antes dos scripts e sem erros observados.
- **REA-REF-02A aceito como parcial:** catálogo de bootstrap/splash e matriz RF-01–17 aprovados em REA-REV-02A. A ledger REA anterior não estava retida; fontes estáticas locais foram explicitadas, sem inventar novos Evidence IDs. UI principal, runtime, medidas e fidelidade permanecem pendentes.
- **Trabalho paralelo preservado:** novos módulos/testes de autenticação, comunidades e convites apareceram durante a validação. O principal corrigiu somente a importação de User no teste de sessão; a segurança/integridade desses módulos exige revisão própria. Novas mudanças podem invalidar o snapshot global.
- **Limites:** instalação limpa, Windows 11, banco/RLS/restauração reais, OAuth real, mídia, instalador e piloto não foram aceitos. O histórico anterior permanece; a base local aprovada não significa aceite integral BASE ou DATA.

Evidências: [validação desktop](../validacao/base-local-02.md), [logs e hashes](../validacao/base-local-02-evidencias.json), [catálogo REA](../rea/discord/catalogo.md) e [matriz](../rea/discord/matriz-reproducao.md). AGENTS.md preservado com seu SHA-256 original. Somente o principal consolida estas entregas na memória do projeto.

