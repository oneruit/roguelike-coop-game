import type { FC } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Frustum, Matrix4 } from 'three';
import type { AltarManager } from '../../../../world/AltarManager';
import type { Altar } from '../../../../world/Altar';

export interface AltarsRendererProps {
  altarManager?: AltarManager;
}

/**
 * Declarative R3F container for capture altars and interaction zones.
 * Bridges altar simulation with declarative scene hierarchy.
 */
export const AltarsRenderer: FC<AltarsRendererProps> = ({ altarManager }) => {
  const [altars, setAltars] = useState<Altar[]>(() => {
    if (!altarManager) return [];
    return [...altarManager.altars];
  });

  const frustumRef = useRef(new Frustum());
  const projScreenMatrixRef = useRef(new Matrix4());

  useEffect(() => {
    if (!altarManager) return;

    altarManager.setDeclarative(true);
    setAltars([...altarManager.altars]);

    const unsubscribe = altarManager.addAltarListener(() => {
      setAltars([...altarManager.altars]);
    });

    return () => {
      unsubscribe();
      altarManager.setDeclarative(false);
    };
  }, [altarManager]);

  useFrame(({ camera }, delta) => {
    if (!altarManager) return;
    projScreenMatrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(projScreenMatrixRef.current);
    altarManager.updateVisuals(delta, camera, frustumRef.current);
  });

  return (
    <group name="world-altars">
      {altars.map((altar, idx) => (
        <primitive
          key={altar.config?.type ? `${altar.config.type}-${altar.position.x}-${altar.position.z}` : `altar-${idx}`}
          object={altar.mesh}
        />
      ))}
    </group>
  );
};
