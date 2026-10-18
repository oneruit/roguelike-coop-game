import type { FC } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Frustum, Matrix4, type Group } from 'three';
import type { ChunkManager } from '../../../../world/ChunkManager';

export interface WorldChunksProps {
  chunkManager?: ChunkManager;
}

/**
 * Declarative R3F container for terrain chunks.
 * Enforces scene ownership guardrail: mounts chunks via stable keys without mutating R3F scene directly.
 */
export const WorldChunks: FC<WorldChunksProps> = ({ chunkManager }) => {
  const [chunks, setChunks] = useState<[string, Group][]>(() => {
    if (!chunkManager) return [];
    return Array.from(chunkManager.getActiveChunks().entries());
  });

  const frustumRef = useRef(new Frustum());
  const projScreenMatrixRef = useRef(new Matrix4());

  useEffect(() => {
    if (!chunkManager) return;

    // Enable declarative rendering mode to prevent duplicate scene additions
    chunkManager.setDeclarative(true);
    setChunks(Array.from(chunkManager.getActiveChunks().entries()));

    const unsubscribe = chunkManager.addChunkListener(() => {
      setChunks(Array.from(chunkManager.getActiveChunks().entries()));
    });

    return () => {
      unsubscribe();
      chunkManager.setDeclarative(false);
    };
  }, [chunkManager]);

  // Run frustum culling on chunk groups each frame
  useFrame(({ camera }) => {
    if (!chunkManager) return;
    projScreenMatrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(projScreenMatrixRef.current);
    chunkManager.cull(frustumRef.current);
  });

  return (
    <group name="world-chunks">
      {chunks.map(([key, group]) => (
        <primitive key={key} object={group} />
      ))}
    </group>
  );
};
