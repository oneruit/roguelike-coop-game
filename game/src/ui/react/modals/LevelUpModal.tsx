import React, { useEffect } from 'react';
import { useUIModalStore, type LevelUpOption } from '../../stores/useUIModalStore';
import { SoundManager } from '../../../core/SoundManager';

export interface LevelUpModalProps {
  onSelectOption?: (option: LevelUpOption) => void;
  onReroll?: () => void;
  canReroll?: boolean;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  onSelectOption,
  onReroll,
  canReroll = false
}) => {
  const isLevelUpOpen = useUIModalStore((s) => s.isLevelUpOpen);
  const choices = useUIModalStore((s) => s.levelUpChoices);
  const closeLevelUp = useUIModalStore((s) => s.closeLevelUp);

  useEffect(() => {
    if (!isLevelUpOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && choices[0]) {
        handleSelect(choices[0]);
      } else if (e.key === '2' && choices[1]) {
        handleSelect(choices[1]);
      } else if (e.key === '3' && choices[2]) {
        handleSelect(choices[2]);
      } else if ((e.key === 'r' || e.key === 'R') && canReroll && onReroll) {
        SoundManager.playButtonClick();
        onReroll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLevelUpOpen, choices, canReroll, onReroll]);

  if (!isLevelUpOpen || choices.length === 0) {
    return null;
  }

  const handleSelect = (option: LevelUpOption) => {
    SoundManager.playButtonClick();
    closeLevelUp();
    onSelectOption?.(option);
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary':
        return '#f59e0b';
      case 'epic':
        return '#a855f7';
      case 'rare':
        return '#38bdf8';
      default:
        return '#94a3b8';
    }
  };

  return (
    <div
      className="react-modal-backdrop level-up-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.82)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h2
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '32px',
            fontWeight: 900,
            color: '#f8fafc',
            letterSpacing: '4px',
            margin: '0 0 6px 0',
            textShadow: '0 0 16px rgba(168, 85, 247, 0.6)'
          }}
        >
          НОВЫЙ УРОВЕНЬ
        </h2>
        <span
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            color: '#a855f7',
            letterSpacing: '2px'
          }}
        >
          ВЫБЕРИТЕ УЛУЧШЕНИЕ
        </span>
      </div>

      {/* Cards Row */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          maxWidth: '1040px',
          width: '90%',
          justifyContent: 'center'
        }}
      >
        {choices.map((option, index) => {
          const borderColor = getRarityColor(option.rarity);
          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(option)}
              style={{
                flex: '1 1 280px',
                maxWidth: '320px',
                background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
                border: `2px solid ${borderColor}`,
                borderRadius: '12px',
                padding: '24px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${borderColor}33`,
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 14px 32px rgba(0, 0, 0, 0.8), 0 0 20px ${borderColor}88`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${borderColor}33`;
              }}
            >
              {/* Hotkey Tag */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'rgba(51, 65, 85, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 900,
                  color: '#cbd5e1'
                }}
              >
                {index + 1}
              </div>

              {/* Icon */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}
              >
                {option.icon ? (
                  <img src={option.icon} alt={option.name} style={{ width: '48px', height: '48px' }} />
                ) : (
                  <span style={{ fontSize: '28px' }}>⚔️</span>
                )}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  margin: '0 0 6px 0',
                  textAlign: 'center'
                }}
              >
                {option.name}
              </h3>

              {/* Rarity / Type Tag */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color: borderColor,
                  marginBottom: '14px',
                  textTransform: 'uppercase'
                }}
              >
                {option.rarity || option.type}
              </span>

              {/* Description */}
              <p
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '13px',
                  color: '#94a3b8',
                  lineHeight: '1.5',
                  textAlign: 'center',
                  margin: 0
                }}
              >
                {option.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reroll Button (if allowed) */}
      {canReroll && onReroll && (
        <button
          onClick={() => {
            SoundManager.playButtonClick();
            onReroll();
          }}
          style={{
            marginTop: '28px',
            background: 'linear-gradient(180deg, #334155, #1e293b)',
            border: '1px solid #64748b',
            borderRadius: '8px',
            padding: '10px 24px',
            color: '#f8fafc',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          🎲 СМЕНИТЬ ВАРИАНТЫ (R)
        </button>
      )}
    </div>
  );
};
