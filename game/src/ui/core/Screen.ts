/**
 * Base abstract class for modular UI screens.
 * Implements standard lifecycle: mount, show, hide, destroy.
 */
export abstract class Screen {
  protected container: HTMLElement;
  protected isMounted: boolean = false;

  constructor(public readonly id: string, existingElement?: HTMLElement | null) {
    if (existingElement) {
      this.container = existingElement;
      this.isMounted = true;
    } else {
      this.container = document.createElement('div');
      this.container.id = `screen-${id}`;
      this.container.classList.add('ui-screen', `ui-screen--${id}`, 'ui-screen--hidden', 'hidden');
    }
  }

  public mount(parent: HTMLElement): void {
    if (this.isMounted) return;
    const template = this.getTemplate();
    if (template) {
      this.container.innerHTML = template;
    }
    parent.appendChild(this.container);
    this.bindElements();
    this.bindEvents();
    this.isMounted = true;
  }

  public show(): void {
    this.container.classList.remove('ui-screen--hidden');
    this.container.classList.remove('hidden');
    this.onShow();
  }

  public hide(): void {
    this.container.classList.add('ui-screen--hidden');
    this.container.classList.add('hidden');
    this.onHide();
  }

  public isVisible(): boolean {
    return !this.container.classList.contains('ui-screen--hidden') && !this.container.classList.contains('hidden');
  }

  public destroy(): void {
    this.onHide();
    this.container.remove();
    this.isMounted = false;
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  protected abstract getTemplate(): string;
  protected abstract bindElements(): void;
  protected abstract bindEvents(): void;
  protected onShow(): void {}
  protected onHide(): void {}
}
