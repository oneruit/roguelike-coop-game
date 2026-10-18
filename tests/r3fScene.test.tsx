import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';

// Setup DOM for Node.js test environment
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="game-container"></div></body></html>', {
  url: 'http://localhost'
});
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).HTMLElement = dom.window.HTMLElement;

import { render, fireEvent } from '@testing-library/react';
import { R3FErrorBoundary } from '../game/src/ui/react/r3f/R3FErrorBoundary';
import { Scene } from 'three';
import { SceneBridge } from '../game/src/ui/react/r3f/SceneBridge';

test('R3F Scene - R3FErrorBoundary catches child error and allows reset', () => {
  let resetCalled = false;
  const ProblematicChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('WebGL Simulated Crash');
    }
    return <div>Scene OK</div>;
  };

  const { container, rerender, getByText } = render(
    <R3FErrorBoundary onReset={() => { resetCalled = true; }}>
      <ProblematicChild shouldThrow={false} />
    </R3FErrorBoundary>
  );

  assert.ok(container.textContent?.includes('Scene OK'));

  // Trigger error inside boundary
  // Suppress expected console.error during test
  const originalError = console.error;
  console.error = () => {};

  rerender(
    <R3FErrorBoundary onReset={() => { resetCalled = true; }}>
      <ProblematicChild shouldThrow={true} />
    </R3FErrorBoundary>
  );

  console.error = originalError;

  assert.ok(container.textContent?.includes('Ошибка 3D Рендеринга'));
  assert.ok(container.textContent?.includes('WebGL Simulated Crash'));

  const resetBtn = getByText('🔄 Перезапустить сцену');
  fireEvent.click(resetBtn);
  assert.equal(resetCalled, true);
});

test('R3F Scene - SceneBridge instantiates with Three.js scene', () => {
  const scene = new Scene();
  // Verify SceneBridge creates primitive JSX representation
  const element = <SceneBridge scene={scene} />;
  assert.equal(element.type, SceneBridge);
  assert.equal(element.props.scene, scene);
});
