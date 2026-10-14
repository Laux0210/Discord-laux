import React, { useState, useEffect } from 'react';
import type { User } from '../../../common/types';
import type { CallController, AudioDevice } from '../../../common/media-types';

export interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser?: (updated: Partial<User>) => void;
  onLogout?: () => void;
  callController?: CallController;
}

type SettingsTab = 'account' | 'profile' | 'voice' | 'appearance';

import { storageService } from '../services/storage-service';

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  callController
}) => {
  const savedSettings = storageService.getSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [displayName, setDisplayName] = useState(user?.displayName ?? 'Amigo Um');
  const [username, setUsername] = useState(user?.username ?? 'amigo-1');
  const [customStatus, setCustomStatus] = useState(savedSettings.customStatus ?? '🎮 Jogando ROBLOX');
  const [pronouns, setPronouns] = useState(savedSettings.pronouns ?? 'ele/dele');
  const [inputVolume, setInputVolume] = useState(savedSettings.inputVolume ?? 85);
  const [outputVolume, setOutputVolume] = useState(savedSettings.outputVolume ?? 100);
  const [inputMode, setInputMode] = useState<'vad' | 'ptt'>(savedSettings.inputMode ?? 'vad');
  const [theme, setTheme] = useState<'dark' | 'light'>(savedSettings.theme ?? 'dark');
  const [compactMode, setCompactMode] = useState(savedSettings.compactMode ?? false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testMicLevel, setTestMicLevel] = useState(0);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState('default');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('default');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Fecha o modal ao pressionar a tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Carrega dispositivos de áudio se disponíveis
  useEffect(() => {
    if (!isOpen || !callController) return;
    callController.getAudioDevices().then((devs) => {
      setDevices(devs);
    }).catch(() => {});
  }, [isOpen, callController]);

  // Teste de microfone em tempo real usando Web Audio API
  useEffect(() => {
    if (!isTestingMic) {
      setTestMicLevel(0);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let intervalId: any = null;

    if (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((s) => {
          stream = s;
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
            const source = audioCtx.createMediaStreamSource(s);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            intervalId = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / (dataArray.length || 1);
              setTestMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            }, 60);
          }
        })
        .catch(() => {
          setIsTestingMic(false);
        });
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) {
        try { audioCtx.close(); } catch {}
      }
    };
  }, [isTestingMic]);

  if (!isOpen) return null;

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser) {
      onUpdateUser({ displayName, username });
    }
    storageService.saveSettings({
      customStatus,
      pronouns,
      inputVolume,
      outputVolume,
      inputMode,
      theme,
      compactMode
    });
    setSaveFeedback('Alterações salvas com sucesso!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const inputDevices = devices.filter((d) => d.kind === 'audioinput');
  const outputDevices = devices.filter((d) => d.kind === 'audiooutput');

  return (
    <div
      data-testid="user-settings-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#313338',
        zIndex: 9999,
        display: 'flex',
        color: '#dbdee1',
        userSelect: 'none'
      }}
    >
      {/* 1. Barra Lateral de Configurações (Esquerda) */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#2b2d31',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          padding: '40px 16px 20px 20px',
          borderRight: '1px solid #1f2023',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ width: '190px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Categoria: Configurações de Usuário */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#949ba4',
              textTransform: 'uppercase',
              marginBottom: '6px',
              paddingLeft: '10px'
            }}
          >
            Configurações de Usuário
          </div>

          <button
            data-testid="settings-tab-account"
            onClick={() => setActiveTab('account')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'account' ? '#404249' : 'transparent',
              color: activeTab === 'account' ? '#ffffff' : '#b5bac1',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span>Minha Conta</span>
          </button>

          <button
            data-testid="settings-tab-profile"
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'profile' ? '#404249' : 'transparent',
              color: activeTab === 'profile' ? '#ffffff' : '#b5bac1',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span>Perfil do Usuário</span>
          </button>

          {/* Divisor */}
          <div style={{ height: '1px', backgroundColor: '#3f4147', margin: '10px 0' }} />

          {/* Categoria: Configurações do Aplicativo */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#949ba4',
              textTransform: 'uppercase',
              marginBottom: '6px',
              paddingLeft: '10px'
            }}
          >
            Configurações do Aplicativo
          </div>

          <button
            data-testid="settings-tab-voice"
            onClick={() => setActiveTab('voice')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'voice' ? '#404249' : 'transparent',
              color: activeTab === 'voice' ? '#ffffff' : '#b5bac1',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span>Voz e Vídeo</span>
          </button>

          <button
            data-testid="settings-tab-appearance"
            onClick={() => setActiveTab('appearance')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'appearance' ? '#404249' : 'transparent',
              color: activeTab === 'appearance' ? '#ffffff' : '#b5bac1',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span>Aparência</span>
          </button>

          {/* Divisor Final */}
          <div style={{ height: '1px', backgroundColor: '#3f4147', margin: '14px 0' }} />

          {/* Botão Sair da Conta (Logout) */}
          {onLogout && (
            <button
              data-testid="btn-logout"
              onClick={() => {
                onClose();
                onLogout();
              }}
              title="Sair da sua conta"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#da373c',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.15s ease'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sair da Conta</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. Área Central de Conteúdo e Botão Fechar ESC */}
      <main
        style={{
          flex: 1,
          padding: '40px 60px',
          overflowY: 'auto',
          maxWidth: '800px',
          position: 'relative'
        }}
      >
        {/* Botão Circular Fechar ESC (Estilo Oficial Discord) */}
        <div
          style={{
            position: 'fixed',
            top: '40px',
            right: 'calc(50vw - 420px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={onClose}
        >
          <button
            data-testid="btn-close-settings"
            onClick={onClose}
            title="Fechar configurações (Esc)"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '2px solid #b5bac1',
              backgroundColor: 'transparent',
              color: '#b5bac1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span style={{ fontSize: '11px', color: '#b5bac1', marginTop: '4px', fontWeight: 'bold' }}>ESC</span>
        </div>

        {/* ==================== ABA 1: MINHA CONTA ==================== */}
        {activeTab === 'account' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', marginBottom: '20px' }}>
              Minha Conta
            </h2>

            {/* Banner e Cartão de Perfil */}
            <div
              style={{
                backgroundColor: '#1e1f22',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '24px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
              }}
            >
              {/* Banner do Discord */}
              <div style={{ height: '100px', backgroundColor: '#5865f2' }} />

              <div style={{ padding: '0 20px 20px', position: 'relative' }}>
                {/* Avatar */}
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#2b2d31',
                    border: '6px solid #1e1f22',
                    marginTop: '-40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    position: 'relative'
                  }}
                >
                  {displayName.substring(0, 2).toUpperCase()}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#23a55a',
                      border: '3px solid #1e1f22'
                    }}
                  />
                </div>

                {/* Detalhes do Perfil */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#949ba4' }}>
                    @{username}
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Edição de Informações */}
            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Nome de Exibição
                </label>
                <input
                  data-testid="input-settings-displayname"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Nome de Usuário
                </label>
                <input
                  data-testid="input-settings-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  E-mail
                </label>
                <input
                  type="email"
                  disabled
                  value={`${username}@discord.local`}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#949ba4',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#5865f2',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salvar Alterações
                </button>
                {saveFeedback && (
                  <span style={{ fontSize: '13px', color: '#23a55a', fontWeight: 'bold' }}>
                    ✓ {saveFeedback}
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ==================== ABA 2: PERFIL DO USUÁRIO ==================== */}
        {activeTab === 'profile' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', marginBottom: '20px' }}>
              Perfil de Usuário
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Status Personalizado / Atividade
                </label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="Ex: 🎮 Jogando ROBLOX, Ouvindo música..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#949ba4', marginTop: '4px', display: 'block' }}>
                  Exibido na sua presença de amigos e no painel &quot;Ativo Agora&quot;.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Pronomes
                </label>
                <input
                  type="text"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Sobre Mim
                </label>
                <textarea
                  rows={3}
                  defaultValue="Membro oficial da Comunidade dos Amigos. Adoro jogar e compartilhar telas no Discord!"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== ABA 3: VOZ E VÍDEO ==================== */}
        {activeTab === 'voice' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', marginBottom: '20px' }}>
              Configurações de Voz
            </h2>

            {/* Seleção de Dispositivos de Entrada e Saída */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Dispositivo de Entrada
                </label>
                <select
                  value={selectedInputDevice}
                  onChange={(e) => setSelectedInputDevice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="default">Microfone Padrão do Sistema</option>
                  {inputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Dispositivo de Saída
                </label>
                <select
                  value={selectedOutputDevice}
                  onChange={(e) => setSelectedOutputDevice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1f22',
                    border: '1px solid #232428',
                    borderRadius: '4px',
                    color: '#f2f3f5',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="default">Alto-falantes / Fone Padrão do Sistema</option>
                  {outputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controles Deslizantes de Volume */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                    Volume de Entrada
                  </label>
                  <span style={{ fontSize: '12px', color: '#949ba4' }}>{inputVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={inputVolume}
                  onChange={(e) => setInputVolume(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#5865f2', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase' }}>
                    Volume de Saída
                  </label>
                  <span style={{ fontSize: '12px', color: '#949ba4' }}>{outputVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={outputVolume}
                  onChange={(e) => setOutputVolume(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#5865f2', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Teste de Microfone estilo Discord ("Vamos verificar") */}
            <div
              style={{
                backgroundColor: '#2b2d31',
                padding: '16px 20px',
                borderRadius: '8px',
                marginBottom: '28px',
                border: '1px solid #35373c'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f2f3f5', marginBottom: '4px' }}>
                Teste de Microfone
              </div>
              <p style={{ fontSize: '12px', color: '#949ba4', marginBottom: '14px' }}>
                Está com problemas no microfone? Clique abaixo para testar seu áudio e verificar a sensibilidade de fala.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  type="button"
                  data-testid="btn-test-mic"
                  onClick={() => setIsTestingMic(!isTestingMic)}
                  style={{
                    backgroundColor: isTestingMic ? '#da373c' : '#5865f2',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isTestingMic ? 'Parar Teste' : 'Vamos verificar'}
                </button>

                {/* Barra VU Meter de Nível em Tempo Real */}
                <div
                  style={{
                    flex: 1,
                    height: '14px',
                    backgroundColor: '#1e1f22',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${testMicLevel}%`,
                      backgroundColor: testMicLevel > 70 ? '#da373c' : testMicLevel > 20 ? '#23a55a' : '#5865f2',
                      transition: 'width 0.08s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', color: '#949ba4', width: '35px', textAlign: 'right' }}>
                  {testMicLevel}%
                </span>
              </div>
            </div>

            {/* Modo de Entrada */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '12px' }}>
                Modo de Entrada
              </label>

              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="inputMode"
                    checked={inputMode === 'vad'}
                    onChange={() => setInputMode('vad')}
                    style={{ accentColor: '#5865f2' }}
                  />
                  <span>Detecção de Voz (VAD automática)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="inputMode"
                    checked={inputMode === 'ptt'}
                    onChange={() => setInputMode('ptt')}
                    style={{ accentColor: '#5865f2' }}
                  />
                  <span>Pressionar para Falar (PTT)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ABA 4: APARÊNCIA ==================== */}
        {activeTab === 'appearance' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', marginBottom: '20px' }}>
              Aparência
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '12px' }}>
                Tema
              </label>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  onClick={() => setTheme('dark')}
                  style={{
                    flex: 1,
                    backgroundColor: '#1e1f22',
                    padding: '16px',
                    borderRadius: '8px',
                    border: theme === 'dark' ? '2px solid #5865f2' : '1px solid #2b2d31',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#f2f3f5', marginBottom: '4px' }}>Escuro (Padrão)</div>
                  <div style={{ fontSize: '12px', color: '#949ba4' }}>Visual original e imersivo do Discord.</div>
                </div>

                <div
                  onClick={() => setTheme('light')}
                  style={{
                    flex: 1,
                    backgroundColor: '#2b2d31',
                    padding: '16px',
                    borderRadius: '8px',
                    border: theme === 'light' ? '2px solid #5865f2' : '1px solid #35373c',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#f2f3f5', marginBottom: '4px' }}>Claro</div>
                  <div style={{ fontSize: '12px', color: '#949ba4' }}>Tema de alto contraste luminoso.</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#b5bac1', textTransform: 'uppercase', marginBottom: '12px' }}>
                Exibição de Mensagens
              </label>

              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="compactMode"
                    checked={!compactMode}
                    onChange={() => setCompactMode(false)}
                    style={{ accentColor: '#5865f2' }}
                  />
                  <span>Confortável (Com avatares e espaçamento amplo)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="compactMode"
                    checked={compactMode}
                    onChange={() => setCompactMode(true)}
                    style={{ accentColor: '#5865f2' }}
                  />
                  <span>Compacto (Linhas densas para leitura rápida)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
