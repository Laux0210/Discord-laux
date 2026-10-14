/**
 * Telemetria local, cálculo de percentis p95 e controle de orçamento para o Piloto (RF-12, AC-12)
 */

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
  cutoffTriggered: boolean;
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sorted.length - 1));
  return sorted[clampedIndex];
}

export class LocalPilotTelemetry {
  private textLatencies: number[] = [];
  private voiceJoinDurations: number[] = [];
  private reconnectionDurations: number[] = [];

  private voiceHoursConsumed: number = 0;
  private screenShareHoursConsumed: number = 0;
  private readonly maxVoiceHours: number = 120;
  private readonly maxScreenShareHours: number = 60;

  private onCutoffCallback?: () => void;
  private cutoffTriggered: boolean = false;

  public setOnCutoffCallback(callback: () => void): void {
    this.onCutoffCallback = callback;
  }

  public recordTextLatency(durationMs: number): void {
    this.textLatencies.push(durationMs);
  }

  public recordVoiceJoinDuration(durationMs: number): void {
    this.voiceJoinDurations.push(durationMs);
  }

  public recordReconnection(durationMs: number): void {
    this.reconnectionDurations.push(durationMs);
  }

  public addVoiceHours(hours: number): void {
    this.voiceHoursConsumed += hours;
    this.checkBudgetLimit();
  }

  public addScreenShareHours(hours: number): void {
    this.screenShareHoursConsumed += hours;
    this.checkBudgetLimit();
  }

  private checkBudgetLimit(): void {
    const isExceeded =
      this.voiceHoursConsumed > this.maxVoiceHours ||
      this.screenShareHoursConsumed > this.maxScreenShareHours;

    if (isExceeded && !this.cutoffTriggered) {
      this.cutoffTriggered = true;
      if (this.onCutoffCallback) {
        this.onCutoffCallback();
      }
    }
  }

  public generateReport(): PilotMetricsReport {
    const textLatencyP95 = calculatePercentile(this.textLatencies, 95);
    const voiceJoinP95 = calculatePercentile(this.voiceJoinDurations, 95);
    const maxReconnection =
      this.reconnectionDurations.length > 0
        ? Math.max(...this.reconnectionDurations)
        : 0;

    const budgetWithinLimit =
      this.voiceHoursConsumed <= this.maxVoiceHours &&
      this.screenShareHoursConsumed <= this.maxScreenShareHours;

    return {
      totalTextSamples: this.textLatencies.length,
      textLatencyP95Ms: textLatencyP95,
      textSlaPassed: textLatencyP95 <= 1000,

      totalVoiceJoins: this.voiceJoinDurations.length,
      voiceJoinP95Ms: voiceJoinP95,
      voiceJoinSlaPassed: voiceJoinP95 <= 5000,

      totalReconnections: this.reconnectionDurations.length,
      maxReconnectionMs: maxReconnection,
      reconnectionSlaPassed: maxReconnection <= 15000,

      voiceHoursConsumed: this.voiceHoursConsumed,
      screenShareHoursConsumed: this.screenShareHoursConsumed,
      budgetWithinLimit,
      cutoffTriggered: this.cutoffTriggered
    };
  }
}
