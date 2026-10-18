import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Player } from '../../../../entities/Player';
import type { Scene } from 'three';

export interface PlayerRendererProps {
  player?: Player;
  scene?: Scene;
}

/**
 * Declarative R3F component wrapping local Player entity.
 * Directly synchronizes player billboard mesh, position, and status aura in useFrame.
 */
export const PlayerRenderer: FC<PlayerRendererProps> = ({ player, scene }) => {
  const isDetachedRef = useRef(false);

  useEffect(() => {
    if (!player || !scene) return;

    // Detach player mesh from imperative Three.js scene so R3F owns it
    if (player.mesh.parent === scene) {
      scene.remove(player.mesh);
      isDetachedRef.current = true;
    }

    return () => {
      // Re-attach to scene on unmount if needed
      if (isDetachedRef.current && player.mesh.parent === null) {
        scene.add(player.mesh);
        isDetachedRef.current = false;
      }
    };
  }, [player, scene]);

  useFrame(() => {
    if (!player) return;
    // Player mesh position is kept in sync with player simulation position
    player.mesh.position.copy(player.position);
  });

  if (!player) return null;

  return (
    <group name="local-player-renderer">
      <primitive object={player.mesh} />
    </group>
  );
};
