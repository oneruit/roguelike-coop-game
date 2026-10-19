import React, { useState, useEffect } from 'react';
import { FeatureFlags } from '../../core/FeatureFlags';
import { HUDOverlay } from './hud/HUDOverlay';
import { MainMenuModal, type MainMenuModalProps } from './modals/MainMenuModal';
import { LevelUpModal, type LevelUpModalProps } from './modals/LevelUpModal';
import { SettingsModal, type SettingsModalProps } from './modals/SettingsModal';
import { GameOverModal, type GameOverModalProps } from './modals/GameOverModal';

import { RiftCanvas } from './r3f/RiftCanvas';
import type { Scene, Vector3 } from 'three';
import type { ChunkManager } from '../../world/ChunkManager';
import type { AltarManager } from '../../world/AltarManager';
import type { ChestManager } from '../../world/ChestManager';
import type { Player } from '../../entities/Player';
import type { RemotePlayer } from '../../entities/RemotePlayer';
import type { EnemyManager } from '../../entities/EnemyManager';
import type { CombatDirector } from '../../combat/CombatDirector';

export interface ReactUIRootProps {
  scene?: Scene;
  chunkManager?: ChunkManager;
  altarManager?: AltarManager;
  chestManager?: ChestManager;
  portalPosition?: Vector3;
  player?: Player;
  remotePlayers?: Map<string, RemotePlayer> | RemotePlayer[];
  enemyManager?: EnemyManager;
  combatDirector?: CombatDirector;
  getTargetPosition?: () => Vector3;
  mainMenuProps?: MainMenuModalProps;
  levelUpProps?: LevelUpModalProps;
  settingsProps?: SettingsModalProps;
  gameOverProps?: GameOverModalProps;
}

export const ReactUIRoot: React.FC<ReactUIRootProps> = ({
  scene,
  chunkManager,
  altarManager,
  chestManager,
  portalPosition,
  player,
  remotePlayers,
  enemyManager,
  combatDirector,
  getTargetPosition,
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
      {/* React Three Fiber Canvas (Feature Flag gated) */}
      {flags.r3f_canvas && scene && (
        <RiftCanvas
          scene={scene}
          getTargetPosition={getTargetPosition}
          chunkManager={chunkManager}
          altarManager={altarManager}
          chestManager={chestManager}
          portalPosition={portalPosition}
          player={player}
          remotePlayers={remotePlayers}
          enemyManager={enemyManager}
          combatDirector={combatDirector}
        />
      )}

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
