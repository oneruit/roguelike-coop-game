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

export interface RiftCanvasProps {
  scene: Scene;
  timeOfDay?: 'day' | 'night';
  getTargetPosition?: () => Vector3;
}

/**
 * Master React Three Fiber Canvas for The Rift.
 * Enforces WebGL ownership, shadow map settings, tone mapping, and error isolation.
 */
export const RiftCanvas: React.FC<RiftCanvasProps> = ({
  scene,
  timeOfDay = 'day',
  getTargetPosition
}) => {
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

            {/* Imperative Scene Bridge */}
            <SceneBridge scene={scene} />
          </Canvas>
        </Suspense>
      </R3FErrorBoundary>
    </div>
  );
};
