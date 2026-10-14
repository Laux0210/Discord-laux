import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopCallController } from '../../src/renderer/src/services/desktop-call-controller';
import { PermissionFlags } from '../../src/common/permissions';

describe('DesktopCallController - Controles de Áudio e Corte Remoto (RF-10)', () => {
  let controller: DesktopCallController;

  beforeEach(async () => {
    controller = new DesktopCallController();
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-mod', 'Moderator');
    await controller.joinCall('channel-voice-1', 'guild-1', 'user-member', 'Member');
  });

  it('permite alternar mute individualmente', async () => {
    await controller.setMute('user-member', true);
    let member = controller.getCallState().participants.find((p) => p.userId === 'user-member');
    expect(member?.isMuted).toBe(true);

    await controller.setMute('user-member', false);
    member = controller.getCallState().participants.find((p) => p.userId === 'user-member');
    expect(member?.isMuted).toBe(false);
  });

  it('cascateia deafen para mute automaticamente', async () => {
    await controller.setDeafen('user-member', true);
    const member = controller.getCallState().participants.find((p) => p.userId === 'user-member');
    expect(member?.isDeafened).toBe(true);
    expect(member?.isMuted).toBe(true);
  });

  it('ao desativar deafen, preserva o microfone mutado até ação explícita de desmutar', async () => {
    await controller.setDeafen('user-member', true);
    let member = controller.getCallState().participants.find((p) => p.userId === 'user-member');
    expect(member?.isDeafened).toBe(true);
    expect(member?.isMuted).toBe(true);

    // Desativa o deafen
    await controller.setDeafen('user-member', false);
    member = controller.getCallState().participants.find((p) => p.userId === 'user-member');
    expect(member?.isDeafened).toBe(false);
    expect(member?.isMuted).toBe(true); // Permanece mutado

    // Usuário desmuta explicitamente
    await controller.setMute('user-member', false);
    member = controller.getCallState().participants.find((p) => p.userId === 'user-member');
    expect(member?.isMuted).toBe(false);
  });

  it('rejeita alteração de áudio para usuário que não está na chamada', async () => {
    await expect(controller.setMute('ghost-user', true)).rejects.toThrow(
      'PARTICIPANTE_NAO_ENCONTRADO'
    );
    await expect(controller.setDeafen('ghost-user', true)).rejects.toThrow(
      'PARTICIPANTE_NAO_ENCONTRADO'
    );
  });

  it('permite enumerar e selecionar dispositivos de áudio', async () => {
    const devices = await controller.getAudioDevices();
    expect(devices.length).toBeGreaterThanOrEqual(2);
    expect(devices.some((d) => d.kind === 'audioinput')).toBe(true);
    expect(devices.some((d) => d.kind === 'audiooutput')).toBe(true);

    await controller.setAudioDevice('audioinput', 'mic-virtual');
    await controller.setAudioDevice('audiooutput', 'speaker-virtual');

    const selected = controller.getSelectedAudioDevices();
    expect(selected.input).toBe('mic-virtual');
    expect(selected.output).toBe('speaker-virtual');
  });

  it('permite que moderador com KICK_MEMBERS expulse participante em tempo <= 5000 ms', async () => {
    const startTime = Date.now();

    const kicked = await controller.kickParticipant(
      'user-member',
      'user-mod',
      PermissionFlags.KICK_MEMBERS
    );
    const durationMs = Date.now() - startTime;

    expect(kicked).toBe(true);
    expect(durationMs).toBeLessThanOrEqual(5000); // Requisito <= 5s

    // Participante foi removido e vaga foi liberada
    const state = controller.getCallState();
    expect(state.participants).toHaveLength(1);
    expect(state.participants.some((p) => p.userId === 'user-member')).toBe(false);
  });

  it('permite que administrador expulse participante', async () => {
    const kicked = await controller.kickParticipant(
      'user-member',
      'user-mod',
      PermissionFlags.ADMINISTRATOR
    );
    expect(kicked).toBe(true);
    expect(controller.getCallState().participants).toHaveLength(1);
  });

  it('rejeita expulsão iniciada por usuário sem permissão de expulsão', async () => {
    await expect(
      controller.kickParticipant(
        'user-mod',
        'user-member',
        PermissionFlags.VIEW_CHANNEL | PermissionFlags.SEND_MESSAGES
      )
    ).rejects.toThrow('PERMISSAO_NEGADA');

    expect(controller.getCallState().participants).toHaveLength(2);
  });

  it('retorna false ao tentar expulsar participante que já não está na chamada', async () => {
    const kicked = await controller.kickParticipant(
      'user-ghost',
      'user-mod',
      PermissionFlags.KICK_MEMBERS
    );
    expect(kicked).toBe(false);
  });
});
