import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalPilotTelemetry,
  calculatePercentile
} from '../../src/common/pilot-metrics';

describe('Local Pilot Telemetry and p95 SLAs (RF-12, AC-12)', () => {
  let telemetry: LocalPilotTelemetry;

  beforeEach(() => {
    telemetry = new LocalPilotTelemetry();
  });

  it('calcula percentis corretamente a partir de amostras numéricas', () => {
    // 100 amostras ordenadas de 1 a 100
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const p95 = calculatePercentile(values, 95);
    expect(p95).toBe(95);

    const p50 = calculatePercentile(values, 50);
    expect(p50).toBe(50);
  });

  it('retorna 0 para percentil de array vazio', () => {
    expect(calculatePercentile([], 95)).toBe(0);
  });

  it('avalia latência de texto p95 e verifica conformidade com meta p95 <= 1000 ms', () => {
    // 95 mensagens rápidas (100 ms) e 5 lentas (500 ms)
    for (let i = 0; i < 95; i++) {
      telemetry.recordTextLatency(100);
    }
    for (let i = 0; i < 5; i++) {
      telemetry.recordTextLatency(500);
    }

    const report = telemetry.generateReport();
    expect(report.totalTextSamples).toBe(100);
    expect(report.textLatencyP95Ms).toBe(100);
    expect(report.textSlaPassed).toBe(true);

    // Agora adiciona amostras degradadas para violar p95
    for (let i = 0; i < 20; i++) {
      telemetry.recordTextLatency(1500);
    }
    const degradedReport = telemetry.generateReport();
    expect(degradedReport.textLatencyP95Ms).toBeGreaterThan(1000);
    expect(degradedReport.textSlaPassed).toBe(false);
  });

  it('avalia tempo de entrada na voz p95 e verifica conformidade com meta p95 <= 5000 ms', () => {
    for (let i = 0; i < 10; i++) {
      telemetry.recordVoiceJoinDuration(1200);
    }

    const report = telemetry.generateReport();
    expect(report.totalVoiceJoins).toBe(10);
    expect(report.voiceJoinP95Ms).toBe(1200);
    expect(report.voiceJoinSlaPassed).toBe(true);
  });

  it('avalia tempo de reconexão e verifica conformidade com meta <= 15000 ms', () => {
    telemetry.recordReconnection(3000);
    telemetry.recordReconnection(8000);

    const report = telemetry.generateReport();
    expect(report.totalReconnections).toBe(2);
    expect(report.maxReconnectionMs).toBe(8000);
    expect(report.reconnectionSlaPassed).toBe(true);

    // Reconexão lenta que estoura SLA
    telemetry.recordReconnection(16000);
    const slowReport = telemetry.generateReport();
    expect(slowReport.maxReconnectionMs).toBe(16000);
    expect(slowReport.reconnectionSlaPassed).toBe(false);
  });

  it('mantém o orçamento dentro do limite quando o consumo de horas não excede os tetos de 120h e 60h', () => {
    let cutoffFired = false;
    telemetry.setOnCutoffCallback(() => {
      cutoffFired = true;
    });

    telemetry.addVoiceHours(50);
    telemetry.addScreenShareHours(25);

    const report = telemetry.generateReport();
    expect(report.voiceHoursConsumed).toBe(50);
    expect(report.screenShareHoursConsumed).toBe(25);
    expect(report.budgetWithinLimit).toBe(true);
    expect(report.cutoffTriggered).toBe(false);
    expect(cutoffFired).toBe(false);
  });

  it('aciona corte preventivo e dispara callback quando voz ultrapassa o teto mensal de 120 horas', () => {
    let cutoffFired = false;
    telemetry.setOnCutoffCallback(() => {
      cutoffFired = true;
    });

    telemetry.addVoiceHours(121);

    const report = telemetry.generateReport();
    expect(report.voiceHoursConsumed).toBe(121);
    expect(report.budgetWithinLimit).toBe(false);
    expect(report.cutoffTriggered).toBe(true);
    expect(cutoffFired).toBe(true);
  });

  it('aciona corte preventivo quando transmissão de tela ultrapassa o teto mensal de 60 horas', () => {
    let cutoffFired = false;
    telemetry.setOnCutoffCallback(() => {
      cutoffFired = true;
    });

    telemetry.addScreenShareHours(60.5);

    const report = telemetry.generateReport();
    expect(report.screenShareHoursConsumed).toBe(60.5);
    expect(report.budgetWithinLimit).toBe(false);
    expect(report.cutoffTriggered).toBe(true);
    expect(cutoffFired).toBe(true);
  });
});
