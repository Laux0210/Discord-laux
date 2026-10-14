# Catálogo dos 15 agentes

Perfis locais do Codex; responsabilidades e skills selecionadas por tarefa.

| Agente | Responsabilidade | Skills |
| --- | --- | --- |
| `orquestrador` | Coordenar a equipe, distribuir responsabilidades e consolidar a entrega. | `bmad-help`, `superpowers/dispatching-parallel-agents`, `superpowers/verification-before-completion` |
| `planejador` | Transformar o escopo em um plano executável com critérios de aceite. | `bmad-create-epics-and-stories`, `superpowers/writing-plans` |
| `analista` | Investigar contexto, requisitos, alternativas e hipóteses. | `bmad-agent-analyst` |
| `produto` | Definir resultado esperado, MVP e critérios de aceitação. | `bmad-agent-pm`, `bmad-prd` |
| `arquiteto` | Definir contratos, módulos e decisões de arquitetura proporcionais ao projeto. | `bmad-agent-architect`, `bmad-architecture` |
| `ux_ui` | Projetar fluxos acessíveis e uma interface coerente. | `bmad-agent-ux-designer`, `bmad-ux` |
| `frontend` | Implementar componentes, navegação e estado da interface. | `bmad-agent-dev`, `superpowers/test-driven-development`, `superpowers/verification-before-completion` |
| `backend` | Implementar serviços, APIs e regras de negócio. | `bmad-agent-dev`, `superpowers/test-driven-development`, `superpowers/systematic-debugging` |
| `dados` | Projetar persistência, migrations e consultas. | `bmad-architecture`, `superpowers/verification-before-completion` |
| `qa` | Validar critérios de aceite e prevenir regressões. | `bmad-qa-generate-e2e-tests`, `superpowers/systematic-debugging`, `superpowers/verification-before-completion` |
| `seguranca` | Revisar autenticação, autorização, segredos e limites de confiança. | `bmad-code-review` |
| `devops` | Preparar execução reproduzível, CI e operação. | `superpowers/systematic-debugging`, `superpowers/verification-before-completion` |
| `revisor` | Revisar alterações de forma independente e manter a documentação consistente. | `bmad-code-review`, `superpowers/receiving-code-review` |
| `producao_rea` | Produzir uma especificação baseada em evidências de artefatos e comportamento autorizado. | `reverse-engineer-anything`, `bmad-spec` |
| `construcao_rea` | Construir ou adaptar software a partir da especificação e das evidências REA. | `reverse-engineer-anything`, `bmad-build`, `superpowers/test-driven-development`, `superpowers/verification-before-completion` |

## Fluxo e dependências

1. Orquestrador delimita o pedido; analista e produto definem contexto e critérios.
2. Arquiteto e UX definem contratos e experiência; planejador ordena tarefas e atribui arquivos.
3. Frontend, backend e dados implementam após seus contratos estarem definidos. Arquivos compartilhados têm um responsável por vez.
4. Para reconstruções, producao_rea primeiro entrega o contrato com evidências; construcao_rea implementa depois. Os demais especialistas entram conforme necessidade.
5. QA valida; segurança e revisor fazem revisão independente. DevOps prepara a entrega autorizada. Orquestrador consolida resultados e lacunas.

## Contrato de delegação

Cada tarefa deve informar objetivo, entradas, arquivos exclusivos, dependências, critérios de aceite e validação esperada. Os especialistas não delegam novamente. O principal pode assumir o papel de orquestrador lendo seu perfil; quando chamado como subagente, o orquestrador devolve a coordenação ao principal.

## Estado das skills

BMAD e Superpowers são referenciadas por caminhos locais desta máquina, validados durante a criação. Leia a skill correspondente antes de aplicá-la. Em outra máquina, ajuste os caminhos após localizar as instalações.

REA foi copiada integralmente para `.agents/skills/reverse-engineer-anything/`, incluindo as referências, e é exigida nos dois perfis REA. Isso disponibiliza instruções, não instala CLI, MCP, Ghidra ou outros motores. Ferramentas ausentes devem ser reportadas sem simulação de resultados.
