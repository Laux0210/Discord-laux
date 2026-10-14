import React, { useState, useEffect } from 'react';
import type { Channel, Guild, Message, User } from '../../common/types';
import type { AuthService as LegacyAuthService, ChatService, MediaService } from './services/types';
import type { AuthService as ModernAuthService } from '../../common/auth-types';
import type { GuildService } from '../../common/guild-types';
import type { FriendshipService, PresenceService } from '../../common/text-types';
import { Sidebar } from './components/Sidebar';
import { ChannelList } from './components/ChannelList';
import { UserBar } from './components/UserBar';
import { ChatArea } from './components/ChatArea';
import { VoiceControls } from './components/VoiceControls';
import { LoginModal } from './components/LoginModal';
import { FriendsArea, type FriendEntry } from './components/FriendsArea';

export interface AppProps {
  authService: LegacyAuthService | ModernAuthService;
  chatService: ChatService;
  mediaService: MediaService;
  guildService?: GuildService;
  friendshipService?: FriendshipService;
  presenceService?: PresenceService;
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
  guildService,
  friendshipService,
  presenceService
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [activeView, setActiveView] = useState<'guild' | 'dm'>('guild');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('chan-general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
      const user = await authService.login({ provider: 'mock', mockUsername: 'amigo-1' } as any);
      if (user) setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Falha na autenticação Google');
    }
  };

  const handleLoginMock = async (username: string) => {
    try {
      setAuthError(null);
      let user: User | null = null;
      if ('login' in authService) {
        user = await (authService as any).login(
          typeof (authService as any).login.length === 'number' && (authService as any).login.length === 1
            ? username
            : { provider: 'mock', mockUsername: username }
        );
      }
      if (user) setCurrentUser(user);
    } catch (err: any) {
      setAuthError(err?.message || 'Falha ao autenticar usuário');
    }
  };

  const handleLogout = async () => {
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
    await mediaService.setMute(currentUser.id, next);
  };

  const handleToggleDeafen = async () => {
    if (!currentUser) return;
    const next = !isDeafened;
    setIsDeafened(next);
    if (next) setIsMuted(true);
    await mediaService.setDeafen(currentUser.id, next);
  };

  const handleToggleScreenShare = async () => {
    if (!currentUser) return;
    if (isScreenSharing) {
      await mediaService.stopScreenShare(currentUser.id);
      setIsScreenSharing(false);
    } else {
      const ok = await mediaService.startScreenShare(currentUser.id);
      if (ok) {
        setIsScreenSharing(true);
      }
    }
  };

  const handleDisconnectVoice = async () => {
    if (!currentUser) return;
    await mediaService.leaveCall(currentUser.id);
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
          setSelectedGuildId(id);
          setActiveView('guild');
        }}
        onSelectDmHome={() => {
          setActiveView('dm');
        }}
      />

      {/* 2. Área Central (Comunidade ou Amigos/DMs) */}
      {activeView === 'dm' ? (
        <div style={{ flex: 1, display: 'flex' }}>
          <FriendsArea
            friends={friends}
            currentUserId={currentUser.id}
            onSendFriendRequest={handleSendFriendRequest}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onOpenDm={(_friendId) => {}}
            presenceService={presenceService}
          />
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
                if (id === 'chan-voice-main' && currentUser) {
                  mediaService.joinCall(currentUser.id, currentUser.displayName).then((ok) => {
                    if (ok) setIsInVoiceCall(true);
                  });
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

          {/* Área de Chat Principal do Canal */}
          <ChatArea
            channel={currentChannel}
            messages={messages}
            currentUserId={currentUser?.id}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </>
      )}
    </div>
  );
};
