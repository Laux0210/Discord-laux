import React, { useState, useEffect } from 'react';
import type { Channel, Message, User } from '../../common/types';
import type { AuthService, ChatService, MediaService } from './services/types';
import { Sidebar } from './components/Sidebar';
import { ChannelList } from './components/ChannelList';
import { UserBar } from './components/UserBar';
import { ChatArea } from './components/ChatArea';
import { VoiceControls } from './components/VoiceControls';

export interface AppProps {
  authService: AuthService;
  chatService: ChatService;
  mediaService: MediaService;
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
  mediaService
}) => {
  const [currentUser] = useState<User | null>(authService.getCurrentUser());
  const [selectedChannelId, setSelectedChannelId] = useState<string>('chan-general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);

  const currentChannel =
    DEFAULT_CHANNELS.find((c) => c.id === selectedChannelId) ?? DEFAULT_CHANNELS[0];

  useEffect(() => {
    // Carrega mensagens do canal ativo
    chatService.getMessages(selectedChannelId).then(setMessages);

    // Escuta novas mensagens em tempo real
    const unsubscribe = chatService.onNewMessage(selectedChannelId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    return () => {
      unsubscribe();
    };
  }, [chatService, selectedChannelId]);

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
      {/* 1. Barra Lateral de Comunidades */}
      <Sidebar currentGuildName="Comunidade dos Amigos" />

      {/* 2. Coluna de Canais e Perfil */}
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
          Comunidade dos Amigos
        </header>

        <ChannelList
          channels={DEFAULT_CHANNELS}
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

        <UserBar user={currentUser} />
      </aside>

      {/* 3. Área de Chat Principal */}
      <ChatArea
        channel={currentChannel}
        messages={messages}
        currentUserId={currentUser?.id}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
      />
    </div>
  );
};
