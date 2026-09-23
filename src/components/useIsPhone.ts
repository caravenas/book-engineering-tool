import { useState } from 'react';

/**
 * The one breakpoint the stylesheet has, readable from a component.
 *
 * Read once, when the component mounts, and not subscribed to: what it
 * decides is where the spec sheet starts — open or closed — and a sheet that
 * folded itself back up because the window was resized, or a phone turned on
 * its side, would be undoing the reader's work to follow a rule about
 * layout.
 *
 * `matchMedia` is missing in some environments and always reports false in
 * jsdom, which is right for both: a test renders the desktop sheet.
 */
const PHONE = '(max-width: 1024px)';

export function useIsPhone(): boolean {
  return useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(PHONE).matches
      : false
  ))[0];
}
