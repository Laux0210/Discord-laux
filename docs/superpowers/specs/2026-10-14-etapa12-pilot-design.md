# Especificação Técnica — Etapa 12 (PILOT): Piloto Privado e Consolidação da Entrega

**Data:** 2026-10-14  
**Etapa do Plano:** Etapa 12 (PILOT — Realizar piloto e consolidar entrega)  
**Documentos de Origem:** `docs/planejamento/plano.md`, `docs/arquitetura/arquitetura-e-contratos.md`, `docs/produto/requisitos-e-aceite.md`, `docs/planejamento/backlog.md`  
**Rastreabilidade de Requisitos:** RF-01 a RF-17, AC-01 a AC-17, Prioridade R$0 (Controle de consumo, teto de 120h/voz e 60h/tela, métricas p95 e estabilidade operacional).

---

## 1. Visão Geral e Objetivos do Piloto

A Etapa 12 conclui o plano de 12 etapas do Discord Desktop.
Seu objetivo é:
1. **Estruturar o Protocolo de Operação do Piloto Privado de 30 Dias:**
   - Coleta e validação de métricas operacionais locais sem envio de telemetria externa para servidores pagos.
   - Medição de conformidade com os SLAs propostos no plano:
     - Latência de texto $p95 \le 1000\text{ ms}$ (1 segundo).
     - Tempo de entrada em chamada de voz $p95 \le 5000\text{ ms}$ (5 segundos).
     - Tempo de reconexão $\le 15000\text{ ms}$ (15 segundos).
2. **Monitoramento de Consumo e Orçamento:**
   - Contabilização de tempo de chamada como tempo da sala (horas de chamada/transmissão, e não participante-hora).
   - Teto mensal de 120 horas de voz total (incluindo até 60 horas de transmissão de tela).
   - Simulação de corte preventivo automático ao atingir o teto de horas sem gerar excedentes financeiros sob prioridade R$0.
3. **Consolidação Final do Projeto e da Memória:**
   - Verificação de todas as 12 etapas do plano mestre.
   - Registro final de encerramento em `registro.md` e atualização de `backlog.md` e `README.md`.
   - Garantia de preservação incondicional do `AGENTS.md`.

---

## 2. Contratos e Modelo de Telemetria Local (`src/common/pilot-metrics.ts`)

```typescript
export interface PerformanceMetricEntry {
  type: 'text_latency' | 'voice_join' | 'reconnection';
  durationMs: number;
  timestamp: number;
}

export interface BudgetTrackingState {
  voiceDurationMs: number;
  screenShareDurationMs: number;
  maxVoiceHours: number; // 120h
  maxScreenShareHours: number; // 60h
  cutoffTriggered: boolean;
}

export interface PilotMetricsReport {
  totalTextSamples: number;
  textLatencyP95Ms: number;
  textSlaPassed: boolean; // p95 <= 1000 ms

  totalVoiceJoins: number;
  voiceJoinP95Ms: number;
  voiceJoinSlaPassed: boolean; // p95 <= 5000 ms

  totalReconnections: number;
  maxReconnectionMs: number;
  reconnectionSlaPassed: boolean; // <= 15000 ms

  voiceHoursConsumed: number;
  screenShareHoursConsumed: number;
  budgetWithinLimit: boolean;
}
```

---

## 3. Critérios de Aceite da Etapa 12

1. Módulo `LocalPilotTelemetry` calcula percentis $p95$ e valida conformidade com as metas do plano.
2. Controle de orçamento de horas monitora os tetos de 120h/voz e 60h/tela, acionando corte preventivo seguro se os limites forem atingidos.
3. Bateria completa de testes automatizados (100% verde).
4. Relatório final de consolidação do piloto e do plano de 12 etapas gerado e auditado.
5. Arquivo `AGENTS.md` estritamente preservado (código de saída 0 em `validar_agentes.py`).
