import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopCallController } from '../../src/renderer/src/services/desktop-call-controller';
import type { CallState } from '../../src/common/media-types';

describe('DesktopCallController - Corte Preventivo por Orçamento (RF-12)', () => {
  let controller: DesktopCallController;

  beforeEach(async () => {
    controller = new DesktopCallController();
    for (let i = 1; i <= 5; i++) {
      await controller.joinCall('channel-voice-1', 'guild-1', `user-${i}`, `Participant ${i}`);
    }
    await controller.startScreenShare('user-1');
  });

  it('desconecta todos os participantes e encerra a transmissão ao acionar o corte de emergência', async () => {
    let capturedState: CallState | null = null;
    controller.onCallStateUpdated((state) => {
      capturedState = state;
    });

    // Estado antes do corte
    const beforeState = controller.getCallState();
    expect(beforeState.participants).toHaveLength(5);
    expect(beforeState.activeScreenShareUserId).toBe('user-1');
    expect(beforeState.channelId).toBe('channel-voice-1');

    // Aciona corte preventivo por orçamento
    await controller.triggerEmergencyBudgetCutoff();

    const afterState = controller.getCallState();
    expect(afterState.participants).toHaveLength(0);
    expect(afterState.activeScreenShareUserId).toBeNull();
    expect(afterState.channelId).toBeNull();
    expect(afterState.guildId).toBeNull();
    expect(afterState.startedAt).toBeNull();

    // Notificação foi emitida para os observadores
    expect(capturedState).toEqual(afterState);
  });

  it('permite que nova chamada seja iniciada normalmente após o encerramento por corte preventivo', async () => {
    await controller.triggerEmergencyBudgetCutoff();

    const joined = await controller.joinCall(
      'channel-voice-2',
      'guild-2',
      'user-new',
      'Novo Usuário'
    );
    expect(joined).toBe(true);

    const state = controller.getCallState();
    expect(state.channelId).toBe('channel-voice-2');
    expect(state.guildId).toBe('guild-2');
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0].userId).toBe('user-new');
  });
});
