import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGuildService } from '../../src/renderer/src/services/guild-service';
import { PermissionFlags } from '../../src/common/permissions';

describe('Sistema de Convites - Validação Estrita', () => {
  let service: InMemoryGuildService;
  const ownerId = 'user-owner';
  const newUserId = 'user-new';
  const secondUserId = 'user-second';
  const thirdUserId = 'user-third';

  beforeEach(() => {
    service = new InMemoryGuildService();
  });

  it('emite convite com código alfanumérico único para criador com permissão', async () => {
    const guild = await service.createGuild({ name: 'Comunidade Gamer', ownerId });
    const invite = await service.createInvite({
      guildId: guild.id,
      creatorId: ownerId,
      maxUses: 5,
      expiresInMs: 60_000 // 1 minuto
    });

    expect(invite.code).toBeDefined();
    expect(invite.code.startsWith('INV-')).toBe(true);
    expect(invite.maxUses).toBe(5);
    expect(invite.uses).toBe(0);
    expect(invite.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejeita emissão de convite por usuário sem permissão CREATE_INSTANT_INVITE', async () => {
    const guild = await service.createGuild({ name: 'Comunidade Fechada', ownerId });
    // Remove CREATE_INSTANT_INVITE do cargo @everyone
    const roles = await (service as any).roles.get(guild.id);
    const everyone = roles.find((r: any) => r.id === guild.id);
    everyone.permissions &= ~PermissionFlags.CREATE_INSTANT_INVITE;

    service.addMemberDirect(guild.id, newUserId);

    await expect(
      service.createInvite({
        guildId: guild.id,
        creatorId: newUserId
      })
    ).rejects.toThrow(/Permissão insuficiente: requer CREATE_INSTANT_INVITE/i);
  });

  it('permite ingresso de novo usuário com convite válido e incrementa usos', async () => {
    const guild = await service.createGuild({ name: 'Clube do Livro', ownerId });
    const invite = await service.createInvite({
      guildId: guild.id,
      creatorId: ownerId,
      maxUses: 2
    });

    const joinedGuild = await service.joinGuildByInvite(invite.code, newUserId);
    expect(joinedGuild.id).toBe(guild.id);

    // Membro inserido na guilda
    const members = await service.getGuildMembers(guild.id);
    expect(members.map((m) => m.userId)).toContain(newUserId);

    // Usos incrementados
    const updatedInvite = await service.getInvite(invite.code);
    expect(updatedInvite?.uses).toBe(1);
  });

  it('rejeita código de convite inexistente com erro explícito', async () => {
    await expect(
      service.joinGuildByInvite('CODIGO_FALSO_999', newUserId)
    ).rejects.toThrow(/CONVITE_INEXISTENTE/i);
  });

  it('rejeita convite expirado com erro explícito', async () => {
    const guild = await service.createGuild({ name: 'Flash Mob', ownerId });
    const invite = await service.createInvite({
      guildId: guild.id,
      creatorId: ownerId,
      expiresInMs: -1000 // já expirado no passado
    });

    await expect(
      service.joinGuildByInvite(invite.code, newUserId)
    ).rejects.toThrow(/CONVITE_EXPIRADO/i);
  });

  it('rejeita convite que atingiu limite de usos (CONVITE_ESGOTADO)', async () => {
    const guild = await service.createGuild({ name: 'Vagas Limitadas', ownerId });
    const invite = await service.createInvite({
      guildId: guild.id,
      creatorId: ownerId,
      maxUses: 1
    });

    // 1º usuário entra com sucesso
    await service.joinGuildByInvite(invite.code, newUserId);
    const check1 = await service.getInvite(invite.code);
    expect(check1?.uses).toBe(1);

    // 2º usuário tenta entrar com convite agora esgotado
    await expect(
      service.joinGuildByInvite(invite.code, secondUserId)
    ).rejects.toThrow(/CONVITE_ESGOTADO/i);
  });

  it('garante idempotência quando usuário já é membro (não consome uso extra)', async () => {
    const guild = await service.createGuild({ name: 'Clube VIP', ownerId });
    const invite = await service.createInvite({
      guildId: guild.id,
      creatorId: ownerId,
      maxUses: 2
    });

    // Usuário entra primeira vez
    await service.joinGuildByInvite(invite.code, newUserId);
    const check1 = await service.getInvite(invite.code);
    expect(check1?.uses).toBe(1);

    // Usuário tenta usar o mesmo convite novamente
    const reJoined = await service.joinGuildByInvite(invite.code, newUserId);
    expect(reJoined.id).toBe(guild.id);

    // O contador de usos não foi incrementado novamente
    const check2 = await service.getInvite(invite.code);
    expect(check2?.uses).toBe(1);

    // Outro usuário ainda consegue consumir a última vaga
    await service.joinGuildByInvite(invite.code, thirdUserId);
    const check3 = await service.getInvite(invite.code);
    expect(check3?.uses).toBe(2);
  });
});
