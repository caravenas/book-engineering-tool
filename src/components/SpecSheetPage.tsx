import { useEffect, useRef } from 'react';
import { useSpecSheet, type SpecSheetRow } from './specSheet';

function Row({ row }: { row: SpecSheetRow }) {
  if ('reason' in row) {
    return (
      <div className="sheet-row sheet-row-reason">
        <dt>{row.label}</dt>
        <dd>
          <span className="sheet-reason-mark">No calculable</span>
          {' '}{row.reason}
        </dd>
      </div>
    );
  }

  return (
    <div className="sheet-row">
      <dt>{row.label}</dt>
      <dd>
        {row.value}
        {row.unit && <span className="sheet-unit"> {row.unit}</span>}
        {row.origin && <span className="sheet-note"> · {row.origin}</span>}
        {row.note && <span className="sheet-note"> · {row.note}</span>}
      </dd>
    </div>
  );
}

/**
 * The spec sheet of the book as it stands, laid out to be printed or saved as
 * a PDF by the browser. It replaces the tool on screen rather than opening in
 * a tab of its own: the selection is not saved (see `state.md`), so a new tab
 * would print the default book and not this one.
 *
 * Only the toolbar is for the screen; everything the stylesheet hides when
 * printing hides under `.sheet-toolbar`, and the rest of the tool is not
 * mounted at all while this is.
 */
export function SpecSheetPage({ onBack }: { onBack: () => void }) {
  const { sections, exampleCatalogs, sources } = useSpecSheet();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Whoever opened it is looking at a different page now; say so.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="sheet-page">
      <div className="sheet-toolbar">
        <button type="button" onClick={onBack}>Volver a la herramienta</button>
        <button type="button" className="sheet-print" onClick={() => window.print()}>
          Imprimir o guardar como PDF
        </button>
      </div>

      <article className="sheet-doc" aria-labelledby="sheet-title">
        <header className="sheet-head">
          <h1 id="sheet-title" className="sheet-title" tabIndex={-1} ref={titleRef}>Ficha técnica del libro</h1>
          <p className="sheet-subtitle">PliegoStack · valores preliminares, confirmar con la imprenta</p>
        </header>

        {sections.map(section => (
          <section key={section.id} className="sheet-section" aria-labelledby={`sheet-${section.id}`}>
            <h2 id={`sheet-${section.id}`} className="sheet-section-title">{section.title}</h2>
            <dl className="sheet-rows">
              {section.rows.map(row => <Row key={row.label} row={row} />)}
            </dl>
          </section>
        ))}

        <section className="sheet-section" aria-labelledby="sheet-origin">
          <h2 id="sheet-origin" className="sheet-section-title">Origen de los datos</h2>
          {exampleCatalogs.length > 0 && (
            <p className="sheet-example">
              Datos de ejemplo: {exampleCatalogs.join(', ')}.
              Estos valores no vienen de una imprenta y deben confirmarse con ella antes de producir.
            </p>
          )}
          <dl className="sheet-rows">
            {sources.map(item => (
              <div key={item.catalog} className="sheet-row sheet-row-source">
                <dt>{item.catalog}</dt>
                <dd>
                  {item.source}
                  {item.provisional && <span className="sheet-note"> · de ejemplo</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </div>
  );
}
