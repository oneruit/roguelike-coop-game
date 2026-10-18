import type { FC } from 'react';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Matrix4,
  Vector3,
  Quaternion,
  AdditiveBlending,
  DoubleSide
} from 'three';
import type { CombatDirector } from '../../../../combat/CombatDirector';

export interface CombatVfxRendererProps {
  combatDirector?: CombatDirector;
  maxProjectiles?: number;
}

/**
 * Pre-allocated projectile and combat VFX pool.
 * Uses InstancedMesh to batch render high-frequency projectiles without React list creation.
 */
export const CombatVfxRenderer: FC<CombatVfxRendererProps> = ({
  combatDirector,
  maxProjectiles = 200
}) => {
  const instancedMeshRef = useRef<InstancedMesh>(null);

  const dummyMatrix = useMemo(() => new Matrix4(), []);
  const dummyPos = useMemo(() => new Vector3(), []);
  const dummyQuat = useMemo(() => new Quaternion(), []);
  const dummyScale = useMemo(() => new Vector3(1, 1, 1), []);

  const { geometry, material } = useMemo(() => {
    const geom = new PlaneGeometry(0.85, 0.85);
    const mat = new MeshBasicMaterial({
      color: 0x38bdf8,
      side: DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false
    });
    return { geometry: geom, material: mat };
  }, []);

  useFrame(() => {
    if (!instancedMeshRef.current || !combatDirector) return;

    const projectiles = combatDirector.projectiles;
    const count = Math.min(projectiles.length, maxProjectiles);

    for (let i = 0; i < count; i++) {
      const p = projectiles[i];
      dummyPos.set(p.position.x, p.position.y || 0.6, p.position.z);
      // Billboard tilt
      dummyQuat.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 12);
      dummyScale.set(1, 1, 1);

      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      instancedMeshRef.current.setMatrixAt(i, dummyMatrix);
    }

    instancedMeshRef.current.count = count;
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="combat-vfx-renderer">
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, maxProjectiles]}
        count={0}
      />
    </group>
  );
};
