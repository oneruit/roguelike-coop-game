import type { FC } from 'react';
import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Scene } from 'three';
import type { RemotePlayer } from '../../../../entities/RemotePlayer';
import { NetworkInterpolationBuffer } from './NetworkInterpolationBuffer';

export interface RemotePlayersRendererProps {
  remotePlayers?: Map<string, RemotePlayer> | RemotePlayer[];
  scene?: Scene;
  targetDelayMs?: number;
}

/**
 * Declarative R3F container for co-op remote teammates.
 * Employs client-side network jitter buffer (~100 ms target delay) to smoothly interpolate transforms.
 */
export const RemotePlayersRenderer: FC<RemotePlayersRendererProps> = ({
  remotePlayers,
  scene,
  targetDelayMs = 100
}) => {
  const buffers = useMemo(() => new Map<string, NetworkInterpolationBuffer>(), []);
  const tempVec = useRef(new Vector3());

  const playerList = useMemo(() => {
    if (!remotePlayers) return [];
    if (remotePlayers instanceof Map) {
      return Array.from(remotePlayers.values());
    }
    return remotePlayers;
  }, [remotePlayers]);

  useEffect(() => {
    if (!scene) return;

    // Detach remote player meshes from imperative scene so R3F can own them
    for (const player of playerList) {
      if (player.mesh.parent === scene) {
        scene.remove(player.mesh);
      }
    }

    return () => {
      // Re-attach to scene on unmount
      for (const player of playerList) {
        if (player.mesh.parent === null) {
          scene.add(player.mesh);
        }
      }
    };
  }, [playerList, scene]);

  useFrame(() => {
    const now = performance.now();

    for (const player of playerList) {
      const id = player.id;
      let buf = buffers.get(id);
      if (!buf) {
        buf = new NetworkInterpolationBuffer(targetDelayMs);
        buffers.set(id, buf);
      }

      // Feed snapshot
      buf.pushSnapshot(now, player.position, player.currentDir, player.isDowned);

      // Interpolate with delay
      const interpolated = buf.getInterpolatedPosition(now - targetDelayMs, tempVec.current);
      if (interpolated) {
        player.mesh.position.copy(interpolated.position);
      } else {
        player.mesh.position.copy(player.position);
      }
    }
  });

  return (
    <group name="remote-players-renderer">
      {playerList.map((player) => (
        <primitive key={player.id} object={player.mesh} />
      ))}
    </group>
  );
};
