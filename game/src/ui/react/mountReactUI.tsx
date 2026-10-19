import { createRoot, type Root } from 'react-dom/client';
import { ReactUIRoot, type ReactUIRootProps } from './ReactUIRoot';

let reactRoot: Root | null = null;

/**
 * Initializes and mounts React UI Root into DOM container.
 */
export function initReactUI(containerId = 'react-ui-root', props?: ReactUIRootProps): Root | null {
  if (typeof document === 'undefined') return null;

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'absolute';
    container.style.inset = '0';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '20';
    document.body.appendChild(container);
  }

  if (!reactRoot) {
    reactRoot = createRoot(container);
  }

  reactRoot.render(<ReactUIRoot {...props} />);
  return reactRoot;
}

/**
 * Disposes React UI root cleanly.
 */
export function disposeReactUI(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}
