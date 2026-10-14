# Etapa 11 (RELEASE) — Revisões, Segurança e Instalador Candidato Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir a configuração de empacotamento, manifesto auditado de distribuição Windows 10/11 x64 (`dist-release/release-manifest.json`), testes de integridade/ausência de segredos e verificação de instalação, atualização e rollback seguro para o instalador candidato do Discord Desktop.

**Architecture:** Módulo de especificação de release e script de empacotamento com inspeção de segurança e geração de manifesto SHA-256, integrado a testes unitários de conformidade com os requisitos RF-01, RF-14, RF-15 e RF-16.

**Tech Stack:** TypeScript, Node.js, esbuild, Vite, Vitest, Electron.

**Spec:** [2026-10-14-etapa11-release-design.md](file:///C:/Users/jv883/Documents/Codex/Discord/docs/superpowers/specs/2026-10-14-etapa11-release-design.md)

## Global Constraints

- Plataforma alvo: Windows 10 e Windows 11 x64, idioma português do Brasil (pt-BR).
- Prioridade financeira R$0: Operação local sem dependência de serviços externos pagos ou custos em nuvem.
- Preservação estrita de `AGENTS.md`: Hash SHA-256 e configurações de agentes devem permanecer inalterados (`python scripts/validar_agentes.py` deve retornar 0).
- Fronteiras do MVP (RF-16): Sem suporte a webcam, gravação local/nuvem ou chamadas por DM.
- Segurança de distribuição (RF-15): Nenhum segredo, chave privada ou credencial vazada no artefato distribuível.

## Review Focus

- Tentativa de incluir arquivos com segredos (chaves privadas, senhas, tokens) deve falhar na auditoria de release.
- Manifesto de release deve conter todos os metadados de instalação Windows (per-user, `%LOCALAPPDATA%`, idioma pt-BR).
- Hashes SHA-256 de todos os artefatos compilados devem corresponder aos arquivos reais em disco.
- Procedimento de atualização ou rollback deve preservar o diretório `userData` do usuário.
- O teste de fumaça desktop Electron deve continuar aprovado com 100% de sucesso.

---

### Task 1: Tipos de Release e Testes de Conformidade do Instalador (RF-01, RF-15, RF-16)

**Files:**
- Create: `src/common/release-types.ts`
- Create: `tests/unit/release-installer.test.ts`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/release-installer.test.ts` testando:
1. Validação de metadados de release (nome 'Discord Desktop', versão '0.1.0', plataforma 'win32', arquitetura 'x64', idioma 'pt-BR').
2. Inclusão dos artefatos mínimos exigidos (`dist-electron/main/index.js`, `dist-electron/preload/index.cjs`, `dist/index.html`).
3. Auditoria de ausência de segredos em arquivos de distribuição.
4. Conformidade estrita com as fronteiras do MVP (sem webcam, sem gravação, sem chamada por DM).
5. Garantia de que a pasta `userData` do usuário não é sobrescrita durante atualização ou rollback.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/release-installer.test.ts`

- [ ] **Step 3: Implement release types and validator**
Criar `src/common/release-types.ts` com interfaces `ReleaseManifest`, `ReleaseAuditResult` e função `auditReleaseArtifacts`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/release-installer.test.ts`

- [ ] **Step 5: Commit changes**
`git add src/common/release-types.ts tests/unit/release-installer.test.ts; git commit -m "feat(release): implement release types and distribution integrity audit tests"`

---

### Task 2: Script de Empacotamento e Manifesto de Distribuição (RF-15)

**Files:**
- Create: `scripts/build-release.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write build-release script**
Criar `scripts/build-release.mjs` que:
1. Executa o build de produção (`npm run build`).
2. Varre o diretório gerado, calcula hashes SHA-256 e tamanhos de cada arquivo compilado.
3. Executa a auditoria de ausência de credenciais/segredos.
4. Gera `dist-release/release-manifest.json`.
5. Adiciona comando `"release": "node scripts/build-release.mjs"` no `package.json`.

- [ ] **Step 2: Run release script to verify generation**
Executar: `npm run release`
Confirmar que `dist-release/release-manifest.json` é gerado com sucesso.

- [ ] **Step 3: Test release script with vitest**
Adicionar teste de ponta a ponta em `tests/unit/release-installer.test.ts` que valida a leitura do manifesto gerado.
Executar: `npx vitest run tests/unit/release-installer.test.ts`

- [ ] **Step 4: Commit changes**
`git add scripts/build-release.mjs package.json tests/unit/release-installer.test.ts dist-release/release-manifest.json; git commit -m "feat(release): add automated release build and integrity manifest generation"`

---

### Task 3: Verificação de Instalação, Atualização e Preservação de Dados

**Files:**
- Create: `tests/unit/release-lifecycle.test.ts`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/release-lifecycle.test.ts` testando o ciclo de vida:
1. Instalação per-user em `%LOCALAPPDATA%/Programs/discord-desktop`.
2. Criação de atalhos e protocolo desktop `discord://`.
3. Atualização e rollback preservando as configurações e sessão em `%APPDATA%/discord-desktop` (`userData`).
4. Desinstalação limpa que remove binários sem apagar silenciosamente dados de outras aplicações.

- [ ] **Step 2: Run test to verify execution**
Executar: `npx vitest run tests/unit/release-lifecycle.test.ts`

- [ ] **Step 3: Commit changes**
`git add tests/unit/release-lifecycle.test.ts; git commit -m "test(release): add lifecycle tests for install, update, rollback and clean uninstall"`

---

### Task 4: Bateria de Verificação Completa e Atualização da Documentação

**Files:**
- Modify: `docs/execucao/registro.md`
- Modify: `docs/planejamento/backlog.md`
- Modify: `README.md`

- [ ] **Step 1: Run all test suites**
Executar:
- `npm test`
- `npm run test:desktop`
- `npm run lint`
- `python -m unittest discover tests`
- `python scripts/validar_agentes.py`

- [ ] **Step 2: Update documentation**
Atualizar `docs/execucao/registro.md`, `docs/planejamento/backlog.md` e contagem de testes no `README.md`.

- [ ] **Step 3: Commit documentation**
`git add docs/ README.md; git commit -m "docs: record completion of Etapa 11 RELEASE and update distribution metrics"`
