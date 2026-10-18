import type { FC } from 'react';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  type Points as ThreePoints
} from 'three';

export interface VfxEnvironmentProps {
  getTargetPosition?: () => Vector3;
  portalPosition?: Vector3;
  particleCount?: number;
}

/**
 * Ambient environmental VFX component for The Rift.
 * Renders drifting dust motes and optional celestial portal aura without garbage collection spikes.
 */
export const VfxEnvironment: FC<VfxEnvironmentProps> = ({
  getTargetPosition,
  portalPosition,
  particleCount = 120
}) => {
  const pointsRef = useRef<ThreePoints>(null);

  // Pre-allocate buffer geometry positions for ambient dust
  const { geometry, offsets } = useMemo(() => {
    const geom = new BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speedOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 8 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      speedOffsets[i] = 0.5 + Math.random() * 0.8;
    }

    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return { geometry: geom, offsets: speedOffsets };
  }, [particleCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const targetPos = getTargetPosition ? getTargetPosition() : new Vector3();
    const posAttr = geometry.attributes.position as Float32BufferAttribute;
    const array = posAttr.array as Float32Array;

    const dt = Math.min(delta, 0.1);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const speed = offsets[i];

      // Gentle drift upward and along X
      array[idx + 0] += dt * speed * 0.6;
      array[idx + 1] += dt * speed * 0.4;

      // Wrap around target position bounds
      const dx = array[idx + 0] - targetPos.x;
      const dz = array[idx + 2] - targetPos.z;

      if (dx > 30) array[idx + 0] = targetPos.x - 30;
      if (dx < -30) array[idx + 0] = targetPos.x + 30;
      if (dz > 30) array[idx + 2] = targetPos.z - 30;
      if (dz < -30) array[idx + 2] = targetPos.z + 30;
      if (array[idx + 1] > 10) array[idx + 1] = 0.2;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <group name="vfx-environment">
      {/* Ambient dust motes */}
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.25}
          color={0xfbbf24}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </points>

      {/* Rift portal swirling ring aura if portalPosition is active */}
      {portalPosition && (
        <group position={[portalPosition.x, 0.15, portalPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[6.5, 7.5, 32]} />
            <meshBasicMaterial
              color={0xa855f7}
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
