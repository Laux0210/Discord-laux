# Etapa 6 (BASE) — Shell Electron + React + TypeScript com Mocks Locais e IPC Seguro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a base executável e testável do aplicativo desktop de comunicação para amigos em Windows 10/11 x64, com shell Electron seguro, React 19 + TypeScript + Vite, motor de permissões canônicas, mocks locais desacoplados e suíte de testes Vitest.

**Architecture:** Arquitetura desacoplada dividida em `src/main` (processo Electron com contextIsolation, sandbox e CSP estrita), `src/preload` (ponte segura via contextBridge expondo apenas API tipada), `src/renderer` (React 19 com serviços mock desacoplados), `src/common` (contratos de tipos, IPC e algoritmo canônico de permissões) e `tests/unit` (testes automatizados Vitest).

**Tech Stack:** Node.js v26, TypeScript 5, Electron 35, React 19, Vite 6, Vitest 3.

**Spec:** [2026-10-14-etapa6-base-electron-design.md](file:///C:/Users/jv883/Documents/Codex/Discord/docs/superpowers/specs/2026-10-14-etapa6-base-electron-design.md)

## Global Constraints

- Plataforma alvo: Windows 10/11 x64, idioma português do Brasil (pt-BR).
- Prioridade financeira R$0: Gate E0 bloqueado para serviços externos; toda execução nesta fase ocorre estritamente com mocks locais em memória.
- Preservação de `AGENTS.md`: O arquivo `AGENTS.md` e a configuração `.codex/` devem permanecer com seus hashes intactos (`python scripts/validar_agentes.py` deve sempre retornar 0).
- Segurança Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP estrita, sem exposição direta de módulos Node ou `ipcRenderer` genérico no renderer.
- Janela de retenção: Mensagens criadas há mais de 10 dias são indisponíveis para consulta nas interfaces de chat.
- Não documentar comandos em `README.md` até que os scripts correspondentes existam e tenham sido testados com sucesso.

## Review Focus

- Mensagens criadas há mais de 10 dias (864.000 segundos) não devem ser retornadas por consultas paginadas, mesmo que persistam em memória bruta.
- Tentativa de envio de mensagem em canal onde o membro tem `SEND_MESSAGES` concedido mas `VIEW_CHANNEL` negado deve resultar em recusa de envio.
- Administrador do servidor (`ADMINISTRATOR`) deve ignorar negações em overrides de canal, porém NÃO deve conseguir acessar canais de DMs privadas de outros usuários.
- Gestor com permissão `MANAGE_ROLES` não pode atribuir nem revogar cargos cujo ranking seja igual ou superior ao seu próprio cargo mais alto.
- Handlers de IPC devem rejeitar payloads inválidos ou canais não autorizados sem provocar crash no processo principal.

---

### Task 1: Configuração do Tooling e Estrutura de Pacotes (DevOps)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `tests/unit/setup.test.ts`

**Interfaces:**
- Produces: Scripts de compilação e teste (`npm test`, `npm run build`, `npm run lint`).

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/setup.test.ts` verificando que a configuração do ambiente carrega as variáveis padrão sem erros:
```typescript
import { describe, it, expect } from 'vitest';

describe('Environment Setup', () => {
  it('should have mock mode enabled by default in local environment', () => {
    const isMockMode = process.env.VITE_USE_MOCK ?? 'true';
    expect(isMockMode).toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/setup.test.ts`
Resultado esperado: FAIL (vitest não instalado ou arquivo não configurado).

- [ ] **Step 3: Implement package.json, configs e instalar dependências**
Configurar `package.json` com Electron, React 19, TypeScript, Vite, Vitest e executar `npm install`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npm test`
Resultado esperado: PASS (setup.test.ts executado e aprovado).

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts .env.example tests/unit/setup.test.ts
git commit -m "feat(setup): configure package tooling, typescript, vite and vitest"
```

---

### Task 2: Tipos de Domínio e Motor Canônico de Permissões (Arquiteto / Dados)

**Files:**
- Create: `src/common/types.ts`
- Create: `src/common/permissions.ts`
- Create: `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces: `computePermissions(params: PermissionContext): bigint`, constantes `PermissionFlags`, interfaces `User`, `GuildMember`, `Role`, `ChannelOverride`.

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/permissions.test.ts` cobrindo:
1. Dono do servidor recebe todas as permissões.
2. Cargo com `ADMINISTRATOR` sobrescreve negações de canal.
3. Overrides de `@everyone`: concessões e negações básicas.
4. Overrides de cargos: negação de um cargo unida com concessão de outro prevalece a concessão.
5. Overrides específicos de membro prevalecem sobre cargos.
6. `SEND_MESSAGES` requer `VIEW_CHANNEL`.
7. Gestor de cargos não pode manipular cargos iguais ou superiores ao seu cargo máximo.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/permissions.test.ts`
Resultado esperado: FAIL (módulos `src/common/permissions` não encontrados).

- [ ] **Step 3: Implement permissions.ts e types.ts**
Implementar o cálculo canônico de permissões com BigInt bitwise e validação de hierarquia em `src/common/permissions.ts`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/permissions.test.ts`
Resultado esperado: PASS (todos os casos de teste de autorização aprovados).

- [ ] **Step 5: Commit**
```bash
git add src/common/types.ts src/common/permissions.ts tests/unit/permissions.test.ts
git commit -m "feat(permissions): implement canonical discord-style permission engine"
```

---

### Task 3: Contratos de IPC e Validação de Mensagens (Arquiteto / DevOps)

**Files:**
- Create: `src/common/ipc-channels.ts`
- Create: `src/common/ipc-validation.ts`
- Create: `tests/unit/ipc-contracts.test.ts`

**Interfaces:**
- Consumes: `src/common/types.ts`
- Produces: `IPC_CHANNELS`, `validateIpcMessage<T>(channel: string, payload: unknown): payload is T`

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/ipc-contracts.test.ts` testando validação de canais conhecidos e rejeição de canais arbitrários ou payloads com injeção de tipos:
```typescript
import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS, isValidChannel, validateIpcPayload } from '../../src/common/ipc-channels';

describe('IPC Contracts', () => {
  it('should validate allowed IPC channels', () => {
    expect(isValidChannel(IPC_CHANNELS.GET_APP_VERSION)).toBe(true);
    expect(isValidChannel('arbitrary-malicious-channel')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/ipc-contracts.test.ts`
Resultado esperado: FAIL.

- [ ] **Step 3: Implement ipc-channels.ts e ipc-validation.ts**
Implementar o dicionário estrito de canais e os validadores de payload.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/ipc-contracts.test.ts`
Resultado esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/common/ipc-channels.ts src/common/ipc-validation.ts tests/unit/ipc-contracts.test.ts
git commit -m "feat(ipc): implement typed ipc channels and payload validation"
```

---

### Task 4: Processos Electron Main e Preload Bridge (DevOps)

**Files:**
- Create: `src/main/index.ts`
- Create: `src/main/window.ts`
- Create: `src/preload/index.ts`
- Create: `src/preload/api.ts`
- Create: `tests/unit/preload-api.test.ts`

**Interfaces:**
- Consumes: `src/common/ipc-channels.ts`
- Produces: `createMainWindow()`, `window.electronAPI` bridge tipado.

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/preload-api.test.ts` verificando que a interface exportada pelo preload bridge expõe apenas funções autorizadas (`getAppVersion`, `getSystemSources`, `onSystemNotification`) e não vaza referências ao `ipcRenderer` ou ao `require`:
```typescript
import { describe, it, expect } from 'vitest';
import { createPreloadApi } from '../../src/preload/api';

describe('Preload API Bridge', () => {
  it('should only expose safe methods without ipcRenderer leakage', () => {
    const mockIpc = { invoke: vi.fn(), on: vi.fn() };
    const api = createPreloadApi(mockIpc as any);
    expect(Object.keys(api).sort()).toEqual(['getAppVersion', 'getSystemSources', 'onSystemNotification']);
    expect((api as any).ipcRenderer).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/preload-api.test.ts`
Resultado esperado: FAIL.

- [ ] **Step 3: Implement Main Window e Preload Bridge**
Implementar `src/main/window.ts` com configurações de segurança (`contextIsolation: true`, `sandbox: true`, CSP estrita) e `src/preload/index.ts` com `createPreloadApi`.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/preload-api.test.ts`
Resultado esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/main/index.ts src/main/window.ts src/preload/index.ts src/preload/api.ts tests/unit/preload-api.test.ts
git commit -m "feat(electron): implement secure main window and sandboxed preload bridge"
```

---

### Task 5: Camada de Serviços Mock com Retenção de 10 Dias (Backend / Frontend)

**Files:**
- Create: `src/renderer/src/services/types.ts`
- Create: `src/renderer/src/services/mock-auth.ts`
- Create: `src/renderer/src/services/mock-chat.ts`
- Create: `src/renderer/src/services/mock-media.ts`
- Create: `tests/unit/mock-services.test.ts`

**Interfaces:**
- Consumes: `src/common/types.ts`, `src/common/permissions.ts`
- Produces: `AuthService`, `ChatService`, `MediaService` com implementações mock prontas para uso offline/local.

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/mock-services.test.ts` verificando:
1. `MockAuthService` autentica usuário e fornece sessão em memória.
2. `MockChatService` envia mensagem idempotente com UUID.
3. `MockChatService` filtra rigorosamente mensagens com mais de 10 dias (`now - 10 * 86400 * 1000`).
4. `MockMediaService` gerencia estado da chamada (máx 10 participantes, máx 1 transmissão de tela simultânea).

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/mock-services.test.ts`
Resultado esperado: FAIL.

- [ ] **Step 3: Implement mock-auth.ts, mock-chat.ts e mock-media.ts**
Implementar os serviços mock em memória com lógica fiel às regras de negócio.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/mock-services.test.ts`
Resultado esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/renderer/src/services/ tests/unit/mock-services.test.ts
git commit -m "feat(services): implement local mock services with 10-day retention and media state"
```

---

### Task 6: Interface React 19 e Layout Base do Aplicativo (Frontend)

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/index.css`
- Create: `src/renderer/src/components/Sidebar.tsx`
- Create: `src/renderer/src/components/ChannelList.tsx`
- Create: `src/renderer/src/components/ChatArea.tsx`
- Create: `src/renderer/src/components/VoiceControls.tsx`
- Create: `src/renderer/src/components/UserBar.tsx`
- Create: `tests/unit/app-layout.test.tsx`

**Interfaces:**
- Consumes: `src/renderer/src/services/`
- Produces: Componente raiz `<App />` e layout completo do produto em desktop.

- [ ] **Step 1: Write the failing test**
Criar `tests/unit/app-layout.test.tsx` validando que `<App />` renderiza as quatro regiões essenciais: barra de servidores, lista de canais, área de chat e barra de controles de áudio/voz.

- [ ] **Step 2: Run test to verify it fails**
Executar: `npx vitest run tests/unit/app-layout.test.tsx`
Resultado esperado: FAIL.

- [ ] **Step 3: Implement React Components e Estilos**
Implementar o layout responsivo desktop com design escuro (Dark Theme), navegação de canais, feed de mensagens e barra de áudio.

- [ ] **Step 4: Run test to verify it passes**
Executar: `npx vitest run tests/unit/app-layout.test.tsx`
Resultado esperado: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/renderer/ tests/unit/app-layout.test.tsx
git commit -m "feat(ui): implement base desktop layout with channels, chat and voice controls"
```

---

### Task 7: Verificação Integrada, Atualização do README e Sincronização Obsidian (QA / Revisor / Orquestrador)

**Files:**
- Modify: `README.md`
- Verify: Execução de `npm test`, `npm run build`, `python scripts/validar_agentes.py`
- Sync: Obsidian `Discord/11-REGISTRO-DE-EXECUCAO.md` e `Discord/01-ESTADO.md`

- [ ] **Step 1: Run full verification suite**
Executar todos os testes e builds:
```bash
npm test
npm run build
python scripts/validar_agentes.py
```
Resultado esperado: Todos os testes Vitest passam (0 falhas), build concluído com sucesso e validador de agentes retorna saída 0 com hash de AGENTS.md intacto.

- [ ] **Step 2: Update README.md with verified development commands**
Documentar os comandos validados (`npm install`, `npm test`, `npm run dev`, `npm run build`) no `README.md`.

- [ ] **Step 3: Update Obsidian memory**
Registrar a conclusão da Etapa 6 nas notas `Discord/11-REGISTRO-DE-EXECUCAO.md`, `Discord/01-ESTADO.md` e `Discord/08-BACKLOG-E-DEPENDENCIAS.md` usando as ferramentas MCP do Obsidian.

- [ ] **Step 4: Final commit**
```bash
git add README.md
git commit -m "docs: update README with verified development and build commands"
```
