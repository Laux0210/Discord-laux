# DMs locais — LOCAL-DM-04

Data: 2026-10-15, America/Sao_Paulo. Responsável: orquestrador principal. Autorização: continuidade “pode seguir”; plano [DM local](../superpowers/plans/2026-10-14-dm-local.md), RF-07/AC-07, RF-13 e D-16. Aceite limitado ao comportamento local.

## Resultado

A interface abre, lê e envia mensagens entre amigos aceitos, permite voltar/reabrir e invalida operações de outra sessão. Bloqueio ou perda de amizade revoga acesso; terceiros não recebem conteúdo. O serviço revalida autorização em leitura, envio e subscription, cujos eventos não carregam texto.

Foram corrigidos o limite exato de dez dias, a reutilização de nonce de mensagem expirada e o retorno de referências mutáveis do histórico. Mensagens com idade igual ou superior a dez dias ficam fora das leituras e da deduplicação. Leituras e envios devolvem cópias. Isso não comprova remoção física nem expiração automática de conteúdo já renderizado.

Os testes DOM montam React e exercitam efeitos, respostas tardias, troca de identidade, logout, descarte de listeners, falhas de envio e repetição com nonce. A compatibilidade do login legado por string foi preservada com discriminação pelo contrato moderno `initiateLogin`. O mock de storage dos testes de paginação evita dependência entre casos.

## Evidências e reprodução

Snapshot final: **197 testes em 38 arquivos passaram**, início 02:59:20; `npm run build` e `npm run lint` passaram. Lint atual executa `tsc --noEmit`. O build emitiu aviso existente de bundle maior que 500 kB. O teste de manifesto exige atualizar os hashes após o build:

```powershell
npm run build
node scripts/build-release.mjs
npm test
npm run lint
```

O segundo comando apenas atualizou o manifesto dos cinco arquivos compilados. Não criou instalador nem publicou release; sua busca por padrões não é prova de ausência de segredos.

A validação real no Electron 35.7.5 passou às 02:58:38: envio, retorno/reabertura, leitura pela outra conta fictícia e isolamento da terceira conta; **zero requisições externas e zero erros de console observados**. Para reproduzir, mantenha o primeiro comando em um terminal e execute o segundo em outro:

```powershell
npm run dev -- --host 127.0.0.1 --port 5181
node scripts/smoke-dm.mjs
```

O smoke usa `dm-validation.html`, os componentes reais e serviços locais, com sessão isolada. Desativa inicialização de rede/captura apenas nessa fixture; o interceptador permite somente o host/porta loopback e recusa as demais origens, permissões e janelas. A entrada normal de produção não foi usada para testar serviços públicos.

- [Envio](evidencias/dm-local-04-envio.png).
- [Leitura pelo outro participante](evidencias/dm-local-04-outro-participante.png).
- [Saídas dos checks, hashes e limites](dm-local-04-evidencias.json).

## Revisão e limites

Revisor independente aprovou o escopo DM e o harness isolado, sem achado material. Executou 35 testes na revisão inicial e 20 na revisão complementar (15 DOM e cinco de paginação). A revisão complementar cobriu somente os dois discriminantes de login, o uso do helper de remoção de usuário e os testes afetados.

Houve alterações concorrentes de autenticação, storage, configuração e publicação. Elas foram preservadas; este aceite não cobre integralmente essas funcionalidades. Os hashes delimitam o snapshot; mudanças posteriores exigem rechecagem dos trechos afetados. `AGENTS.md` foi preservado.

**E0 continua BLOQUEADO.** OAuth real, autorização remota/RLS, áudio/tela reais, proteção financeira efetiva, instalador, Windows 11, piloto e fidelidade visual REA não foram aceitos. A infraestrutura real não é validada por mocks. O próximo lote local é presença reativa e distinção entre pedidos enviados e recebidos.

A consolidação manual foi gravada e relida no Obsidian, nota `Discord/21-DMS-LOCAIS-VALIDADAS.md`, e no ai-memory, página `notes/dm-local-04.md`, workspace/project `discord/discord`. A busca encontrou os registros nas duas ferramentas. Não há sincronização bidirecional automática nem nova comprovação de captura por hooks.

