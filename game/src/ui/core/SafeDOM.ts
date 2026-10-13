/**
 * SafeDOM utility for resilient UI interaction.
 * Prevents application-wide crashes when elements are renamed, removed, or missing in HTML templates.
 */
export class SafeDOM {
  public static getElementById<T extends HTMLElement = HTMLElement>(
    id: string,
    required: boolean = false
  ): T | null {
    if (typeof document === 'undefined') return null;
    const el = document.getElementById(id) as T | null;
    if (!el && required) {
      console.warn(`[SafeDOM] Required element with id "#${id}" not found.`);
    }
    return el;
  }

  public static query<T extends HTMLElement = HTMLElement>(
    parent: ParentNode | null | undefined,
    selector: string,
    required: boolean = false
  ): T | null {
    if (!parent) return null;
    let el: T | null = null;
    if (typeof parent.querySelector === 'function') {
      try {
        el = parent.querySelector(selector) as T | null;
      } catch {
        // Ignore invalid selector syntax if any
      }
    }
    // Fallback: if not found within container, check document.getElementById for ID selectors
    if (!el && selector.startsWith('#') && typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      el = document.getElementById(selector.slice(1)) as T | null;
    }
    if (!el && required) {
      console.warn(`[SafeDOM] Required element with selector "${selector}" not found.`);
    }
    return el;
  }

  public static queryAll<T extends HTMLElement = HTMLElement>(
    parent: ParentNode | null | undefined,
    selector: string
  ): T[] {
    if (!parent || typeof parent.querySelectorAll !== 'function') return [];
    try {
      return Array.from(parent.querySelectorAll(selector)) as T[];
    } catch {
      return [];
    }
  }

  public static on<K extends keyof HTMLElementEventMap>(
    target: EventTarget | null | undefined,
    type: K | string,
    listener: (ev: any) => any,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    if (!target) return () => {};
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
  }

  public static setText(el: HTMLElement | null | undefined, text: string | number): void {
    if (el) {
      el.textContent = String(text);
    }
  }

  public static setVisible(el: HTMLElement | null | undefined, visible: boolean): void {
    if (!el) return;
    if (visible) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }
}
