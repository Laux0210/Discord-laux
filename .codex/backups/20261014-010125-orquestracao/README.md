# Equipe de agentes

## Memória no Obsidian e ai-memory

Os 15 agentes e a sessão principal consultam primeiro `E:\Memoria\Discord`, começando em `00-INDICE.md`, e depois ai-memory no escopo `discord/discord`. Consulte [a integração](docs/memoria/INTEGRACAO.md) e [os resultados da validação](docs/memoria/VALIDACAO.md). O marcador `.ai-memory.toml` mantém o projeto separado de outras memórias. O `AGENTS.md` original permanece intacto.

Esta pasta contém 15 perfis especializados para projetos de software. O nome da pasta não define requisitos de bot ou integração Discord; o produto será determinado pelo pedido recebido.

## Organização

- `.codex/agents/`: 15 perfis TOML com missão, entradas, entregas, limites e skills.
- `.codex/config.toml`: habilita agentes e limita a três subagentes simultâneos, além do principal.
- `.agents/skills/reverse-engineer-anything/`: cópia local da skill REA e suas referências.
- `docs/agentes/catalogo.md`: responsabilidades, fluxo e contrato de delegação.
- `docs/agentes/manifesto.json`: inventário verificável e hash do AGENTS.md preservado.
- `scripts/validar_agentes.py`: verificação local de consistência.

## Uso no Codex

Abra uma nova sessão nesta pasta para carregar os perfis locais. Eles herdam modelo, permissões e MCP da sessão principal. A descoberta efetiva depende do cliente e da confiança concedida ao projeto; criar arquivos não inicia agentes.

Exemplo de pedido:

> Use o perfil orquestrador para coordenar este pedido. Peça ao planejador um plano e acione somente os especialistas necessários, com arquivos exclusivos. Para reconstrução de um artefato fornecido, use producao_rea e depois construcao_rea. Consolide as evidências de QA e revisão antes de concluir.

O agente principal também pode ler `.codex/agents/orquestrador.toml` e coordenar diretamente. Quinze perfis são um catálogo, não uma exigência de executar todos em cada tarefa.

## Validação

Em PowerShell, nesta pasta:

```powershell
python scripts/validar_agentes.py
```

Requer Python 3.11 ou superior, sem dependências externas. Valida sintaxe TOML, quantidade, nomes, skills, cópia REA e preservação de AGENTS.md. Não comprova execução dos agentes nem disponibilidade de motores REA.

`scripts/criar_agentes.py` registra a geração inicial; recusa substituir destinos existentes. Não é necessário executá-lo para usar a equipe.

Formato baseado na [documentação oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents). As skills BMAD e Superpowers permanecem nas instalações locais, com caminhos indicados nos perfis.
