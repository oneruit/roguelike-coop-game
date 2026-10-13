import {
  QuestsScreen,
  QuestsScreenOptions,
  ChapterQuestItem
} from '../screens/Quests/QuestsScreen';

export type { ChapterQuestItem };
export type QuestsUIContext = QuestsScreenOptions;

/**
 * @deprecated Use QuestsScreen from '../screens/Quests/QuestsScreen'
 */
export class QuestsUI extends QuestsScreen {
  constructor(ctx: QuestsUIContext) {
    super(ctx);
  }
}
