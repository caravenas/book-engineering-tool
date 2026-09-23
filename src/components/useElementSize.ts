import { useCallback, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * The size of the box a drawing has been given, so the drawing can fill it.
 *
 * The four views are drawn at a scale the component computes, and until R-24
 * that scale was read off a constant: 360 by 420 pixels for the page,
 * whatever the screen. Shown one at a time in a column that was 720px wide
 * that was merely wasteful; shown four at once, in cells whose size depends
 * on the window, a constant is simply wrong — it either overflows the cell or
 * leaves half of it empty.
 *
 * `fallback` is what the drawing is sized at before anything has been
 * measured, and in any environment without a ResizeObserver. jsdom is one of
 * those, which is why the unit tests still see the sizes they always saw; the
 * browser tests measure the real thing.
 */
export function useElementSize<T extends HTMLElement>(
  fallback: ElementSize
): [(node: T | null) => void, ElementSize] {
  const [size, setSize] = useState<ElementSize>(fallback);
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      /*
       * A box of zero is a box that has not been laid out yet — the cell is
       * display:none, or the view was just mounted. Sizing a drawing to it
       * would replace it with the message it shows for an impossible page.
       */
      if (box.width <= 0 || box.height <= 0) return;
      setSize({ width: box.width, height: box.height });
    });

    resizeObserver.observe(node);
    observer.current = resizeObserver;
  }, []);

  return [ref, size];
}
