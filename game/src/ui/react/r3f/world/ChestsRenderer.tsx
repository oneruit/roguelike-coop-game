import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { ChestManager, ChestInstance } from '../../../../world/ChestManager';

export interface ChestsRendererProps {
  chestManager?: ChestManager;
}

/**
 * Declarative R3F container for stage chests.
 * Manages chest object lifecycle and mounting within R3F.
 */
export const ChestsRenderer: FC<ChestsRendererProps> = ({ chestManager }) => {
  const [chests, setChests] = useState<ChestInstance[]>(() => {
    if (!chestManager) return [];
    return [...chestManager.chests];
  });

  useEffect(() => {
    if (!chestManager) return;

    chestManager.setDeclarative(true);
    setChests([...chestManager.chests]);

    const unsubscribe = chestManager.addChestListener(() => {
      setChests([...chestManager.chests]);
    });

    return () => {
      unsubscribe();
      chestManager.setDeclarative(false);
    };
  }, [chestManager]);

  return (
    <group name="world-chests">
      {chests.map((chest) => (
        <primitive key={chest.id} object={chest.mesh} />
      ))}
    </group>
  );
};
