import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight, Vector3 } from 'three';

export interface DayNightLightingProps {
  timeOfDay?: 'day' | 'night';
  getTargetPosition?: () => Vector3;
}

/**
 * Lighting rig for The Rift R3F scene.
 * Manages Ambient, Directional (with shadows), and Hemisphere lights with Day/Night transitions.
 */
export const DayNightLighting: React.FC<DayNightLightingProps> = ({
  timeOfDay = 'day',
  getTargetPosition
}) => {
  const dirLightRef = useRef<DirectionalLight>(null);
  const sunOffset = useRef(new Vector3(18, 28, 14));
  const moonOffset = useRef(new Vector3(-14, 26, -14));

  useFrame(() => {
    if (!dirLightRef.current) return;
    const targetPos = getTargetPosition ? getTargetPosition() : new Vector3();
    const currentOffset = timeOfDay === 'day' ? sunOffset.current : moonOffset.current;

    dirLightRef.current.position.set(
      targetPos.x + currentOffset.x,
      targetPos.y + currentOffset.y,
      targetPos.z + currentOffset.z
    );
    dirLightRef.current.target.position.copy(targetPos);
    dirLightRef.current.target.updateMatrixWorld();
  });

  const isDay = timeOfDay === 'day';

  return (
    <>
      {/* Ambient Light */}
      <ambientLight
        color={isDay ? 0x8a5530 : 0x2b3d63}
        intensity={isDay ? 1.25 : 1.15}
      />

      {/* Key Directional Light with Shadows */}
      <directionalLight
        ref={dirLightRef}
        color={isDay ? 0xffedd5 : 0xa5cbf5}
        intensity={isDay ? 1.65 : 1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={70}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
      />

      {/* Hemisphere Light */}
      <hemisphereLight
        color={isDay ? 0xfb923c : 0x38bdf8}
        groundColor={isDay ? 0x241209 : 0x111827}
        intensity={isDay ? 0.85 : 0.75}
      />
    </>
  );
};
