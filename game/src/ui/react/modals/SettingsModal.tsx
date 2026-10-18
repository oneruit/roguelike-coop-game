import React, { useState } from 'react';
import { useUIModalStore } from '../../stores/useUIModalStore';
import { SoundManager } from '../../../core/SoundManager';

export interface SettingsModalProps {
  onShadowQualityChange?: (quality: number) => void;
  onTimeOfDayChange?: (mode: 'day' | 'night') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onShadowQualityChange,
  onTimeOfDayChange
}) => {
  const activeModal = useUIModalStore((s) => s.activeModal);
  const closeModal = useUIModalStore((s) => s.closeModal);

  const [shadowQuality, setShadowQuality] = useState<number>(() => {
    return parseInt(localStorage.getItem('rift_shadow_quality') || '1024', 10);
  });
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>(() => {
    return (localStorage.getItem('settings_time_of_day') as 'day' | 'night') || 'day';
  });

  if (activeModal !== 'settings') {
    return null;
  }

  const handleClose = () => {
    SoundManager.playButtonClick();
    closeModal('settings');
  };

  const handleShadowChange = (val: number) => {
    setShadowQuality(val);
    localStorage.setItem('rift_shadow_quality', String(val));
    onShadowQualityChange?.(val);
  };

  const handleTimeChange = (mode: 'day' | 'night') => {
    setTimeOfDay(mode);
    localStorage.setItem('settings_time_of_day', mode);
    onTimeOfDayChange?.(mode);
  };

  return (
    <div
      className="react-modal-backdrop settings-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 50,
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
          border: '1px solid #475569',
          borderRadius: '12px',
          padding: '28px 32px',
          width: 'min(480px, 90vw)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '24px', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
            НАСТРОЙКИ
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              fontWeight: 800
            }}
          >
            ✕
          </button>
        </div>

        {/* Graphics: Shadows */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            Качество теней
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Выкл', val: 0 },
              { label: 'Низкое', val: 512 },
              { label: 'Среднее', val: 1024 },
              { label: 'Высокое', val: 2048 }
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => handleShadowChange(item.val)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: shadowQuality === item.val ? '1px solid #38bdf8' : '1px solid #334155',
                  background: shadowQuality === item.val ? '#0284c7' : '#1e293b',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time of Day */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            Время суток
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: '☀️ День', val: 'day' as const },
              { label: '🌙 Ночь', val: 'night' as const }
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => handleTimeChange(item.val)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: timeOfDay === item.val ? '1px solid #f59e0b' : '1px solid #334155',
                  background: timeOfDay === item.val ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
            border: 'none',
            borderRadius: '6px',
            color: '#0f172a',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          СОХРАНИТЬ И ЗАКРЫТЬ
        </button>
      </div>
    </div>
  );
};
