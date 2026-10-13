import { Screen } from './Screen';

/**
 * ScreenManager coordinates navigation, modal transitions, and UI screen state.
 */
export class ScreenManager {
  private static instance: ScreenManager;
  private screens: Map<string, Screen> = new Map();
  private rootContainer: HTMLElement | null = null;
  private screenStack: string[] = [];

  public static getInstance(): ScreenManager {
    if (!this.instance) {
      this.instance = new ScreenManager();
    }
    return this.instance;
  }

  public setRoot(container: HTMLElement): void {
    this.rootContainer = container;
    // Mount all currently registered screens
    this.screens.forEach((screen) => {
      screen.mount(container);
    });
  }

  public register(screen: Screen): void {
    this.screens.set(screen.id, screen);
    if (this.rootContainer) {
      screen.mount(this.rootContainer);
    }
  }

  public get<T extends Screen>(id: string): T | undefined {
    return this.screens.get(id) as T | undefined;
  }

  public show(id: string, pushToStack = true): void {
    const screen = this.screens.get(id);
    if (!screen) {
      console.warn(`[ScreenManager] Screen not found: "${id}"`);
      return;
    }
    if (pushToStack) {
      this.screenStack.push(id);
    }
    screen.show();
  }

  public hide(id: string): void {
    const screen = this.screens.get(id);
    if (screen) {
      screen.hide();
    }
    this.screenStack = this.screenStack.filter((s) => s !== id);
  }

  public hideAll(): void {
    this.screens.forEach((screen) => screen.hide());
    this.screenStack = [];
  }

  public back(): void {
    if (this.screenStack.length > 0) {
      const top = this.screenStack.pop();
      if (top) {
        this.screens.get(top)?.hide();
      }
      if (this.screenStack.length > 0) {
        const prev = this.screenStack[this.screenStack.length - 1];
        this.screens.get(prev)?.show();
      }
    }
  }

  public getActiveScreenId(): string | null {
    return this.screenStack.length > 0 ? this.screenStack[this.screenStack.length - 1] : null;
  }
}
