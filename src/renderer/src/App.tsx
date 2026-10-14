import React, { useState, useEffect } from 'react';
import type { Channel, Guild, Message, User } from '../../common/types';
import type { AuthService as LegacyAuthService, ChatService, MediaService } from './services/types';
import type { AuthService as ModernAuthService } from '../../common/auth-types';
import type { GuildService } from '../../common/guild-types';
import type { FriendshipService, PresenceService } from '../../common/text-types';
import type { CallController, CallState } from '../../common/media-types';
import { Sidebar } from './components/Sidebar';
import { ChannelList } from './components/ChannelList';
import { UserBar } from './components/UserBar';
import { ChatArea } from './components/ChatArea';
import { VoiceRoomArea } from './components/VoiceRoomArea';
import { VoiceControls } from './components/VoiceControls';
import { LoginModal } from './components/LoginModal';
import { FriendsArea, type FriendEntry } from './components/FriendsArea';
import { DirectMessageArea } from './components/DirectMessageArea';

export interface AppProps {
  authService: LegacyAuthService | ModernAuthService;
  chatService: ChatService;
  mediaService: MediaService;
  callController?: CallController;
  guildService?: GuildService;
  friendshipService?: FriendshipService;
  presenceService?: PresenceService;
  initialSelectedChannelId?: string;
  initialIsInVoiceCall?: boolean;
}

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'chan-general',
    guildId: 'guild-1',
    name: 'geral',
    type: 'text',
    topic: 'Canal principal para conversas'
  },
  {
    id: 'chan-announcements',
    guildId: 'guild-1',
    name: 'avisos',
    type: 'text',
    topic: 'Comunicados importantes da comunidade'
  },
  {
    id: 'chan-voice-main',
    guildId: 'guild-1',
    name: 'Voz Principal',
    type: 'voice'
  }
];

export const App: React.FC<AppProps> = ({
  authService,
  chatService,
  mediaService,
  callController,
  guildService,
  friendshipService,
  presenceService,
  initialSelectedChannelId,
  initialIsInVoiceCall
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [activeView, setActiveView] = useState<'guild' | 'dm'>('guild');
  const [selectedDm, setSelectedDm] = useState<{
    userId: string;
    friendId: string;
    friendName: string;
    service: FriendshipService;
  } | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    initialSelectedChannelId ?? 'chan-general'
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInVoiceCall, setIsInVoiceCall] = useState(initialIsInVoiceCall ?? false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDm(null);
  }, [currentUser?.id, friendshipService, authService]);

  const [callState, setCallState] = useState<CallState>(() => {
    if (callController) {
      return callController.getCallState();
    }
    return {
      channelId: null,
      guildId: null,
      participants: mediaService.getParticipants ? mediaService.getParticipants() : [],
      activeScreenShareUserId: null,
      startedAt: null
    };
  });

  // Escuta atualizações de chamada de voz e mídia
  useEffect(() => {
    if (callController) {
      const unsub = callController.onCallStateUpdated((st) => {
        setCallState(st);
        if (currentUser) {
          const me = st.participants.find((p) => p.userId === currentUser.id);
          if (me) {
            setIsInVoiceCall(true);
            setIsMuted(me.isMuted);
            setIsDeafened(me.isDeafened);
            setIsScreenSharing(me.isScreenSharing);
          } else {
            setIsInVoiceCall(false);
            setIsScreenSharing(false);
          }
        }
      });
      return () => unsub();
    } else if (mediaService.onParticipantsUpdated) {
      const unsub = mediaService.onParticipantsUpdated((parts) => {
        setCallState((prev) => ({ ...prev, participants: parts }));
      });
      return () => unsub();
    }
  }, [callController, mediaService, currentUser]);

  // Escuta mudanças de sessão se for o ModernAuthService
  useEffect(() => {
    if ('onAuthStateChanged' in authService) {
      const unsub = authService.onAuthStateChanged((user) => {
        setCurrentUser(user);
      });
      return () => unsub();
    }
  }, [authService]);

  // Carrega comunidades do usuário autenticado
  useEffect(() => {
    if (!currentUser || !guildService) return;

    guildService.getUserGuilds(currentUser.id).then((userGuilds) => {
      setGuilds(userGuilds);
      if (userGuilds.length > 0 && !selectedGuildId) {
        setSelectedGuildId(userGuilds[0].id);
      }
    });
  }, [currentUser, guildService, selectedGuildId]);

  // Carrega lista de amigos se friendshipService estiver disponível
  useEffect(() => {
    if (!currentUser || !friendshipService) return;

    friendshipService.getFriends(currentUser.id).then((list) => {
      const entries: FriendEntry[] = list.map((item) => ({
        friendId: item.friendId,
        displayName: item.friendId === 'user-2' ? 'Amigo Dois' : item.friendId === 'user-3' ? 'Amigo Três' : item.friendId,
        status: item.status
      }));
      setFriends(entries);
    });
  }, [currentUser, friendshipService]);

  // Carrega canais da comunidade selecionada
  useEffect(() => {
    if (!currentUser || !guildService || !selectedGuildId) return;

    guildService.getGuildChannels(selectedGuildId, currentUser.id).then((guildChannels) => {
      setChannels(guildChannels);
      if (guildChannels.length > 0) {
        setSelectedChannelId(guildChannels[0].id);
      }
    });
  }, [currentUser, guildService, selectedGuildId]);

  // Carrega mensagens do canal ativo
  useEffect(() => {
    if (!selectedChannelId) return;
    chatService.getMessages(selectedChannelId).then(setMessages);

    const unsubscribe = chatService.onNewMessage(selectedChannelId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    return () => {
      unsubscribe();
    };
  }, [chatService, selectedChannelId]);

  const handleLoginGoogle = async () => {
    try {
      setAuthError(null);
      if ('initiateLogin' in authService) {
        const { authUrl } = authService.initiateLogin('google');
        if (typeof window !== 'undefined' && window.electronAPI?.openExternalUrl) {
          await window.electronAPI.openExternalUrl(authUrl);
        }
      }
      const user = 'initiateLogin' in authService
        ? await authService.login({ provider: 'mock', mockUsername: 'amigo-1' })
        : await authService.login('amigo-1');
      if (user) setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Falha na autenticação Google');
    }
  };

  const handleLoginMock = async (username: string) => {
    try {
      setAuthError(null);
      const user = 'initiateLogin' in authService
        ? await authService.login({ provider: 'mock', mockUsername: username })
        : await authService.login(username);
      if (user) setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Falha ao autenticar usuário');
    }
  };

  const handleLogout = async () => {
    setSelectedDm(null);
    await authService.logout();
    setCurrentUser(null);
    setGuilds([]);
    setSelectedGuildId(null);
  };

  const handleSendMessage = async (content: string) => {
    if (!currentUser) return;
    await chatService.sendMessage({
      channelId: selectedChannelId,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      content
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    const ok = await chatService.deleteMessage({
      messageId,
      requesterId: currentUser.id,
      permissions: 0n
    });
    if (ok) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const handleToggleMute = async () => {
    if (!currentUser) return;
    const next = !isMuted;
    setIsMuted(next);
    if (callController) {
      await callController.setMute(currentUser.id, next);
    } else {
      await mediaService.setMute(currentUser.id, next);
    }
  };

  const handleToggleDeafen = async () => {
    if (!currentUser) return;
    const next = !isDeafened;
    setIsDeafened(next);
    if (next) setIsMuted(true);
    if (callController) {
      await callController.setDeafen(currentUser.id, next);
    } else {
      await mediaService.setDeafen(currentUser.id, next);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!currentUser) return;
    if (isScreenSharing) {
      if (callController) {
        await callController.stopScreenShare(currentUser.id);
      } else {
        await mediaService.stopScreenShare(currentUser.id);
      }
      setIsScreenSharing(false);
    } else {
      let ok = false;
      if (callController) {
        try {
          ok = await callController.startScreenShare(currentUser.id);
        } catch (err) {
          console.error('Falha ao compartilhar tela:', err);
        }
      } else {
        ok = await mediaService.startScreenShare(currentUser.id);
      }
      if (ok) {
        setIsScreenSharing(true);
      }
    }
  };

  const handleDisconnectVoice = async () => {
    if (!currentUser) return;
    if (callController) {
      await callController.leaveCall(currentUser.id);
    } else {
      await mediaService.leaveCall(currentUser.id);
    }
    setIsInVoiceCall(false);
    setIsScreenSharing(false);
  };

  const handleSendFriendRequest = async (targetUserId: string) => {
    if (!currentUser || !friendshipService) return;
    await friendshipService.sendFriendRequest(currentUser.id, targetUserId);
    const updated = await friendshipService.getFriends(currentUser.id);
    setFriends(
      updated.map((i) => ({
        friendId: i.friendId,
        displayName: i.friendId,
        status: i.status
      }))
    );
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    if (!currentUser || !friendshipService) return;
    await friendshipService.acceptFriendRequest(currentUser.id, friendId);
    const updated = await friendshipService.getFriends(currentUser.id);
    setFriends(
      updated.map((i) => ({
        friendId: i.friendId,
        displayName: i.friendId,
        status: i.status
      }))
    );
  };

  // Se não estiver logado, exibe a tela de login
  if (!currentUser) {
    return (
      <LoginModal
        onLoginGoogle={handleLoginGoogle}
        onLoginMock={handleLoginMock}
        errorMessage={authError}
      />
    );
  }

  const currentGuildName =
    guilds.find((g) => g.id === selectedGuildId)?.name ?? 'Comunidade dos Amigos';
  const currentChannel =
    channels.find((c) => c.id === selectedChannelId) ?? channels[0] ?? DEFAULT_CHANNELS[0];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#313338',
        color: '#dbdee1'
      }}
    >
      {/* 1. Barra Lateral de Comunidades e DMs */}
      <Sidebar
        currentGuildName={currentGuildName}
        guilds={guilds}
        selectedGuildId={activeView === 'guild' ? selectedGuildId : null}
        onSelectGuild={(id) => {
          setSelectedDm(null);
          setSelectedGuildId(id);
          setActiveView('guild');
        }}
        onSelectDmHome={() => {
          setSelectedDm(null);
          setActiveView('dm');
        }}
      />

      {/* 2. Área Central (Comunidade ou Amigos/DMs) */}
      {activeView === 'dm' ? (
        <div style={{ flex: 1, display: 'flex' }}>
          {selectedDm?.userId === currentUser.id && selectedDm.service === friendshipService ? (
            <DirectMessageArea
              key={JSON.stringify([currentUser.id, selectedDm.friendId])}
              service={selectedDm.service}
              user={currentUser}
              friendId={selectedDm.friendId}
              friendName={selectedDm.friendName}
              onBack={() => setSelectedDm(null)}
            />
          ) : <FriendsArea
            friends={friends}
            currentUserId={currentUser.id}
            onSendFriendRequest={handleSendFriendRequest}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onOpenDm={(friendId) => {
              if (!friendshipService) return;
              setSelectedDm({ userId: currentUser.id, friendId, friendName: friends.find((friend) => friend.friendId === friendId)?.displayName ?? friendId, service: friendshipService });
            }}
            presenceService={presenceService}
          />}
        </div>
      ) : (
        <>
          {/* Coluna de Canais e Perfil */}
          <aside
            style={{
              width: '240px',
              backgroundColor: '#2b2d31',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <header
              style={{
                height: '48px',
                borderBottom: '1px solid #202225',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                color: '#f2f3f5'
              }}
            >
              {currentGuildName}
            </header>

            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannelId}
              onSelectChannel={(id) => {
                setSelectedChannelId(id);
                const targetChannel = channels.find((channel) => channel.id === id);
                if (targetChannel?.type === 'voice' && currentUser) {
                  if (callController) {
                    callController
                      .joinCall(
                        id,
                        selectedGuildId || 'guild-1',
                        currentUser.id,
                        currentUser.displayName
                      )
                      .then((ok) => {
                        if (ok) setIsInVoiceCall(true);
                      })
                      .catch((err) => console.error('Erro ao conectar em chamada:', err));
                  } else {
                    mediaService.joinCall(currentUser.id, currentUser.displayName).then((ok) => {
                      if (ok) setIsInVoiceCall(true);
                    });
                  }
                }
              }}
            />

            <VoiceControls
              isMuted={isMuted}
              isDeafened={isDeafened}
              isScreenSharing={isScreenSharing}
              isConnected={isInVoiceCall}
              onToggleMute={handleToggleMute}
              onToggleDeafen={handleToggleDeafen}
              onToggleScreenShare={handleToggleScreenShare}
              onDisconnect={handleDisconnectVoice}
            />

            <UserBar user={currentUser} onLogout={handleLogout} />
          </aside>

          {/* Área Principal: Sala de Voz ou Chat */}
          {currentChannel.type === 'voice' ? (
            <VoiceRoomArea
              channel={currentChannel}
              participants={callState.participants}
              activeScreenShareUserId={callState.activeScreenShareUserId}
              currentUserId={currentUser?.id}
              onDisconnect={handleDisconnectVoice}
              onToggleScreenShare={handleToggleScreenShare}
              isScreenSharing={isScreenSharing}
            />
          ) : (
            <ChatArea
              channel={currentChannel}
              messages={messages}
              currentUserId={currentUser?.id}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </>
      )}
    </div>
  );
};
