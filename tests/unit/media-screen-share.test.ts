import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopCallController } from '../../src/renderer/src/services/desktop-call-controller';

describe('DesktopCallController - Transmissão Exclusiva de Tela (RF-11)', () => {
  let controller: DesktopCallController;

  beforeEach(async () => {
    controller = new DesktopCallController();
    // Participantes Alice e Bob entram na chamada
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-1', 'Alice');
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-2', 'Bob');
  });

  it('permite que um participante inicie a transmissão de tela', async () => {
    const started = await controller.startScreenShare('user-1');
    expect(started).toBe(true);

    const state = controller.getCallState();
    expect(state.activeScreenShareUserId).toBe('user-1');

    const alice = state.participants.find((p) => p.userId === 'user-1');
    expect(alice?.isScreenSharing).toBe(true);
  });

  it('impede que um segundo participante transmita enquanto uma transmissão estiver ativa (disputa RF-11)', async () => {
    await controller.startScreenShare('user-1');

    // Bob tenta iniciar transmissão simultânea
    await expect(controller.startScreenShare('user-2')).rejects.toThrow('TRANSMISSAO_JA_ATIVA');

    const state = controller.getCallState();
    expect(state.activeScreenShareUserId).toBe('user-1');
    const bob = state.participants.find((p) => p.userId === 'user-2');
    expect(bob?.isScreenSharing).toBe(false);
  });

  it('rejeita transmissão por usuário que não está na chamada', async () => {
    await expect(controller.startScreenShare('user-ghost')).rejects.toThrow(
      'PARTICIPANTE_NAO_ENCONTRADO'
    );
  });

  it('suporta até 9 espectadores consumindo a transmissão do apresentador', async () => {
    // Adiciona mais 8 participantes para atingir 10 no total (1 apresentador + 9 espectadores)
    for (let i = 3; i <= 10; i++) {
      await controller.joinCall('channel-voice-1', 'guild-1', `user-${i}`, `Viewer ${i}`);
    }

    await controller.startScreenShare('user-1');

    const state = controller.getCallState();
    expect(state.participants).toHaveLength(10);
    expect(state.activeScreenShareUserId).toBe('user-1');

    // 1 apresentador e 9 espectadores
    const presenters = state.participants.filter((p) => p.isScreenSharing);
    const viewers = state.participants.filter((p) => !p.isScreenSharing);

    expect(presenters).toHaveLength(1);
    expect(presenters[0].userId).toBe('user-1');
    expect(viewers).toHaveLength(9);
  });

  it('libera a reserva quando o apresentador encerra a transmissão voluntariamente', async () => {
    await controller.startScreenShare('user-1');
    expect(controller.getCallState().activeScreenShareUserId).toBe('user-1');

    await controller.stopScreenShare('user-1');
    expect(controller.getCallState().activeScreenShareUserId).toBeNull();
    expect(
      controller.getCallState().participants.find((p) => p.userId === 'user-1')?.isScreenSharing
    ).toBe(false);

    // Agora Bob pode iniciar a transmissão sem erros
    const bobStarted = await controller.startScreenShare('user-2');
    expect(bobStarted).toBe(true);
    expect(controller.getCallState().activeScreenShareUserId).toBe('user-2');
  });

  it('libera a reserva automaticamente se o streamer sair da chamada', async () => {
    await controller.startScreenShare('user-1');
    expect(controller.getCallState().activeScreenShareUserId).toBe('user-1');

    // Alice sai da chamada
    await controller.leaveCall('user-1');

    const state = controller.getCallState();
    expect(state.activeScreenShareUserId).toBeNull();
    expect(state.participants.some((p) => p.userId === 'user-1')).toBe(false);

    // Bob agora consegue transmitir
    const bobStarted = await controller.startScreenShare('user-2');
    expect(bobStarted).toBe(true);
    expect(controller.getCallState().activeScreenShareUserId).toBe('user-2');
  });

  it('ignora ou não afeta a transmissão ativa se outro usuário tentar chamar stopScreenShare', async () => {
    await controller.startScreenShare('user-1');
    expect(controller.getCallState().activeScreenShareUserId).toBe('user-1');

    // Bob tenta parar a transmissão de Alice passando o próprio ID
    await controller.stopScreenShare('user-2');

    // A transmissão de Alice continua ativa
    expect(controller.getCallState().activeScreenShareUserId).toBe('user-1');
  });
});
