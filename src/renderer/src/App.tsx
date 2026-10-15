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
import { UserSettingsModal } from './components/UserSettingsModal';
import { soundEffects } from './services/sound-effects';
import { voiceMediaService } from './services/voice-media-service';
import { realtimeNetworkService } from './services/realtime-network-service';
import { storageService } from './services/storage-service';



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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);



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

  // Inicializa sincronização em tempo real multi-aparelho (MQTT WSS + PeerJS WebRTC)
  useEffect(() => {
    if (currentUser && chatService && callController && presenceService) {
      realtimeNetworkService.init(
        currentUser,
        chatService as any,
        callController,
        presenceService as any
      );
    }
  }, [currentUser?.id, chatService, callController, presenceService]);

  // Escuta streams de tela remota vindas de outros aparelhos
  useEffect(() => {
    const unsub = realtimeNetworkService.onRemoteScreenStream((stream) => {
      if (stream) {
        setScreenStream(stream);
        setIsScreenSharing(true);
      } else {
        setScreenStream(null);
        setIsScreenSharing(false);
      }
    });
    return unsub;
  }, []);

  // Inicia ou encerra captura real do microfone e detecção de fala (VAD)
  useEffect(() => {
    if (isInVoiceCall && currentUser) {
      voiceMediaService
        .startMicrophone((speaking) => {
          setIsSpeaking(speaking);
          realtimeNetworkService.broadcastSpeaking(callState.channelId || selectedChannelId, currentUser.id, speaking);
          if (callController?.setSpeaking) {
            callController.setSpeaking(currentUser.id, speaking);
          } else {
            setCallState((prev) => ({
              ...prev,
              participants: prev.participants.map((p) =>
                p.userId === currentUser.id ? { ...p, isSpeaking: speaking } : p
              )
            }));
          }
        })
        .catch((err) => console.warn('Microfone não iniciado:', err));
    } else {
      voiceMediaService.stopMicrophone();
      setIsSpeaking(false);
    }
    return () => {
      voiceMediaService.stopMicrophone();
    };
  }, [isInVoiceCall, currentUser?.id, callController, callState.channelId, selectedChannelId]);

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
      let user: User | null = null;
      if ('loginWithGoogle' in authService && typeof (authService as any).loginWithGoogle === 'function') {
        user = await (authService as any).loginWithGoogle();
      } else if ('initiateLogin' in authService) {
        user = await (authService as any).login({ provider: 'google' });
      } else {
        user = await authService.login('google-user');
      }
      if (user) setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Falha na autenticação Google');
    }
  };

  const handleLoginCredentials = async (
    email: string,
    password: string,
    isSignUp?: boolean,
    displayName?: string
  ) => {
    try {
      setAuthError(null);
      let user: User | null = null;
      if ('loginWithCredentials' in authService && typeof (authService as any).loginWithCredentials === 'function') {
        user = await (authService as any).loginWithCredentials(email, password, isSignUp, displayName);
      } else if ('initiateLogin' in authService) {
        user = await (authService as any).login({
          provider: 'credentials',
          email,
          password,
          isSignUp,
          displayName
        });
      } else {
        user = await authService.login(email.split('@')[0]);
      }
      if (user) setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Falha ao autenticar com e-mail e senha');
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
    const msg = await chatService.sendMessage({
      channelId: selectedChannelId,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      content
    });
    realtimeNetworkService.broadcastChatMessage(selectedChannelId, msg);
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
    voiceMediaService.setMute(next);
    if (next) {
      soundEffects.playMute();
    } else {
      soundEffects.playUnmute();
    }
    try {
      if (isInVoiceCall) {
        if (callController) {
          await callController.setMute(currentUser.id, next);
        } else {
          await mediaService.setMute(currentUser.id, next);
        }
      }
    } catch (err) {
      console.warn('Erro ao alternar mudo:', err);
    }
  };

  const handleToggleDeafen = async () => {
    if (!currentUser) return;
    const next = !isDeafened;
    setIsDeafened(next);
    if (next) {
      setIsMuted(true);
      voiceMediaService.setMute(true);
      soundEffects.playDeafen();
    } else {
      soundEffects.playUndeafen();
    }
    try {
      if (isInVoiceCall) {
        if (callController) {
          await callController.setDeafen(currentUser.id, next);
        } else {
          await mediaService.setDeafen(currentUser.id, next);
        }
      }
    } catch (err) {
      console.warn('Erro ao alternar ensurdecer:', err);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!currentUser) return;
    const currentChan = callState.channelId || selectedChannelId || 'chan-voice-main';
    if (isScreenSharing) {
      soundEffects.playScreenShareStop();
      voiceMediaService.stopScreenShare();
      setScreenStream(null);
      realtimeNetworkService.broadcastScreenShareStop(currentChan, currentUser.id);
      if (callController) {
        await callController.stopScreenShare(currentUser.id);
      } else {
        await mediaService.stopScreenShare(currentUser.id);
      }
      setIsScreenSharing(false);
    } else {
      let ok = false;
      // Garante entrada no canal de voz se não estiver conectado
      const targetChannelId = callState.channelId || selectedChannelId || channels.find((c) => c.type === 'voice')?.id || 'chan-voice-main';
      const targetGuildId = callState.guildId || selectedGuildId || 'guild-1';

      if (!isInVoiceCall) {
        setSelectedChannelId(targetChannelId);
        soundEffects.playVoiceConnect();
        realtimeNetworkService.joinVoiceChannel(targetChannelId, targetGuildId, currentUser);
        if (callController) {
          await callController.joinCall(
            targetChannelId,
            targetGuildId,
            currentUser.id,
            currentUser.displayName
          );
        } else {
          await mediaService.joinCall(currentUser.id, currentUser.displayName);
        }
        setIsInVoiceCall(true);
      }

      voiceMediaService
        .startScreenShare(() => {
          handleToggleScreenShare();
        })
        .then((stream) => {
          if (stream) {
            setScreenStream(stream);
            realtimeNetworkService.broadcastScreenShareStart(targetChannelId, currentUser.id, stream);
          }
        })
        .catch((err) => {
          console.warn('Captura de tela real via getDisplayMedia:', err);
        });

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
        soundEffects.playScreenShareStart();
      }
    }
  };

  const handleSimulateFriendJoin = async () => {
    if (!callController) return;
    const targetChannelId = callState.channelId || selectedChannelId || channels.find((c) => c.type === 'voice')?.id || 'chan-voice-main';
    const targetGuildId = callState.guildId || selectedGuildId || 'guild-1';
    const hasFriend2 = callState.participants.some((p) => p.userId === 'user-2');
    const hasFriend3 = callState.participants.some((p) => p.userId === 'user-3');

    try {
      if (!hasFriend2) {
        await callController.joinCall(targetChannelId, targetGuildId, 'user-2', 'Amigo Dois');
      } else if (!hasFriend3) {
        await callController.joinCall(targetChannelId, targetGuildId, 'user-3', 'Amigo Três');
      } else {
        if (callState.activeScreenShareUserId === 'user-2') {
          await callController.stopScreenShare('user-2');
        } else if (!callState.activeScreenShareUserId) {
          await callController.startScreenShare('user-2');
        } else {
          await callController.leaveCall('user-3');
        }
      }
    } catch (err) {
      console.error('Falha ao simular amigo na chamada:', err);
    }
  };

  const handleDisconnectVoice = async () => {
    if (!currentUser) return;
    soundEffects.playVoiceDisconnect();
    voiceMediaService.stopMicrophone();
    voiceMediaService.stopScreenShare();
    setScreenStream(null);
    setIsSpeaking(false);
    realtimeNetworkService.leaveVoiceChannel(callState.channelId || selectedChannelId, currentUser.id);
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
        onLoginCredentials={handleLoginCredentials}
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
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Barra Lateral de Mensagens Diretas (240px estilo Discord canônico) */}
          <aside
            style={{
              width: '240px',
              backgroundColor: '#2b2d31',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0
            }}
          >
            {/* Campo de Busca Superior */}
            <div style={{ height: '48px', borderBottom: '1px solid #202225', padding: '0 10px', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: '#1e1f22',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#949ba4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔍</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Encontre ou comece...</span>
              </div>
            </div>

            {/* Lista de Navegação e DMs */}
            <div style={{ flex: 1, padding: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                data-testid="nav-friends-home"
                onClick={() => setSelectedDm(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: selectedDm === null ? '#404249' : 'transparent',
                  color: selectedDm === null ? '#ffffff' : '#949ba4',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  width: '100%',
                  textAlign: 'left'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <span>Amigos</span>
              </button>

              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#949ba4', textTransform: 'uppercase', marginTop: '12px', marginBottom: '4px', padding: '0 8px' }}>
                Mensagens Diretas
              </div>

              {friends.map((friend) => {
                const isSelected = selectedDm?.friendId === friend.friendId;
                const presence = presenceService ? presenceService.getPresence(friend.friendId) : 'online';
                return (
                  <div
                    key={friend.friendId}
                    data-testid={`dm-sidebar-item-${friend.friendId}`}
                    onClick={() => {
                      if (!friendshipService) return;
                      setSelectedDm({
                        userId: currentUser.id,
                        friendId: friend.friendId,
                        friendName: friend.displayName,
                        service: friendshipService
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#404249' : 'transparent',
                      color: isSelected ? '#ffffff' : '#949ba4',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#5865f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        position: 'relative',
                        flexShrink: 0
                      }}
                    >
                      {friend.displayName.substring(0, 2).toUpperCase()}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: presence === 'online' ? '#23a55a' : presence === 'idle' ? '#f0b232' : '#80848e',
                          border: '2px solid #2b2d31'
                        }}
                      />
                    </div>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {friend.displayName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Controles de Voz (se em chamada) e UserBar */}
            <VoiceControls
              isMuted={isMuted}
              isDeafened={isDeafened}
              isScreenSharing={isScreenSharing}
              isConnected={isInVoiceCall}
              channelName={channels.find((c) => c.id === (callState.channelId || selectedChannelId))?.name || 'Voz Principal'}
              onToggleMute={handleToggleMute}
              onToggleDeafen={handleToggleDeafen}
              onToggleScreenShare={handleToggleScreenShare}
              onDisconnect={handleDisconnectVoice}
            />

            <UserBar
              user={currentUser}
              onLogout={handleLogout}
              onOpenSettings={() => setIsSettingsOpen(true)}
              isMuted={isMuted}
              isDeafened={isDeafened}
              isSpeaking={isSpeaking}
              onToggleMute={handleToggleMute}
              onToggleDeafen={handleToggleDeafen}
            />
          </aside>

          {/* Área Principal: DMs ou Amigos */}
          {selectedDm?.userId === currentUser.id && selectedDm.service === friendshipService ? (
            <DirectMessageArea
              key={JSON.stringify([currentUser.id, selectedDm.friendId])}
              service={selectedDm.service}
              user={currentUser}
              friendId={selectedDm.friendId}
              friendName={selectedDm.friendName}
              onBack={() => setSelectedDm(null)}
            />
          ) : (
            <FriendsArea
              friends={friends}
              currentUserId={currentUser.id}
              onSendFriendRequest={handleSendFriendRequest}
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onOpenDm={(friendId) => {
                if (!friendshipService) return;
                setSelectedDm({
                  userId: currentUser.id,
                  friendId,
                  friendName: friends.find((friend) => friend.friendId === friendId)?.displayName ?? friendId,
                  service: friendshipService
                });
              }}
              presenceService={presenceService}
            />
          )}
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
              voiceParticipants={callState.participants}
              activeVoiceChannelId={callState.channelId}
              onSelectChannel={(id) => {
                setSelectedChannelId(id);
                const targetChannel = channels.find((channel) => channel.id === id);
                if (targetChannel?.type === 'voice' && currentUser) {
                  if (!isInVoiceCall || callState.channelId !== id) {
                    soundEffects.playVoiceConnect();
                  }
                  realtimeNetworkService.joinVoiceChannel(id, selectedGuildId || 'guild-1', currentUser);
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
              channelName={channels.find((c) => c.id === (callState.channelId || selectedChannelId))?.name || 'Voz Principal'}
              onToggleMute={handleToggleMute}
              onToggleDeafen={handleToggleDeafen}
              onToggleScreenShare={handleToggleScreenShare}
              onDisconnect={handleDisconnectVoice}
            />

            <UserBar
              user={currentUser}
              onLogout={handleLogout}
              onOpenSettings={() => setIsSettingsOpen(true)}
              isMuted={isMuted}
              isDeafened={isDeafened}
              isSpeaking={isSpeaking}
              onToggleMute={handleToggleMute}
              onToggleDeafen={handleToggleDeafen}
            />
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
              onSimulateFriendJoin={handleSimulateFriendJoin}
              isScreenSharing={isScreenSharing}
              screenStream={screenStream}
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

      {/* Modal de Configurações de Usuário (Estilo Discord) */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={currentUser}
        onUpdateUser={(updated) => {
          if (currentUser) {
            const updatedUser = { ...currentUser, ...updated };
            setCurrentUser(updatedUser);
            if ('updateProfile' in authService) {
              (authService as any).updateProfile(updated);
            }
            storageService.saveCurrentUser(updatedUser);
          }
        }}
        onLogout={handleLogout}
        callController={callController}
      />
    </div>
  );
};

