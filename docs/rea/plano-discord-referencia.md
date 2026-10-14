# REA — Discord como referência funcional e visual

Estado: investigação estática inicial parcial, revisada em REA-REV-02A. Fonte: pedido do usuário em 2026-10-14 para acrescentar engenharia reversa do aplicativo Discord e reproduzir suas funções, modos e interface. Consulte [identidade](discord/identidade.md), [catálogo](discord/catalogo.md) e [matriz inicial](discord/matriz-reproducao.md). Observação de runtime/interface e reprodução integral permanecem pendentes.

## Alvo e skill

O alvo é o aplicativo Discord desktop instalado ou um pacote explícito dessa instalação. `producao_rea` lê `.agents/skills/reverse-engineer-anything/SKILL.md` e as referências pertinentes a JavaScript/Electron e observação de runtime. Primeiro identifica uma instalação inequívoca, versão, caminho e SHA-256; canais Stable/PTB/Canary ou múltiplas versões não devem ser misturados sem registrar a seleção.

ASAR/árvore Electron é roteado por `analyze_javascript_application` em modo summary, com paginação das evidências quando necessária. O pacote pode não conter a interface carregada remotamente; o inventário estático não equivale a catálogo completo da UI. O roteamento de runtime segue os schemas realmente disponíveis: páginas `file://` usam `list_electron_targets`/`inspect_electron_page`; renderer HTTPS usa `list_browser_targets`/`inspect_web_page` quando a origem e um endpoint CDP loopback literal autorizado, como `http://127.0.0.1:<porta>`, estiverem identificados. Sem endpoint já disponível e cenário autorizado, registrar runtime como pendente e manter a investigação estática. Não lançar, ativar depuração nem modificar a instalação implicitamente. Existência da skill ou ferramentas no catálogo não comprova funcionamento de um provider nem execução de uma análise. Preserve o aplicativo original e escreva evidências em destino próprio do projeto.

Reutilize Evidence IDs reais, `parent_evidence_id`, identidade/hash e perfil de análise. Quando houver evidências retidas, pagine por `node_id` na mesma sessão; truncamento pede consultas menores, sem repetir a análise inteira. Registre camadas ausentes e origens remotas sem inferir sua cobertura. Feche apenas sessões nativas abertas para esta investigação depois de preservar resultados.

## O que investigar e reproduzir

| Frente | Perguntas e estados previstos | Vínculo inicial |
| --- | --- | --- |
| Comunidades e canais | Navegação, seleção, categorias, listas, permissões visíveis e administração | RF-03/04/05 |
| Texto | Histórico, composição/envio, estados pendente/erro, exclusão e recuperação de conexão | RF-05/06/13 |
| Amigos e DMs | Lista, pedidos, aceites, bloqueios e conversa individual | RF-07/08 |
| Voz e transmissão | Entrada/saída, participantes, mute, dispositivos, escolha de captura e apresentação ao espectador | RF-09/10/11/12 |
| Modos e preferências | Estados online/ausente/ocupado quando observados, modos de texto/voz/transmissão, aparência e configurações presentes na versão analisada | RF-01/08/10/11/17 |
| Interface | Colunas, densidade, espaçamento, tipografia, ícones, cores, listas, painéis, menus, modais, foco, teclado, carregamento/vazio/erro e janelas em tamanhos distintos | RF-01/17 e DESIGN |

Os itens acima são perguntas de investigação, não funcionalidades confirmadas da versão instalada. Cada capacidade observada recebe estado: reproduzir no MVP, adaptar a uma restrição existente ou registrar como ampliação futura. Diferenças do produto próprio — login Google, dez dias de histórico, uma chamada global, limites financeiros e demais RF existentes — são explicitadas na matriz. Não transformar uma captura de interface em prova de autorização do servidor.

## Sequência e propriedade

1. **REA-REF-01 — produção:** inventário/identidade em `docs/rea/discord/identidade.md` e evidências selecionadas em `docs/rea/discord/evidencias/`. Sem alterar a instalação.
2. **REA-REF-02 — produção:** catálogo em `docs/rea/discord/catalogo.md`, com funções, modos, telas e estados; cada conclusão cita Evidence ID ou referência local identificada, tipo de evidência e limitações. Runtime não é inferido de análise estática.
3. **REA-REF-03 — contrato:** produção REA possui `docs/rea/discord/matriz-reproducao.md`; UX/UI possui `docs/design/discord-referencia.md`; arquiteto possui `docs/arquitetura/contratos-reproducao-discord.md`. Cada documento tem um dono por tarefa, ratificado pelo principal antes da escrita. Registrar função/estado → evidência → RF/AC → módulo → teste; cobrir RF-01–17, incluindo adaptações de Google, orçamento, retenção, backup e distribuição que não são provadas pela referência.
4. **REA-REF-04 — construção:** `construcao_rea` implementa somente módulos atribuídos pelo principal a partir do contrato aceito. Cada arquivo tem um dono; frontend/backend/dados/devops não recebem o mesmo módulo simultaneamente. Os caminhos de código serão definidos em DESIGN/BASE.
5. **Comparação independente:** QA produz `docs/validacao/fidelidade-discord.md`, executa os mesmos cenários no produto e na referência registrada, compara comportamento, layout e estados e aponta diferenças materiais. Cada cenário registra estado inicial, ação, resposta esperada, captura de referência e teste do produto. Capturas comparáveis usam o mesmo viewport, DPI, escala, tema, idioma, dados de teste e estado. Divergências materiais recebem correção ou adaptação explicitamente aceita; limiares visuais são definidos em DESIGN após capturas reais. Diferenças autorizadas do MVP ficam explícitas; nenhuma aparência similar substitui integração funcional.

## Critérios de aceite

- Identidade/versão/hash de cada artefato, origem de capturas e cenário de runtime identificados.
- Catálogo de funções/modos/interface com perguntas respondidas, parciais e desconhecidas; observações separadas de inferências.
- Reprodução rastreável a contrato aceito, testes reais e evidências visuais dos estados comparados, inclusive teclado/foco e falhas.
- Nenhuma modificação da instalação de referência; nenhum token, conteúdo privado de conversa ou credencial no material de memória.
- Relatório independente com divergências e limitações; tarefas não verificadas permanecem pendentes.
- Comparações visuais usam capturas reais autorizadas e ferramentas anunciadas, como `capture_web_screenshot`/`compare_web_screenshots`, se disponíveis. Diferenças de pixels não medem equivalência semântica ou autorização; os testes comportamentais continuam necessários. `compare_application_versions` compara versões de um alvo e não demonstra sozinho equivalência entre Discord e o aplicativo próprio.

## Dependências

Leitura estática e documentação da referência podem avançar em paralelo com E0. Observação da interface depende de acesso ao aplicativo e de um cenário autorizado. Enviar mensagens, modificar comunidades ou iniciar chamadas não faz parte de uma inspeção passiva. A implementação do aplicativo próprio respeita E0/E1/E2, DESIGN e BASE; a nova referência não aprova esses portões.

REA-REF trata o Discord como referência. REA-APP, já prevista na etapa 11, investiga o instalador/ASAR produzido por este projeto. Ambas usam produção REA antes da construção REA e publicam resultados no Obsidian somente pelo principal.
