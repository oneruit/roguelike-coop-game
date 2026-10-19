import React from 'react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { useGameStore } from '../../stores/useGameStore';

export const HUDOverlay: React.FC = () => {
  const hp = usePlayerStore((s) => s.hp);
  const maxHp = usePlayerStore((s) => s.maxHp);
  const shield = usePlayerStore((s) => s.shield);
  const maxShield = usePlayerStore((s) => s.maxShield);
  const xp = usePlayerStore((s) => s.xp);
  const maxXp = usePlayerStore((s) => s.maxXp);
  const level = usePlayerStore((s) => s.level);
  const credits = usePlayerStore((s) => s.credits);
  const kills = usePlayerStore((s) => s.kills);
  const activeBoss = usePlayerStore((s) => s.activeBoss);
  const interactionPrompt = usePlayerStore((s) => s.interactionPrompt);
  const damageFlashAmount = usePlayerStore((s) => s.damageFlashAmount);
  const weapons = usePlayerStore((s) => s.weapons);

  const gameTime = useGameStore((s) => s.gameTime);
  const gameState = useGameStore((s) => s.gameState);

  if (gameState !== 'PLAYING' && gameState !== 'PAUSED') {
    return null;
  }

  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
  const shieldPercent = maxShield > 0 ? Math.max(0, Math.min(100, (shield / maxShield) * 100)) : 0;
  const xpPercent = maxXp > 0 ? Math.max(0, Math.min(100, (xp / maxXp) * 100)) : 0;

  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="react-hud-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 25,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none'
      }}
    >
      {/* Damage Flash Vignette */}
      {damageFlashAmount > 0 && (
        <div
          className="hud-damage-flash"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(239, 68, 68, 0.25)',
            transition: 'opacity 0.2s ease-out',
            pointerEvents: 'none',
            zIndex: 100
          }}
        />
      )}

      {/* Top Header: Timer, Kills, Credits */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Left: Vitals (HP & Shield) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
          {/* Health Bar */}
          <div style={{ position: 'relative', width: '220px', height: '20px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #7f1d1d', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${hpPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                transition: 'width 0.1s linear'
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'Montserrat, sans-serif',
                textShadow: '0 1px 2px #000'
              }}
            >
              {Math.ceil(hp)} / {maxHp}
            </span>
          </div>

          {/* Shield Bar (if maxShield > 0) */}
          {maxShield > 0 && (
            <div style={{ position: 'relative', width: '220px', height: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #0369a1', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${shieldPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  transition: 'width 0.1s linear'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#e0f2fe',
                  fontFamily: 'Montserrat, sans-serif'
                }}
              >
                {Math.ceil(shield)} / {maxShield}
              </span>
            </div>
          )}

          {/* Active Weapons Row */}
          {weapons.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              {weapons.map((w) => (
                <div
                  key={w.id}
                  title={`${w.name} (Lvl ${w.level})`}
                  style={{
                    width: '28px',
                    height: '28px',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  {w.icon && <img src={w.icon} alt={w.name} style={{ width: '20px', height: '20px' }} />}
                  <span style={{ position: 'absolute', bottom: '1px', right: '2px', fontSize: '9px', color: '#38bdf8', fontWeight: 900 }}>
                    {w.level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: Boss Bar or Game Timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {activeBoss ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '380px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#f87171', letterSpacing: '2px', fontFamily: 'Cinzel, serif', textShadow: '0 0 8px rgba(239,68,68,0.8)' }}>
                {activeBoss.name.toUpperCase()}
              </span>
              <div style={{ width: '100%', height: '14px', background: '#1c1917', border: '1px solid #991b1b', borderRadius: '3px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ width: `${activeBoss.hpPercent}%`, height: '100%', background: 'linear-gradient(90deg, #b91c1c, #f87171)', transition: 'width 0.1s linear' }} />
              </div>
            </div>
          ) : (
            <div
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '20px',
                fontWeight: 900,
                color: '#f8fafc',
                letterSpacing: '3px',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)'
              }}
            >
              {timeFormatted}
            </div>
          )}
        </div>

        {/* Right: Kills & Credits */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '14px', fontWeight: 800 }}>
            <span style={{ color: '#ef4444' }}>💀</span>
            <span>{kills}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fcd34d', fontSize: '14px', fontWeight: 800 }}>
            <span>💰</span>
            <span>{credits}</span>
          </div>
        </div>
      </header>

      {/* Middle: Contextual Interaction Prompt */}
      {interactionPrompt && (
        <div
          style={{
            alignSelf: 'center',
            marginBottom: '40px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '8px 18px',
            color: '#fef3c7',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
            letterSpacing: '1px'
          }}
        >
          {interactionPrompt}
        </div>
      )}

      {/* Bottom XP Bar */}
      <footer
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '20px',
          gap: '4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '12px', fontWeight: 800 }}>
          <span style={{ color: '#c084fc', textShadow: '0 0 6px #a855f7' }}>LVL {level}</span>
          <span>•</span>
          <span style={{ color: '#94a3b8' }}>{Math.floor(xp)} / {maxXp} XP</span>
        </div>
        <div
          style={{
            width: 'min(580px, calc(100vw - 32px))',
            height: '10px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid #6b21a8',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${xpPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #7e22ce, #c084fc)',
              transition: 'width 0.1s linear'
            }}
          />
        </div>
      </footer>
    </div>
  );
};
