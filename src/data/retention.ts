/**
 * Módulo de regras e utilitários para cálculo da janela de retenção de 10 dias (RF-13).
 */

export const RETENTION_DAYS = 10;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000; // 864.000.000 ms

/**
 * Retorna a data/hora de corte exata a partir da qual as mensagens devem ser consideradas expiradas.
 */
export function getRetentionCutoffTimestamp(referenceDate: Date = new Date()): Date {
  return new Date(referenceDate.getTime() - RETENTION_MS);
}

/**
 * Avalia se uma mensagem com determinada data de criação deve ser considerada expirada.
 */
export function isMessageExpired(
  createdAt: number | Date,
  referenceDate: Date = new Date()
): boolean {
  const messageTime = typeof createdAt === 'number' ? createdAt : createdAt.getTime();
  const cutoffTime = referenceDate.getTime() - RETENTION_MS;
  return messageTime < cutoffTime;
}

/**
 * Gera query SQL segura para purga de mensagens anteriores a uma data de corte.
 */
export function generatePurgeSql(cutoffTimestamp: Date): string {
  const isoDate = cutoffTimestamp.toISOString();
  return `DELETE FROM messages WHERE created_at < '${isoDate}'; DELETE FROM dm_messages WHERE created_at < '${isoDate}';`;
}
