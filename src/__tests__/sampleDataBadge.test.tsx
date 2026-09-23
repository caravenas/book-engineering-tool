import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SampleDataBadge } from '../components/SampleDataBadge';
import { useBookStore } from '../store/useBookStore';
import { loadShippedCatalog } from './testCatalog';
import type { Catalog, ProvisionalCatalogs } from '../types';

/**
 * The badge is the one claim in the interface about where the numbers come
 * from that used to be unfalsifiable: it said «Datos de ejemplo» whatever
 * the files said, so a print shop that replaced `public/config/` with its own
 * data went on being told it was an example. R-30 makes it read the files.
 */
const shipped = loadShippedCatalog();

function withProvisional(provisional: Partial<ProvisionalCatalogs>): Catalog {
  return { ...shipped, provisional: { ...shipped.provisional, ...provisional } };
}

afterEach(cleanup);

describe('The sample-data badge (R-30)', () => {
  it('says so plainly while every catalog is the repository\'s', () => {
    useBookStore.getState().initialize(shipped);
    render(<SampleDataBadge />);

    expect(screen.getByText('Datos de ejemplo')).toBeTruthy();
  });

  it('counts them once some of them are a print shop\'s own', () => {
    useBookStore.getState().initialize(withProvisional({ presses: false, sheetSizes: false }));
    render(<SampleDataBadge />);

    expect(screen.getByText('Datos de ejemplo en 4 catálogos')).toBeTruthy();
  });

  it('names which ones, for whoever wants to know', () => {
    useBookStore.getState().initialize(withProvisional({ presses: false, sheetSizes: false }));
    render(<SampleDataBadge />);

    const badge = screen.getByText('Datos de ejemplo en 4 catálogos');
    expect(badge.getAttribute('title')).toBe('Papeles · Esquemas de plegado · Encuadernaciones · Tapas');
  });

  it('counts in the singular when one is left', () => {
    useBookStore.getState().initialize(withProvisional({
      substrates: false, sheetSizes: false, presses: false, foldingSchemes: false, bindings: false,
    }));
    render(<SampleDataBadge />);

    expect(screen.getByText('Datos de ejemplo en 1 catálogo')).toBeTruthy();
  });

  /** Nothing to say, so nothing is said: the badge is not there at all. */
  it('disappears once every file holds a print shop\'s own data', () => {
    useBookStore.getState().initialize(withProvisional({
      substrates: false, sheetSizes: false, presses: false,
      foldingSchemes: false, bindings: false, covers: false,
    }));
    const { container } = render(<SampleDataBadge />);

    expect(container.querySelector('.header-badge')).toBeNull();
    expect(container.textContent).toBe('');
  });
});
