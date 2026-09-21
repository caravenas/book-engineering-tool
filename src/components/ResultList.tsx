import type { ReactNode } from 'react';

/**
 * A figure and what it is called, one per line, separated by hairlines. The
 * bordered cards this replaces were written three different ways — three
 * components drew them with a shared class and a fourth drew its own grid with
 * inline styles — which nobody noticed while each lived in its own panel and
 * became obvious the moment they were stacked in one column.
 *
 * A description list is what this is: a name and a value, repeated. Saying so
 * lets a screen reader move between them as pairs.
 */
export function ResultList({ children }: { children: ReactNode }) {
  return <dl className="result-list">{children}</dl>;
}

export function ResultRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="result-row">
      <dt className="stat-label">{label}</dt>
      <dd className="stat-value">{children}</dd>
    </div>
  );
}
