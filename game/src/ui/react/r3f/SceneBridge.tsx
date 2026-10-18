import React, { useEffect, useRef } from 'react';
import type { Scene } from 'three';

export interface SceneBridgeProps {
  scene: Scene;
}

/**
 * Transient hybrid bridge mounting imperative Three.js Scene inside R3F.
 * Guardrails:
 * - Read-only rendering adapter.
 * - Never attach R3F pointer events or changing reactive props directly to the primitive.
 */
export const SceneBridge: React.FC<SceneBridgeProps> = ({ scene }) => {
  const mountedSceneRef = useRef<Scene>(scene);

  useEffect(() => {
    mountedSceneRef.current = scene;
    return () => {
      // Cleanup on unmount if scene was attached
    };
  }, [scene]);

  return <primitive object={mountedSceneRef.current} dispose={null} />;
};
