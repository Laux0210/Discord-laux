# Memória do projeto

## Fontes e ordem de consulta

1. Obsidian: vault `E:\Memoria`, pasta `Discord`. Comece em `Discord/00-INDICE.md`, pesquise nessa pasta e leia apenas as notas pertinentes.
2. ai-memory: workspace `discord`, project `discord`, servidor `http://127.0.0.1:49374`. O marcador `.ai-memory.toml` fixa o escopo dos comandos e hooks futuros.
3. Confira dados sujeitos a mudança no código e ambiente atuais. Registre divergências e não apresente memória antiga como validação atual.

Prefira MCP Obsidian `read_note` e `search_notes` com `pathPrefix: "Discord"`. Sem MCP, os mesmos Markdown podem ser consultados diretamente pelo sistema de arquivos:

```powershell
Get-Content -LiteralPath 'E:\Memoria\Discord\00-INDICE.md'
rg -n --glob '*.md' 'palavra-chave' 'E:\Memoria\Discord'
```

Para ai-memory, na pasta do projeto:

```powershell
& "$env:LOCALAPPDATA\ai-memory\ai-memory.exe" search 'agentes' --workspace discord --project discord --limit 5 --json
& "$env:LOCALAPPDATA\ai-memory\ai-memory.exe" read-page --path 'notes/integracao-obsidian.md' --workspace discord --project discord
& "$env:LOCALAPPDATA\ai-memory\ai-memory.exe" doctor --workspace discord --project discord --json
```

## Registro e responsabilidades

O orquestrador consolida as decisões e resultados no Obsidian, com data, fonte, estado e limitações. Especialistas devolvem descobertas ao orquestrador para evitar escritas concorrentes. Registre apenas informação relevante ao projeto; nunca credenciais ou transcrições privadas.

Obsidian contém a memória curada. ai-memory complementa com captura por hooks e busca. Não há sincronização automática bidirecional entre os dois. Os hooks e os dois MCP já existiam na configuração global e foram preservados. Nenhuma memória global do Codex foi alterada.

## Configuração e retomada

A política está em `.codex/config.toml` e nos 15 perfis, sem alterar `AGENTS.md`. Backups anteriores à alteração ficam em `.codex/backups/`. Abra uma nova sessão nesta pasta para carregar a configuração e o marcador.

O servidor ai-memory foi iniciado como processo local oculto usando a instalação existente, sem mudar inicialização do Windows. Se estiver parado, inicie:

```powershell
Start-Process -FilePath "$env:LOCALAPPDATA\ai-memory\ai-memory.exe" -ArgumentList @('serve','--transport','http','--bind','127.0.0.1:49374') -WindowStyle Hidden
```

Antes de iniciar, confira `ai-memory status` para evitar instâncias duplicadas. Não use `--force`.

## Limites da validação

Consulte `VALIDACAO.md` para os resultados desta configuração. A consulta e a gravação de uma página não demonstram captura completa de uma sessão. A nova sessão precisa carregar e confiar nos hooks; `doctor` verifica a cobertura real. Os 15 perfis configurados continuam distintos de 15 agentes executados.
