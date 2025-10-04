import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { disableFocusWithin, restoreFocusWithin } from '@/lib/focusUtils';

describe('focusUtils', () => {
  test('disableFocusWithin and restoreFocusWithin work', () => {
    document.body.innerHTML = `
      <div id="root">
        <div id="slide">
          <a href="#" id="link">link</a>
          <button id="btn">btn</button>
        </div>
      </div>
    `;
    const root = document.getElementById('slide') as HTMLElement;
    const link = document.getElementById('link') as HTMLElement;
    const btn = document.getElementById('btn') as HTMLElement;
    // initially no tabindex
    expect(link.getAttribute('tabindex')).toBeNull();
    expect(btn.getAttribute('tabindex')).toBeNull();

    disableFocusWithin(root);
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(btn).toHaveAttribute('tabindex', '-1');

    restoreFocusWithin(root);
    expect(link.getAttribute('tabindex')).toBeNull();
    expect(btn.getAttribute('tabindex')).toBeNull();
  });
});
