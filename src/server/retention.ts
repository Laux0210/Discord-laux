const RETENTION_PERIOD_MS = 10 * 24 * 60 * 60 * 1000;
const CHAT_KEY = 'discord_laux_v1_chat_state';
const FRIENDSHIP_KEY = 'discord_laux_v1_friendship_state';

function invalid(): never {
  throw new Error('ARMAZENAMENTO_INVALIDO: snapshot de mensagens; arquivo preservado para recuperação.');
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function envelope(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string') invalid();
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { invalid(); }
  const result = record(parsed);
  if (result.version !== 1 || !Object.hasOwn(result, 'data')) invalid();
  return result;
}

function messages(value: unknown, channelField: 'channelId' | 'dmChannelId'): Record<string, unknown>[] {
  if (!Array.isArray(value)) invalid();
  return value.map(entry => {
    const item = record(entry);
    if (!nonempty(item.id) || !nonempty(item[channelField]) || !nonempty(item.authorId) ||
      typeof item.authorName !== 'string' || typeof item.content !== 'string' || !timestamp(item.createdAt) ||
      (item.nonce !== undefined && typeof item.nonce !== 'string') ||
      (item.isDeleted !== undefined && typeof item.isDeleted !== 'boolean')) invalid();
    return item;
  });
}

function validateRelationships(data: Record<string, unknown>): void {
  if (!Array.isArray(data.friendships) || !Array.isArray(data.blocks) || !Array.isArray(data.dmChannels)) invalid();
  for (const entry of data.friendships) {
    if (!Array.isArray(entry) || entry.length !== 2 || !nonempty(entry[0])) invalid();
    const friend = record(entry[1]);
    if (!nonempty(friend.userId) || !nonempty(friend.friendId) || !timestamp(friend.createdAt) ||
      (friend.status !== 'accepted' && friend.status !== 'pending')) invalid();
  }
  if (data.blocks.some(block => !nonempty(block))) invalid();
  for (const entry of data.dmChannels) {
    if (!Array.isArray(entry) || entry.length !== 2 || !nonempty(entry[0])) invalid();
    const channel = record(entry[1]);
    if (!nonempty(channel.id) || !timestamp(channel.createdAt) || !Array.isArray(channel.participantIds) ||
      channel.participantIds.length !== 2 || channel.participantIds.some(id => !nonempty(id)) ||
      channel.participantIds[0] === channel.participantIds[1]) invalid();
  }
}

/** Purges only known backend snapshots; validate all of them before editing any. */
export function purgeExpiredMessageSnapshots(data: Record<string, string>, now = Date.now()): boolean {
  if (!timestamp(now)) invalid();
  const cutoff = now - RETENTION_PERIOD_MS;
  const changes: [string, string][] = [];
  if (Object.hasOwn(data, CHAT_KEY)) {
    const stored = envelope(data[CHAT_KEY]);
    const current = messages(stored.data, 'channelId');
    const retained = current.filter(message => Number(message.createdAt) >= cutoff);
    if (retained.length !== current.length) changes.push([CHAT_KEY, JSON.stringify({ ...stored, data: retained })]);
  }
  if (Object.hasOwn(data, FRIENDSHIP_KEY)) {
    const stored = envelope(data[FRIENDSHIP_KEY]);
    const relationships = record(stored.data);
    validateRelationships(relationships);
    const current = messages(relationships.dmMessages, 'dmChannelId');
    const retained = current.filter(message => Number(message.createdAt) > cutoff);
    if (retained.length !== current.length) changes.push([FRIENDSHIP_KEY, JSON.stringify({ ...stored, data: { ...relationships, dmMessages: retained } })]);
  }
  for (const [key, serialized] of changes) data[key] = serialized;
  return changes.length > 0;
}
