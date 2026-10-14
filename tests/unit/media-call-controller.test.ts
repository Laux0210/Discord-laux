import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopCallController } from '../../src/renderer/src/services/desktop-call-controller';

describe('DesktopCallController - Capacidade e Chamada Global (RF-09)', () => {
  let controller: DesktopCallController;

  beforeEach(() => {
    controller = new DesktopCallController();
  });

  it('permite que um participante inicie e ingresse na chamada de voz com sucesso', async () => {
    const success = await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice');
    expect(success).toBe(true);

    const state = controller.getCallState();
    expect(state.channelId).toBe('channel-voice-1');
    expect(state.guildId).toBe('guild-1');
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0].userId).toBe('user-1');
    expect(state.participants[0].displayName).toBe('Alice');
    expect(state.participants[0].isMuted).toBe(false);
    expect(state.participants[0].isDeafened).toBe(false);
    expect(state.participants[0].isScreenSharing).toBe(false);
  });

  it('impede início de chamada em outro canal se já houver chamada ativa (1 chamada global)', async () => {
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice');

    await expect(
      controller.joinCall('channel-voice-2', 'guild-1', 'user-2', 'Bob')
    ).rejects.toThrow('CHAMADA_GLOBAL_EM_ANDAMENTO');

    // Estado da chamada original permanece intacto
    const state = controller.getCallState();
    expect(state.channelId).toBe('channel-voice-1');
    expect(state.participants).toHaveLength(1);
  });

  it('permite até exatamente 10 participantes na mesma chamada e rejeita o 11º com CAPACIDADE_CHAMADA_EXCEDIDA', async () => {
    // Entram 10 participantes
    for (let i = 1; i <= 10; i++) {
      const ok = await controller.joinCall(
        'channel-voice-1',
        'guild-1',
        `user-${i}`,
        `Participant ${i}`
      );
      expect(ok).toBe(true);
    }

    const state = controller.getCallState();
    expect(state.participants).toHaveLength(10);

    // Tentativa do 11º participante entrar
    await expect(
      controller.joinCall('channel-voice-1', 'guild-1', 'user-11', 'Participant 11')
    ).rejects.toThrow('CAPACIDADE_CHAMADA_EXCEDIDA');

    expect(controller.getCallState().participants).toHaveLength(10);
  });

  it('libera vaga imediatamente quando um participante sai da chamada', async () => {
    for (let i = 1; i <= 10; i++) {
      await controller.joinCall('channel-voice-1', 'guild-1', `user-${i}`, `Participant ${i}`);
    }

    expect(controller.getCallState().participants).toHaveLength(10);

    // user-5 sai da chamada
    await controller.leaveCall('user-5');
    expect(controller.getCallState().participants).toHaveLength(9);
    expect(controller.getCallState().participants.some((p) => p.userId === 'user-5')).toBe(false);

    // Agora o 11º participante consegue entrar ocupando a vaga liberada
    const joined = await controller.joinCall(
      'channel-voice-1',
      'guild-1',
      'user-11',
      'Participant 11'
    );
    expect(joined).toBe(true);
    expect(controller.getCallState().participants).toHaveLength(10);
  });

  it('encerra a chamada e libera o canal quando o último participante sai', async () => {
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice');
    await controller.leaveCall('user-1');

    const state = controller.getCallState();
    expect(state.channelId).toBeNull();
    expect(state.guildId).toBeNull();
    expect(state.participants).toHaveLength(0);
    expect(state.activeScreenShareUserId).toBeNull();

    // Agora é possível abrir chamada em outro canal livremente
    const newCallOk = await controller.joinCall('channel-voice-2', 'guild-2', 'user-2', 'Bob');
    expect(newCallOk).toBe(true);
    expect(controller.getCallState().channelId).toBe('channel-voice-2');
  });

  it('se o mesmo usuário chamar joinCall novamente no mesmo canal, atualiza sem duplicar vaga', async () => {
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice');
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice Updated');

    const state = controller.getCallState();
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0].displayName).toBe('Alice Updated');
  });

  it('notifica observadores via onCallStateUpdated a cada mudança', async () => {
    const states: number[] = [];
    const unsubscribe = controller.onCallStateUpdated((s) => {
      states.push(s.participants.length);
    });

    await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice');
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-2', 'Bob');
    await controller.leaveCall('user-1');

    expect(states).toEqual([1, 2, 1]);
    unsubscribe();

    await controller.leaveCall('user-2');
    // Não deve adicionar novo estado pois deu unsubscribe
    expect(states).toEqual([1, 2, 1]);
  });
});
