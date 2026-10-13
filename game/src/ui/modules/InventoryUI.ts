import {
  InventoryScreen,
  InventoryScreenOptions
} from '../screens/Inventory/InventoryScreen';

export type { InventoryScreenOptions };

/**
 * @deprecated Use InventoryScreen from '../screens/Inventory/InventoryScreen'
 */
export class InventoryUI extends InventoryScreen {
  constructor(options?: InventoryScreenOptions) {
    super(options);
  }
}
