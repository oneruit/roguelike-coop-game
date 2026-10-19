import type { FC } from 'react';
import { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Matrix4,
  Vector3,
  Quaternion,
  DoubleSide
} from 'three';
import type { EnemyManager } from '../../../../entities/EnemyManager';

export interface EnemiesRendererProps {
  enemyManager?: EnemyManager;
  maxEnemies?: number;
}

/**
 * High-performance InstancedMesh batch renderer for 100+ enemies.
 * Follows the zero-React-list spawning principle: updates instance matrices in useFrame without GC spikes.
 */
export const EnemiesRenderer: FC<EnemiesRendererProps> = ({
  enemyManager,
  maxEnemies = 300
}) => {
  const instancedMeshRef = useRef<InstancedMesh>(null);

  const dummyMatrix = useMemo(() => new Matrix4(), []);
  const dummyPos = useMemo(() => new Vector3(), []);
  const dummyQuat = useMemo(() => new Quaternion(), []);
  const dummyScale = useMemo(() => new Vector3(1, 1, 1), []);

  const { geometry, material } = useMemo(() => {
    const geom = new PlaneGeometry(1.8, 1.8);
    geom.translate(0, 0.7, 0);
    const mat = new MeshBasicMaterial({
      color: 0xef4444,
      side: DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    return { geometry: geom, material: mat };
  }, []);

  useEffect(() => {
    if (!enemyManager) return;
    enemyManager.setDeclarative(true);
    return () => {
      enemyManager.setDeclarative(false);
    };
  }, [enemyManager]);

  useFrame(() => {
    if (!instancedMeshRef.current || !enemyManager) return;

    const enemies = enemyManager.enemies;
    const count = Math.min(enemies.length, maxEnemies);

    for (let i = 0; i < count; i++) {
      const e = enemies[i];
      dummyPos.set(e.position.x, e.position.y, e.position.z);
      // Billboard tilt for 2.5D perspective
      dummyQuat.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 12);
      dummyScale.set(e.width || 1.8, e.height || 1.8, 1);

      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      instancedMeshRef.current.setMatrixAt(i, dummyMatrix);
    }

    instancedMeshRef.current.count = count;
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="enemies-renderer">
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, maxEnemies]}
        count={0}
      />
      {/* If active boss exists, render boss mesh directly via primitive */}
      {enemyManager?.activeBoss && (
        <primitive object={enemyManager.activeBoss.mesh} />
      )}
    </group>
  );
};
