# Contrato de tarefa e retorno

Modelo de mensagem para os mecanismos nativos do Codex, não sintaxe do agendador Alethe. Preencha os campos antes de delegar; não é obrigatório criar um arquivo para cada tarefa. Consulte [ORQUESTRACAO.md](ORQUESTRACAO.md).

## Entrada da tarefa

- **ID e objetivo:** identificador da tarefa e resultado verificável.
- **Autorização e modo:** escopo autorizado pelo usuário; somente leitura ou escrita delimitada.
- **Responsável:** perfil existente e instância responsável; principal que ratificou a atribuição.
- **Entradas e estado:** requisitos, fontes e contratos com caminho e versão, hash, data ou estado relevante. Diferencie fatos de hipóteses.
- **Arquivos de escrita:** lista explícita; `nenhum` em tarefa somente de leitura. Inclua testes e documentação quando necessários.
- **Arquivos de leitura:** fontes consultáveis; memória apenas no escopo do projeto, salvo relevância explícita autorizada.
- **Proibições:** arquivos e ações fora do escopo; nenhuma redelegação sem autorização específica, inclusive pelo perfil orquestrador.
- **Dependências e início:** entregas necessárias, contratos aceitos e condição para iniciar.
- **Critérios de aceite:** comportamentos ou resultados observáveis que o principal verificará.
- **Validação esperada:** checks reais e pertinentes; não inventar scripts ou resultados. Indicar ambiente e pré-requisitos.
- **Destino da entrega:** mensagem ao principal ou arquivos expressamente autorizados. O modo somente leitura prevalece sobre destinos usuais do perfil.
- **Liberação e próximo responsável:** quando a escrita terminar, comunicar liberação dos arquivos; transferência depende da ratificação do principal.

## Retorno do especialista

- **ID e responsável:** tarefa e perfil executado.
- **Estado da tarefa:** concluída, parcial ou bloqueada, com fundamento.
- **Resultado:** saída produzida e relação com os critérios.
- **Arquivos alterados e estado final:** lista ou `nenhum`; hash/diff quando pertinente; informar se foram liberados para revisão.
- **Evidências:** caminhos/linhas ou IDs; comandos realmente executados, resultados e códigos de saída quando disponíveis.
- **Limitações:** hipóteses, dependências pendentes, checks não realizados e motivo.
- **Parecer:** quando houver revisão, aprovado ou reprovado com achados; separado do estado da tarefa.
- **Próximo responsável:** retorno ao principal e eventuais alterações compartilhadas solicitadas.

## Aceite pelo principal

O principal confronta o retorno com os critérios, confirma propriedade e estado estável, verifica checks e revisão independente. Uma entrega parcial ou bloqueada não vira concluída por inferência. Qualquer correção posterior exige verificar novamente os critérios e trechos afetados antes do aceite.

## Exemplo de delegação somente de leitura

```text
ID: ORQ-LEITURA-01
Objetivo: conferir regras de autoridade e concorrência da equipe.
Autorização e modo: teste autorizado, somente leitura.
Responsável: revisor; atribuição ratificada pelo principal.
Entradas e estado: configuração e contratos atuais nesta pasta.
Arquivos de escrita: nenhum.
Arquivos de leitura: AGENTS.md, README.md, .codex/config.toml,
  .codex/agents/revisor.toml, docs/agentes/ORQUESTRACAO.md,
  docs/agentes/CONTRATO-TAREFA.md e memória pertinente do Discord.
Proibições: não editar arquivos/memória, iniciar aplicativo, workers Alethe
  ou novos subagentes. Necessidades adicionais retornam ao principal.
Dependências e início: arquivos estáveis; tarefa independente do lote.
Critérios de aceite: apontar evidências de principal + até três especialistas,
  restrição de redelegação e atribuição exclusiva por tarefa.
Validação esperada: leitura dos arquivos e comparação das instruções,
  distinguindo política escrita de garantia técnica.
Destino da entrega: mensagem ao principal, com estado, parecer e evidências.
Liberação e próximo responsável: nenhum arquivo sob escrita; principal consolida.
```
