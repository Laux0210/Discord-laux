# Etapa 8 (IDENTITY) — Identidade, Autenticação e Comunidades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar autenticação segura (Google OAuth / mock local para R$0), persistência protegida de sessão, gerenciamento de comunidades (`guilds`), membros, convites com expiração/limite de uso e administração de cargos com respeito à hierarquia de permissões.

**Architecture:** Módulos de autenticação e sessão com anti-CSRF e storage protegido, serviço de comunidades (`GuildService`) alinhado com o schema PostgreSQL já migrado, avaliação canônica de permissões em `src/common/permissions.ts` e componentes React atualizados no renderer.

**Tech Stack:** TypeScript, React 19, Vitest, Electron IPC, Web Crypto.

**Spec:** [2026-10-14-etapa8-identity-design.md](file:///C:/Users/jv883/Documents/Codex/Discord/docs/superpowers/specs/2026-10-14-etapa8-identity-design.md)

## Global Constraints

- Plataforma alvo: Windows 10/11 x64, idioma português do Brasil (pt-BR).
- Prioridade financeira R$0: Operação e testes totalmente executáveis localmente sem requisições pagas.
- Preservação de `AGENTS.md`: Hash SHA-256 e configurações de agentes devem permanecer estritamente intactos (`python scripts/validar_agentes.py` deve retornar 0).
- Isolamento e segurança: Segredos e tokens nunca devem ser expostos em texto plano em logs.

## Review Focus

- Restauração de sessão expirada deve ser limpa e redirecionar para tela de login.
- Anti-CSRF: callback com `state` inválido deve rejeitar a autenticação.
- Convite inexistente, expirado ou esgotado deve ser rejeitado com erro explícito.
- Atribuição de cargo por membro com cargo inferior ou igual deve ser bloqueada pela hierarquia (`canManageRole`).
- Canais privados sem permissão `VIEW_CHANNEL` devem ser ocultados do usuário.

---

### Task 1: Autenticação, Anti-CSRF e Gerenciamento de Sessão

**Files:**
- Create: `src/common/auth-types.ts`
- Create: `src/renderer/src/services/session-manager.ts`
- Create: `src/renderer/src/services/auth-service.ts`
- Create: `tests/unit/auth-session.test.ts`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/auth-session.test.ts` testando:
1. Geração de URL de login com `state` aleatório e armazenamento de nonce.
2. Tratamento de callback com validação de `state` (rejeitando mismatch).
3. Salvamento e restauração de sessão válida.
4. Rejeição e limpeza automática de sessão expirada (`expiresAt < now`).
5. Logout com invalidação de sessão e emissão de evento.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/auth-session.test.ts`

- [ ] **Step 3: Implement Auth & Session Management**
Implementar `src/common/auth-types.ts`, `src/renderer/src/services/session-manager.ts` e `src/renderer/src/services/auth-service.ts`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/auth-session.test.ts`

- [ ] **Step 5: Commit changes**
`git add src/common/auth-types.ts src/renderer/src/services/session-manager.ts src/renderer/src/services/auth-service.ts tests/unit/auth-session.test.ts; git commit -m "feat(identity): implement auth service with anti-csrf and session manager"`

---

### Task 2: Comunidades, Membros e Criação de Canais

**Files:**
- Create: `src/common/guild-types.ts`
- Create: `src/renderer/src/services/guild-service.ts`
- Create: `tests/unit/guild-service.test.ts`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/guild-service.test.ts` testando:
1. Criação de comunidade: define dono, adiciona a `guild_members`, cria `@everyone` e canal padrão `#geral`.
2. Listagem de comunidades associadas a um usuário.
3. Criação de canal de texto e voz com validação de `MANAGE_CHANNELS`.
4. Exclusão de canal com validação de `MANAGE_CHANNELS`.
5. Filtro de canais visíveis conforme `VIEW_CHANNEL`.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/guild-service.test.ts`

- [ ] **Step 3: Implement GuildService**
Implementar `src/common/guild-types.ts` e `src/renderer/src/services/guild-service.ts`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/guild-service.test.ts`

- [ ] **Step 5: Commit changes**
`git add src/common/guild-types.ts src/renderer/src/services/guild-service.ts tests/unit/guild-service.test.ts; git commit -m "feat(identity): implement community and channel management in guild service"`

---

### Task 3: Sistema de Convites com Validação Estrita (Expiração e Limite de Usos)

**Files:**
- Modify: `src/renderer/src/services/guild-service.ts`
- Create: `tests/unit/invites.test.ts`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/invites.test.ts` testando:
1. Geração de convite alfanumérico seguro com validação de `CREATE_INSTANT_INVITE`.
2. Aceite de convite válido: adiciona usuário a membros e incrementa contador `uses`.
3. Recusa de código inexistente (`CONVITE_INEXISTENTE`).
4. Recusa de convite expirado (`CONVITE_EXPIRADO`).
5. Recusa de convite que atingiu limite de usos (`CONVITE_ESGOTADO`).
6. Idempotência ao aceitar convite quando usuário já é membro (não duplica nem consome uso extra).

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/invites.test.ts`

- [ ] **Step 3: Implement Invite logic in GuildService**
Completar a validação e consumo de convites em `src/renderer/src/services/guild-service.ts`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/invites.test.ts`

- [ ] **Step 5: Commit changes**
`git add src/renderer/src/services/guild-service.ts tests/unit/invites.test.ts; git commit -m "feat(identity): implement strict invite validation and expiration logic"`

---

### Task 4: Hierarquia de Cargos e Permissões Administrativas

**Files:**
- Modify: `src/renderer/src/services/guild-service.ts`
- Create: `tests/unit/role-hierarchy.test.ts`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/role-hierarchy.test.ts` testando:
1. Dono da guilda pode criar e atribuir qualquer cargo a qualquer membro.
2. Membro com `MANAGE_ROLES` só pode criar/editar cargos com `position` menor que a do seu cargo mais alto.
3. Atribuição de cargo bloqueada se o alvo ou o cargo tiver `position >=` à do ator.
4. Tentativa de elevação de privilégios recusada com erro explícito.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/role-hierarchy.test.ts`

- [ ] **Step 3: Implement Role Hierarchy Enforcement**
Integrar as verificações de `canManageRole` e regras de autorização em `GuildService`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/role-hierarchy.test.ts`

- [ ] **Step 5: Commit changes**
`git add src/renderer/src/services/guild-service.ts tests/unit/role-hierarchy.test.ts; git commit -m "feat(identity): enforce role hierarchy and permission checks in guild service"`

---

### Task 5: Integração da Interface de Usuário (App, Sidebar e Telas de Estado)

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/Sidebar.tsx`
- Modify: `src/renderer/src/components/UserBar.tsx`
- Create: `src/renderer/src/components/LoginModal.tsx`
- Create: `tests/unit/app-identity.test.tsx`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/app-identity.test.tsx` verificando:
1. Exibição da tela/modal de login quando `currentUser === null`.
2. Login com sucesso transiciona a UI para o estado autenticado.
3. Sidebar exibe a lista de servidores do usuário com ícone de cada comunidade.
4. Alternância de comunidade atualiza os canais exibidos.
5. Logout limpa a interface e exibe tela de login novamente.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/app-identity.test.tsx`

- [ ] **Step 3: Implement UI updates**
Integrar `AuthService` e `GuildService` em `App.tsx`, `Sidebar.tsx`, `UserBar.tsx` e `LoginModal.tsx`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/app-identity.test.tsx`

- [ ] **Step 5: Commit changes**
`git add src/renderer/src/ tests/unit/app-identity.test.tsx; git commit -m "feat(identity): integrate auth and guild navigation in user interface"`

---

### Task 6: Validação Completa, Fumaça Desktop e Atualização do Registro

**Files:**
- Modify: `docs/execucao/registro.md`
- Modify: `docs/planejamento/backlog.md`
- Modify: `README.md`

- [ ] **Step 1: Execute full test suite**
Executar:
- `npm test`
- `npm run test:desktop`
- `npm run lint`
- `python -m unittest discover tests`
- `python scripts/validar_agentes.py`

- [ ] **Step 2: Update documentation and execution ledger**
Registrar a conclusão da Etapa 8 no `docs/execucao/registro.md`, atualizar `docs/planejamento/backlog.md` e contagem de testes no `README.md`.

- [ ] **Step 3: Commit documentation**
`git add docs/ README.md; git commit -m "docs: record completion of Etapa 8 IDENTITY and update test metrics"`
