import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { useUIModalStore } from '../../stores/useUIModalStore';
import { SoundManager } from '../../../core/SoundManager';
import { MetaProgression } from '../../../meta/MetaProgression';
import { AuthManager, type AuthUser } from '../../../auth/AuthManager';
import { RunSaveManager } from '../../../core/RunSaveManager';

export interface MainMenuModalProps {
  onStartSinglePlayer?: () => void;
  onResumeRun?: () => void;
  onOpenCoop?: () => void;
  onOpenShop?: () => void;
  onOpenQuests?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
}

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  onStartSinglePlayer,
  onResumeRun,
  onOpenCoop,
  onOpenShop,
  onOpenQuests,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenAuth
}) => {
  const gameState = useGameStore((s) => s.gameState);
  const activeModal = useUIModalStore((s) => s.activeModal);
  const openModal = useUIModalStore((s) => s.openModal);

  const [crystals, setCrystals] = useState<number>(() => MetaProgression.getInstance().getCrystals());
  const [hasSavedRun, setHasSavedRun] = useState<boolean>(() => RunSaveManager.hasSavedRun());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => AuthManager.getInstance().getUser());

  useEffect(() => {
    const unsubMeta = MetaProgression.getInstance().onChange(() => {
      setCrystals(MetaProgression.getInstance().getCrystals());
    });
    const unsubAuth = AuthManager.getInstance().onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    setHasSavedRun(RunSaveManager.hasSavedRun());

    return () => {
      unsubMeta();
      unsubAuth();
    };
  }, []);

  if (gameState !== 'MAIN_MENU' || (activeModal && activeModal !== 'main_menu')) {
    return null;
  }

  const handleAction = (cb?: () => void) => {
    SoundManager.playButtonClick();
    cb?.();
  };

  return (
    <div
      className="react-main-menu-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.75)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 48px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
    >
      {/* Top Header: Logo, Crystals Pill, Auth Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Game Title */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1
            style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '44px',
              fontWeight: 900,
              color: '#38bdf8',
              letterSpacing: '8px',
              margin: 0,
              textShadow: '0 0 24px rgba(56, 189, 248, 0.6), 0 2px 4px #000'
            }}
          >
            THE RIFT
          </h1>
          <span
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '12px',
              fontWeight: 800,
              color: '#94a3b8',
              letterSpacing: '4px',
              marginTop: '4px'
            }}
          >
            DARK FANTASY ROGUELIKE CO-OP
          </span>
        </div>

        {/* Top Right Pills */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* Crystals Pill */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleAction(onOpenShop)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #a855f7',
              borderRadius: '20px',
              padding: '6px 16px',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.3)'
            }}
          >
            <span style={{ fontSize: '16px' }}>🔮</span>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 800, color: '#e9d5ff' }}>
              {crystals}
            </span>
          </div>

          {/* Auth Profile Pill */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleAction(onOpenAuth || (() => openModal('auth')))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #334155',
              borderRadius: '20px',
              padding: '6px 16px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '16px' }}>👤</span>
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
              {currentUser?.name || 'Гость'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Buttons Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '320px' }}>
        {/* Play / Single Player */}
        <button
          onClick={() => handleAction(onStartSinglePlayer)}
          style={{
            background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 28px',
            color: '#0f172a',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '2px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)',
            transition: 'transform 0.15s ease'
          }}
        >
          ⚔️ В БОЙ
        </button>

        {/* Continue Saved Run */}
        {hasSavedRun && onResumeRun && (
          <button
            onClick={() => handleAction(onResumeRun)}
            style={{
              background: 'linear-gradient(90deg, #059669, #10b981)',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 24px',
              color: '#0f172a',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '1px',
              cursor: 'pointer'
            }}
          >
            💾 ПРОДОЛЖИТЬ ЭКСПЕДИЦИЮ
          </button>
        )}

        {/* Co-op Lobby */}
        <button
          onClick={() => handleAction(onOpenCoop)}
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#f8fafc',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '1px',
            cursor: 'pointer'
          }}
        >
          👥 КООПЕРАТИВ
        </button>

        {/* Shop / Meta Progression */}
        <button
          onClick={() => handleAction(onOpenShop)}
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#f8fafc',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '1px',
            cursor: 'pointer'
          }}
        >
          🔮 ТАЛАНТЫ И МАГАЗИН
        </button>

        {/* Quests / Battle Pass */}
        <button
          onClick={() => handleAction(onOpenQuests)}
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#f8fafc',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '1px',
            cursor: 'pointer'
          }}
        >
          📜 ЗАДАНИЯ И ПРОПУСК
        </button>

        {/* Leaderboard */}
        <button
          onClick={() => handleAction(onOpenLeaderboard)}
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#f8fafc',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '1px',
            cursor: 'pointer'
          }}
        >
          🏆 ТАБЛИЦА ЛИДЕРОВ
        </button>

        {/* Settings */}
        <button
          onClick={() => handleAction(onOpenSettings || (() => openModal('settings')))}
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '12px 24px',
            color: '#94a3b8',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '1px',
            cursor: 'pointer'
          }}
        >
          ⚙️ НАСТРОЙКИ
        </button>
      </div>

      {/* Footer Version Info */}
      <div style={{ color: '#64748b', fontSize: '11px', fontFamily: 'Montserrat, sans-serif' }}>
        v1.0.0 • The Rift Production Engine
      </div>
    </div>
  );
};
