# Especificação Técnica — Etapa 11 (RELEASE): Revisões, Segurança e Instalador Candidato

**Data:** 2026-10-14  
**Etapa do Plano:** Etapa 11 (RELEASE — Revisar e produzir instalador candidato)  
**Documentos de Origem:** `docs/planejamento/plano.md`, `docs/arquitetura/arquitetura-e-contratos.md`, `docs/produto/requisitos-e-aceite.md`  
**Rastreabilidade de Requisitos:** RF-01 (Windows 10/11 x64, pt-BR), RF-13 (Retenção 10 dias), RF-14 (Backup seguro sem mensagens), RF-15 (Distribuição, instalação/atualização/desinstalação limpa), RF-16 (Fronteiras do MVP), RF-17 (Conformidade referencial e auditoria), Prioridade R$0 (Sem infraestrutura paga).

---

## 1. Visão Geral e Fronteiras

A Etapa 11 consolida todas as etapas anteriores (BASE, DATA, IDENTITY, TEXT, MEDIA) em um artefato de release auditado e pronto para empacotamento no ecossistema Windows 10/11 x64.
O objetivo desta etapa é:
1. **Configuração e Validação de Empacotamento Windows (RF-01 / RF-15):**
   - Empacotador de release local estruturado que compila os assets de produção (`dist` e `dist-electron`) em um pacote distribuível Windows x64.
   - Instalação per-user sem requerer elevação de privilégios de administrador (UAC).
   - Desinstalação limpa e suporte a atualização manual/rollback seguro.
   - Criação de atalhos e protocolo desktop configurado.
2. **Auditoria de Segurança do Artefato (Security & Secrets Audit):**
   - Varredura de integridade contra vazamento de credenciais, chaves de API, senhas ou tokens privados.
   - Verificação do empacotamento: inclusão exclusiva dos artefatos compilados mínimos necessários para execução.
3. **Auditoria Final de Conformidade com o Contexto Mestre e Limites do MVP (RF-16):**
   - Verificação estrita de que chamadas de vídeo via webcam, gravação local/nuvem e voz individual em DMs permanecem estritamente fora do escopo conforme o contrato.
   - Garantia de que nenhuma chamada para endpoints pagos ou serviços externos é realizada sob a restrição financeira R$0.
   - Confirmação de integridade inalterada do arquivo `AGENTS.md`.

---

## 2. Estrutura do Pacote e Manifesto de Release (`release-manifest.json`)

O processo de release produz um diretório de distribuição auditado (`dist-release/`) contendo o manifesto com metadados e hashes:

```json
{
  "productName": "Discord Desktop",
  "appId": "com.discord.desktop",
  "version": "0.1.0",
  "platform": "win32",
  "arch": "x64",
  "language": "pt-BR",
  "targetOS": ["Windows 10", "Windows 11"],
  "installMode": "per-user",
  "installDirectory": "%LOCALAPPDATA%\\Programs\\discord-desktop",
  "executable": "discord-desktop.exe",
  "security": {
    "contextIsolation": true,
    "sandbox": true,
    "nodeIntegration": false,
    "cspEnforced": true,
    "secretsLeaked": false
  },
  "boundaries": {
    "webcamSupported": false,
    "recordingSupported": false,
    "dmVoiceSupported": false
  },
  "files": [
    {
      "path": "dist-electron/main/index.js",
      "sha256": "...",
      "size": 1234
    },
    {
      "path": "dist-electron/preload/index.cjs",
      "sha256": "...",
      "size": 5678
    },
    {
      "path": "dist/index.html",
      "sha256": "...",
      "size": 678
    }
  ]
}
```

---

## 3. Contratos e Scripts de Release

### 3.1 Script de Empacotamento e Auditoria (`scripts/build-release.mjs`)
- Executa compilação do TypeScript, Vite e esbuild (`dist` e `dist-electron`).
- Audita todos os arquivos para garantir ausência de segredos (`.env`, private keys, tokens Supabase com privilégios de service role).
- Valida o tamanho total e gera os hashes SHA-256 de todos os arquivos distribuídos.
- Gera `dist-release/release-manifest.json`.

### 3.2 Suíte de Testes de Release (`tests/unit/release-installer.test.ts`)
- Verifica a conformidade dos metadados de instalação (nome, versão, plataforma win32 x64, idioma pt-BR).
- Testa a ausência de segredos e credenciais nos artefatos gerados.
- Valida que as fronteiras do MVP (RF-16) são cumpridas no manifesto.
- Valida que o procedimento de rollback e atualização preserva a pasta de dados do usuário (`userData`).

---

## 4. Critérios de Aceite da Etapa 11

1. O script de release executa sem erros e produz o manifesto `release-manifest.json` com hashes verificados.
2. A varredura de segurança confirma 0 credenciais e segredos embutidos nos artefatos.
3. Teste de fumaça desktop Electron roda com sucesso sobre os artefatos de produção.
4. Suíte completa de testes (Vitest + Python) permanece 100% verde.
5. Arquivo `AGENTS.md` permanece intacto com seu hash SHA-256 inalterado.
