import React, { useState, useEffect } from 'react';
import { FeatureFlags } from '../../core/FeatureFlags';
import { HUDOverlay } from './hud/HUDOverlay';
import { MainMenuModal, type MainMenuModalProps } from './modals/MainMenuModal';
import { LevelUpModal, type LevelUpModalProps } from './modals/LevelUpModal';
import { SettingsModal, type SettingsModalProps } from './modals/SettingsModal';
import { GameOverModal, type GameOverModalProps } from './modals/GameOverModal';

export interface ReactUIRootProps {
  mainMenuProps?: MainMenuModalProps;
  levelUpProps?: LevelUpModalProps;
  settingsProps?: SettingsModalProps;
  gameOverProps?: GameOverModalProps;
}

export const ReactUIRoot: React.FC<ReactUIRootProps> = ({
  mainMenuProps,
  levelUpProps,
  settingsProps,
  gameOverProps
}) => {
  const [flags, setFlags] = useState(() => FeatureFlags.getInstance().getAllFlags());

  useEffect(() => {
    const unsub = FeatureFlags.getInstance().addListener(() => {
      setFlags(FeatureFlags.getInstance().getAllFlags());
    });
    return unsub;
  }, []);

  return (
    <div
      id="react-ui-container"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20
      }}
    >
      {/* React HUD (Feature Flag gated) */}
      {flags.react_hud && <HUDOverlay />}

      {/* React Main Menu (Feature Flag gated) */}
      {flags.react_main_menu && <MainMenuModal {...mainMenuProps} />}

      {/* React Gameplay Modals (Feature Flag gated) */}
      {flags.react_modals && (
        <>
          <LevelUpModal {...levelUpProps} />
          <SettingsModal {...settingsProps} />
          <GameOverModal {...gameOverProps} />
        </>
      )}
    </div>
  );
};
