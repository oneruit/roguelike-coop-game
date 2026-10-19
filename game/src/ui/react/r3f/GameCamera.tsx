import type { FC } from 'react';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera as DreiPerspectiveCamera } from '@react-three/drei';
import { Vector3, MathUtils, type PerspectiveCamera as ThreePerspectiveCamera } from 'three';

export interface GameCameraProps {
  getTargetPosition?: () => Vector3;
}

/**
 * 2.5D tilted perspective camera for The Rift.
 * Interpolates smoothly towards target position on each render frame.
 */
export const GameCamera: FC<GameCameraProps> = ({ getTargetPosition }) => {
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const cameraOffset = useRef(new Vector3(0, 16, 12));
  const cameraTarget = useRef(new Vector3());

  useFrame((_, delta) => {
    if (!cameraRef.current) return;

    const targetPos = getTargetPosition ? getTargetPosition() : cameraTarget.current;
    const targetX = targetPos.x + cameraOffset.current.x;
    const targetY = targetPos.y + cameraOffset.current.y;
    const targetZ = targetPos.z + cameraOffset.current.z;

    const factor = 1 - Math.exp(-12 * Math.min(delta, 0.1));

    cameraRef.current.position.x = MathUtils.lerp(cameraRef.current.position.x, targetX, factor);
    cameraRef.current.position.y = MathUtils.lerp(cameraRef.current.position.y, targetY, factor);
    cameraRef.current.position.z = MathUtils.lerp(cameraRef.current.position.z, targetZ, factor);

    cameraTarget.current.lerp(targetPos, factor);
    cameraRef.current.lookAt(
      cameraTarget.current.x,
      cameraTarget.current.y + 0.6,
      cameraTarget.current.z
    );
  });

  return (
    <DreiPerspectiveCamera
      ref={cameraRef}
      makeDefault
      fov={48}
      near={0.1}
      far={120}
      position={[0, 16, 12]}
    />
  );
};
