import React from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useUIModalStore } from '../../stores/useUIModalStore';
import { SoundManager } from '../../../core/SoundManager';

export interface GameOverModalProps {
  onRestart?: () => void;
  onReturnToMenu?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  onRestart,
  onReturnToMenu
}) => {
  const gameState = useGameStore((s) => s.gameState);
  const isVictory = useGameStore((s) => s.isVictory);
  const gameTime = useGameStore((s) => s.gameTime);
  const kills = usePlayerStore((s) => s.kills);
  const level = usePlayerStore((s) => s.level);
  const credits = usePlayerStore((s) => s.credits);
  const closeModal = useUIModalStore((s) => s.closeModal);

  if (gameState !== 'GAME_OVER') {
    return null;
  }

  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleRestart = () => {
    SoundManager.playButtonClick();
    closeModal('game_over');
    onRestart?.();
  };

  const handleReturnToMenu = () => {
    SoundManager.playButtonClick();
    closeModal('game_over');
    onReturnToMenu?.();
  };

  return (
    <div
      className="react-modal-backdrop game-over-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #1e293b, #0f172a)',
          border: `2px solid ${isVictory ? '#10b981' : '#ef4444'}`,
          borderRadius: '16px',
          padding: '36px 44px',
          width: 'min(500px, 90vw)',
          textAlign: 'center',
          boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 30px ${isVictory ? '#10b98133' : '#ef444433'}`
        }}
      >
        <h2
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '36px',
            fontWeight: 900,
            color: isVictory ? '#34d399' : '#f87171',
            letterSpacing: '4px',
            margin: '0 0 12px 0',
            textShadow: `0 0 16px ${isVictory ? 'rgba(52, 211, 153, 0.6)' : 'rgba(248, 113, 113, 0.6)'}`
          }}
        >
          {isVictory ? 'РАЗЛОМ ПОКОРЁН!' : 'ВЫ ПОГИБЛИ'}
        </h2>

        <p style={{ color: '#94a3b8', fontSize: '14px', fontFamily: 'Montserrat, sans-serif', margin: '0 0 24px 0' }}>
          {isVictory
            ? 'Портал стабилизирован, силы тьмы отступили!'
            : 'Тьма поглотила вашу душу, но ваши достижения сохранены.'}
        </p>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '28px',
            textAlign: 'left'
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Время выживания</span>
            <div style={{ fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>{timeFormatted}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Уничтожено врагов</span>
            <div style={{ fontSize: '18px', color: '#f87171', fontWeight: 800 }}>{kills}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Достигнутый уровень</span>
            <div style={{ fontSize: '18px', color: '#c084fc', fontWeight: 800 }}>Lvl {level}</div>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Собрано кредитов</span>
            <div style={{ fontSize: '18px', color: '#fbbf24', fontWeight: 800 }}>{credits}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px' }}>
          <button
            onClick={handleRestart}
            style={{
              flex: 1,
              padding: '14px',
              background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
              border: 'none',
              borderRadius: '8px',
              color: '#0f172a',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            🔄 ЗАНОВО
          </button>
          <button
            onClick={handleReturnToMenu}
            style={{
              flex: 1,
              padding: '14px',
              background: '#334155',
              border: 'none',
              borderRadius: '8px',
              color: '#f8fafc',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            🚪 В МЕНЮ
          </button>
        </div>
      </div>
    </div>
  );
};
