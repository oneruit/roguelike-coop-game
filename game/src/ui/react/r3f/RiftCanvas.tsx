import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  type Scene,
  type Vector3
} from 'three';
import { GameCamera } from './GameCamera';
import { DayNightLighting } from './DayNightLighting';
import { SceneBridge } from './SceneBridge';
import { R3FErrorBoundary } from './R3FErrorBoundary';
import { WorldChunks, AltarsRenderer, ChestsRenderer, VfxEnvironment } from './world';
import { PlayerRenderer, RemotePlayersRenderer, EnemiesRenderer, CombatVfxRenderer } from './entities';
import { FeatureFlags } from '../../../core/FeatureFlags';
import type { ChunkManager } from '../../../world/ChunkManager';
import type { AltarManager } from '../../../world/AltarManager';
import type { ChestManager } from '../../../world/ChestManager';
import type { Player } from '../../../entities/Player';
import type { RemotePlayer } from '../../../entities/RemotePlayer';
import type { EnemyManager } from '../../../entities/EnemyManager';
import type { CombatDirector } from '../../../combat/CombatDirector';

export interface RiftCanvasProps {
  scene: Scene;
  timeOfDay?: 'day' | 'night';
  getTargetPosition?: () => Vector3;
  chunkManager?: ChunkManager;
  altarManager?: AltarManager;
  chestManager?: ChestManager;
  portalPosition?: Vector3;
  player?: Player;
  remotePlayers?: Map<string, RemotePlayer> | RemotePlayer[];
  enemyManager?: EnemyManager;
  combatDirector?: CombatDirector;
}

/**
 * Master React Three Fiber Canvas for The Rift.
 * Enforces WebGL ownership, shadow map settings, tone mapping, and error isolation.
 */
export const RiftCanvas: React.FC<RiftCanvasProps> = ({
  scene,
  timeOfDay = 'day',
  getTargetPosition,
  chunkManager,
  altarManager,
  chestManager,
  portalPosition,
  player,
  remotePlayers,
  enemyManager,
  combatDirector
}) => {
  const isWorldDeclarative = FeatureFlags.getInstance().isEnabled('r3f_world');
  const isEntitiesDeclarative = FeatureFlags.getInstance().isEnabled('r3f_entities');
  return (
    <div
      id="r3f-canvas-container"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'auto',
        overflow: 'hidden'
      }}
    >
      <R3FErrorBoundary>
        <Suspense fallback={null}>
          <Canvas
            shadows
            camera={{ fov: 48, near: 0.1, far: 120, position: [0, 16, 12] }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              toneMapping: ACESFilmicToneMapping,
              toneMappingExposure: 1.15
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.enabled = true;
              gl.shadowMap.type = PCFShadowMap;

              // Setup canvas context loss listeners
              const canvasEl = gl.domElement;
              canvasEl.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                console.warn('[RiftCanvas] WebGL Context Lost! Preventing default crash...');
              });
              canvasEl.addEventListener('webglcontextrestored', () => {
                console.info('[RiftCanvas] WebGL Context Restored!');
              });
            }}
          >
            {/* Camera */}
            <GameCamera getTargetPosition={getTargetPosition} />

            {/* Lighting */}
            <DayNightLighting timeOfDay={timeOfDay} getTargetPosition={getTargetPosition} />

            {/* Declarative World Systems (Phase 4) */}
            {isWorldDeclarative && (
              <>
                <WorldChunks chunkManager={chunkManager} />
                <AltarsRenderer altarManager={altarManager} />
                <ChestsRenderer chestManager={chestManager} />
                <VfxEnvironment getTargetPosition={getTargetPosition} portalPosition={portalPosition} />
              </>
            )}

            {/* Declarative Entity Systems (Phase 5) */}
            {isEntitiesDeclarative && (
              <>
                <PlayerRenderer player={player} scene={scene} />
                <RemotePlayersRenderer remotePlayers={remotePlayers} scene={scene} />
                <EnemiesRenderer enemyManager={enemyManager} />
                <CombatVfxRenderer combatDirector={combatDirector} />
              </>
            )}

            {/* Imperative Scene Bridge */}
            <SceneBridge scene={scene} />
          </Canvas>
        </Suspense>
      </R3FErrorBoundary>
    </div>
  );
};
