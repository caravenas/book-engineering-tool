import { useMemo, type ReactNode } from 'react';
import {
  useBookStore,
  getAllProportions,
  getAllSubstrates,
  getAllGrammageOptions,
  getAllSheetSizes,
  getAllPresses,
  getAllBindings,
  getAllCovers,
} from '../store/useBookStore';
import { planSignatures, sheetFitsPress } from '../engine/signatures';
import { useCatalogPanel, type CatalogId } from './CatalogPanel';
import { useProvisionalCatalogs } from './catalogNames';
import type { Binding, Cover, FoldingScheme, Press, SheetSize, Substrate } from '../types';

/**
 * Everything the catalogs hold, drawn at once.
 *
 * Until R-22 the only way to see a catalog whole was the editing dialog,
 * which shows one catalog at a time as a list of names: it answers "what can
 * I change" and not "what are my options". The design canvas gives the
 * catalog the middle of the screen and draws it — papers as a grid of
 * calibers, sheets and presses at scale, bindings and folds as the shapes
 * they make — and every cell of it applies itself to the book on a click.
 *
 * Reading and editing stay apart: this board chooses, and the dialog behind
 * each section's «editar» adds, patches and hides. A surface that did both
 * would have to explain, on every cell, whether a click was about this book
 * or about every book.
 */

/** Millimetres per pixel, per drawing, so the shapes of one section compare. */
const SHEET_SCALE = 10;
const PRESS_SCALE = 30;
const PROPORTION_HEIGHT = 34;

/** A section of the board: a letter, a title, the note in its margin. */
function Section({
  letter, title, note, catalog, editLabel, children,
}: {
  letter: string;
  title: string;
  note?: string;
  catalog: CatalogId;
  editLabel: string;
  children: ReactNode;
}) {
  const { open } = useCatalogPanel();

  return (
    <section className="board-section" aria-label={title}>
      <div className="board-section-head">
        <span className="board-section-letter">{letter}</span>
        <h3 className="board-section-title">{title}</h3>
        {note && <span className="board-section-note">{note}</span>}
        <button
          type="button"
          className="board-section-edit"
          aria-label={editLabel}
          onClick={() => open(catalog)}
        >
          editar
        </button>
      </div>
      {children}
    </section>
  );
}

/** The page outline a proportion makes, at a fixed height so the widths compare. */
function ProportionShape({ ratio }: { ratio: [number, number] }) {
  const [width, height] = ratio;
  const drawnWidth = width > 0 && height > 0
    ? Math.min(60, Math.max(6, (PROPORTION_HEIGHT * width) / height))
    : PROPORTION_HEIGHT;

  return (
    <span
      className="board-proportion-shape"
      style={{ width: `${drawnWidth}px`, height: `${PROPORTION_HEIGHT}px` }}
    />
  );
}

/** The binding's spine, drawn the way the step draws it: stitches, glue, wire. */
function BindingMark({ binding }: { binding: Binding }) {
  const stitched = binding.nests && binding.requiresSignatureMultiple;
  const glued = !binding.nests;

  return (
    <svg className="board-binding-mark" viewBox="0 0 120 16" aria-hidden="true">
      <rect x="4" y="3" width="112" height="10" fill="none" stroke="currentColor" />
      <line
        x1="4" y1="8" x2="116" y2="8"
        stroke="currentColor"
        strokeWidth={glued ? 3 : 1}
        strokeDasharray={stitched ? '6 4' : undefined}
      />
      {binding.nests && !binding.requiresSignatureMultiple && (
        <>
          <circle cx="40" cy="8" r="2" fill="currentColor" />
          <circle cx="80" cy="8" r="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** What a binding admits, in the words the catalog declares it in. */
function bindingRule(binding: Binding): string {
  const range = `${binding.minPages}–${binding.maxPages} pág.`;
  const step = binding.requiresSignatureMultiple
    ? 'paso = firma'
    : `paso ${binding.pageMultiple}`;
  return `${range} · ${step}`;
}

/** The scheme's grid: how many pages a side of the sheet carries, and how. */
function FoldGrid({ scheme, selected }: { scheme: FoldingScheme; selected: boolean }) {
  return (
    <span
      className={`board-fold-grid${selected ? ' selected' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${scheme.cols}, 1fr)`,
        gridTemplateRows: `repeat(${scheme.rows}, 1fr)`,
      }}
    >
      {Array.from({ length: scheme.cols * scheme.rows }, (_, index) => <span key={index} />)}
    </span>
  );
}

/** The cover opened flat: flaps dashed, boards drawn thicker than paper. */
function CoverShape({ cover }: { cover: Cover }) {
  const flap = cover.flapWidth_mm > 0 ? Math.max(6, cover.flapWidth_mm / 6) : 0;
  const board = cover.boardThickness_mm > 0;

  return (
    <span className="board-cover-shape">
      {flap > 0 && <span className="board-cover-flap" style={{ width: `${flap}px` }} />}
      <span className={`board-cover-panel${board ? ' board' : ''}`} />
      <span className={`board-cover-spine${board ? ' board' : ''}`} />
      <span className={`board-cover-panel${board ? ' board' : ''}`} />
      {flap > 0 && <span className="board-cover-flap" style={{ width: `${flap}px` }} />}
    </span>
  );
}

/** What a cover is made of and what it adds, read from the entry itself. */
function coverSpec(cover: Cover, substrates: Substrate[]): string {
  const paper = substrates.find(item => item.id === cover.substrateId);
  const parts = [`${paper?.name ?? cover.substrateId} ${cover.grammage} g/m²`];
  if (cover.flapWidth_mm > 0) parts.push(`solapas ${cover.flapWidth_mm} mm`);
  if (cover.boardThickness_mm > 0) {
    parts.push(`cartón ${cover.boardThickness_mm} mm`);
    parts.push(`ceja ${cover.squares_mm} mm`);
  }
  return parts.join(' · ');
}

export function CatalogBoard() {
  const {
    catalog,
    proportionId, customProportions, proportionPatches, hiddenProportionLabels, setProportion,
    substrateId, selectedGrammage, customSubstrates, substratePatches, hiddenSubstrateIds, customGrammages,
    setSubstrate, setGrammage,
    sheetSizeId, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds, setSheetSize,
    pressId, customPresses, pressPatches, hiddenPressIds, setPress,
    bindingId, customBindings, bindingPatches, hiddenBindingIds, setBinding,
    coverId, customCovers, coverPatches, hiddenCoverIds, setCover,
    foldingSchemeId, setFoldingScheme,
    pageWidth_mm, pageHeight_mm, bleed_mm, totalPages,
  } = useBookStore();

  const proportions = catalog ? getAllProportions(catalog, customProportions, proportionPatches, hiddenProportionLabels) : [];
  const substrates = catalog ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds) : customSubstrates;
  const sheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;
  const presses = catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses;
  const bindings = catalog ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds) : customBindings;
  const covers = catalog ? getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds) : customCovers;
  const schemes = catalog?.foldingSchemes ?? [];
  const press = presses.find(item => item.id === pressId) ?? null;
  const provisional = useProvisionalCatalogs();

  /*
   * The columns of the paper grid: every weight any paper sells, in order.
   * The canvas draws nine columns and fills all of them, because there a
   * caliper is the weight times a factor; here a caliper is declared per
   * weight, and a paper that does not sell 250 g/m² has nothing to put in
   * that column. The hole is the point: it says which papers reach which
   * weights, which a computed grid cannot.
   */
  const grammages = useMemo(() => {
    const all = new Set<number>();
    for (const substrate of substrates) {
      for (const option of getAllGrammageOptions(substrates, substrate.id, customGrammages)) {
        all.add(option.grammage);
      }
    }
    return [...all].sort((a, b) => a - b);
  }, [substrates, customGrammages]);

  /** The caliper each paper declares, by weight, so the grid is one lookup. */
  const calipers = useMemo(() => {
    const byPaper = new Map<string, Map<number, number>>();
    for (const substrate of substrates) {
      const row = new Map<number, number>();
      for (const option of getAllGrammageOptions(substrates, substrate.id, customGrammages)) {
        row.set(option.grammage, option.caliper);
      }
      byPaper.set(substrate.id, row);
    }
    return byPaper;
  }, [substrates, customGrammages]);

  const thickest = useMemo(
    () => Math.max(1, ...[...calipers.values()].flatMap(row => [...row.values()])),
    [calipers]
  );

  /**
   * What each sheet would give on the press in use: the pages a side carries
   * and the sheets one copy costs, worked out by the same engine the
   * imposition step uses, so the board and the step can never disagree. A
   * sheet the press cannot take is said to be out of reach instead.
   */
  const sheetFits = useMemo(() => {
    const byId = new Map<string, { usable: boolean; text: string }>();
    if (!press || !catalog) return byId;

    for (const sheet of sheets) {
      if (!sheetFitsPress(sheet.width_mm, sheet.height_mm, press)) {
        byId.set(sheet.id, { usable: false, text: `no cabe en ${press.name}` });
        continue;
      }
      try {
        const plan = planSignatures({
          pageWidth_mm, pageHeight_mm, bleed_mm,
          sheetWidth_mm: sheet.width_mm, sheetHeight_mm: sheet.height_mm,
          press, schemes, totalPages,
        });
        const selected = plan.selected;
        byId.set(sheet.id, selected
          ? { usable: true, text: `${selected.cols * selected.rows} pág./cara · ${selected.sheetsPerCopy} pliegos` }
          : { usable: true, text: 'ningún esquema cabe' });
      } catch {
        // An unusable page size is the page step's problem, not this board's:
        // the sheet is still a sheet, it just cannot be measured against a
        // format that is not one yet.
        byId.set(sheet.id, { usable: true, text: 'formato sin definir' });
      }
    }
    return byId;
  }, [press, catalog, sheets, schemes, pageWidth_mm, pageHeight_mm, bleed_mm, totalPages]);

  if (!catalog) return null;

  return (
    <div className="catalog-board">
      <Section
        letter="A"
        title="Formato · proporciones"
        note="toca una para aplicarla"
        catalog="proportions"
        editLabel="Editar el catálogo de proporciones"
      >
        <div className="board-proportions">
          {proportions.map(proportion => (
            <button
              key={proportion.label}
              type="button"
              className={`board-cell board-proportion${proportion.label === proportionId ? ' selected' : ''}`}
              aria-pressed={proportion.label === proportionId}
              aria-label={`Proporción ${proportion.label}, ${proportion.ratio[0]} a ${proportion.ratio[1]}`}
              title={proportion.description}
              onClick={() => setProportion(proportion.label)}
            >
              <ProportionShape ratio={proportion.ratio} />
              <span className="board-proportion-name">{proportion.label}</span>
              <span className="board-figure">{proportion.ratio[0]} : {proportion.ratio[1]}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* The unit stays out of the title, which is set in capitals: `µ`
          uppercases to a Greek capital mu, so "calibre en µm" came out of the
          title reading "CALIBRE EN ΜM". */}
      <Section
        letter="B"
        title="Papeles"
        note="columnas en g/m², celdas en µm · toca una para aplicarla"
        catalog="substrates"
        editLabel="Editar el catálogo de papeles"
      >
        <div
          className="board-paper-grid"
          style={{ gridTemplateColumns: `minmax(200px, 1.6fr) repeat(${grammages.length}, minmax(0, 1fr))` }}
        >
          <span className="board-grid-head">Papel</span>
          {grammages.map(grammage => (
            <span key={grammage} className="board-grid-head board-grid-head-figure">{grammage}</span>
          ))}

          {substrates.map(substrate => {
            const row = calipers.get(substrate.id);
            return [
              <div key={`${substrate.id}-name`} className="board-paper-name">
                <span className="board-paper-title">{substrate.name}</span>
                {/* What the catalog says the paper is for. Not `type`, which
                    the shipped files set to the paper's own id. */}
                <span className="board-paper-note">{substrate.description}</span>
              </div>,
              ...grammages.map(grammage => {
                const caliper = row?.get(grammage);
                if (caliper === undefined) {
                  return (
                    <span
                      key={`${substrate.id}-${grammage}`}
                      className="board-paper-cell board-paper-cell-empty"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  );
                }
                const selected = substrate.id === substrateId && grammage === selectedGrammage;
                return (
                  <button
                    key={`${substrate.id}-${grammage}`}
                    type="button"
                    className={`board-paper-cell${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    aria-label={`${substrate.name}, ${grammage} gramos, calibre ${caliper} micras`}
                    onClick={() => { setSubstrate(substrate.id); setGrammage(grammage); }}
                  >
                    {/* The caliper drawn as well as written: a column of
                        numbers says which is larger only after reading them
                        all, and the whole point of the grid is the shape the
                        thicknesses make across it. */}
                    <span
                      className="board-caliper-tick"
                      style={{ height: `${Math.max(2, Math.round((caliper / thickest) * 18))}px` }}
                    />
                    {caliper}
                  </button>
                );
              }),
            ];
          })}
        </div>
      </Section>

      <div className="board-pair">
        <Section
          letter="C"
          title="Pliegos y prensas"
          note={`escala 1:${SHEET_SCALE} · la trama es la pinza`}
          catalog="sheetSizes"
          editLabel="Editar el catálogo de pliegos"
        >
          <div className="board-sheets">
            {sheets.map((sheet: SheetSize) => {
              const fit = sheetFits.get(sheet.id);
              const usable = fit?.usable ?? true;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  className={`board-cell board-sheet${sheet.id === sheetSizeId ? ' selected' : ''}`}
                  aria-pressed={sheet.id === sheetSizeId}
                  aria-label={`Pliego ${sheet.name}, ${sheet.width_mm} por ${sheet.height_mm} milímetros`}
                  disabled={!usable}
                  onClick={() => setSheetSize(sheet.id)}
                >
                  <span
                    className="board-sheet-shape"
                    style={{ width: `${sheet.width_mm / SHEET_SCALE}px`, height: `${sheet.height_mm / SHEET_SCALE}px` }}
                  >
                    {press && (
                      <span
                        className="board-sheet-gripper"
                        style={{ height: `${Math.max(2, press.gripperMargin_mm / SHEET_SCALE)}px` }}
                      />
                    )}
                  </span>
                  <span className="board-sheet-name">{sheet.name}</span>
                  <span className="board-sheet-fit">{fit?.text ?? ''}</span>
                </button>
              );
            })}
          </div>

          <div className="board-rows">
            {presses.map((item: Press) => (
              <button
                key={item.id}
                type="button"
                className={`board-row${item.id === pressId ? ' selected' : ''}`}
                aria-pressed={item.id === pressId}
                aria-label={`Prensa ${item.name}, pinza ${item.gripperMargin_mm} milímetros`}
                onClick={() => setPress(item.id)}
              >
                <span
                  className="board-press-shape"
                  style={{
                    width: `${item.maxSheetWidth_mm / PRESS_SCALE}px`,
                    height: `${item.maxSheetHeight_mm / PRESS_SCALE}px`,
                    borderTopWidth: `${Math.max(2, item.gripperMargin_mm / 3)}px`,
                  }}
                />
                <span className="board-row-name">{item.name}</span>
                <span className="board-figure">pinza {item.gripperMargin_mm} mm</span>
                <span className="board-figure">máx. {item.maxSheetWidth_mm / 10} × {item.maxSheetHeight_mm / 10} cm</span>
              </button>
            ))}
          </div>
        </Section>

        <Section
          letter="D"
          title="Encuadernación y plegado"
          note="el paso es el múltiplo de páginas admitido"
          catalog="bindings"
          editLabel="Editar el catálogo de encuadernaciones"
        >
          <div className="board-rows">
            {bindings.map(binding => (
              <button
                key={binding.id}
                type="button"
                className={`board-row${binding.id === bindingId ? ' selected' : ''}`}
                aria-pressed={binding.id === bindingId}
                aria-label={`Encuadernación ${binding.name}, ${bindingRule(binding)}`}
                onClick={() => setBinding(binding.id)}
              >
                <BindingMark binding={binding} />
                <span className="board-row-name">{binding.name}</span>
                <span className="board-figure">{bindingRule(binding)}</span>
                <span className="board-figure">lomo +{binding.spineAllowance_mm} mm</span>
              </button>
            ))}
          </div>

          <div className="board-folds">
            {/* The scheme the imposition picks on its own, first, because it
                is what the tool is doing until someone overrides it. */}
            <button
              type="button"
              className={`board-cell board-fold${foldingSchemeId === null ? ' selected' : ''}`}
              aria-pressed={foldingSchemeId === null}
              aria-label="Esquema automático, el de menor desperdicio"
              onClick={() => setFoldingScheme(null)}
            >
              <span className="board-fold-grid board-fold-auto" aria-hidden="true">auto</span>
              <span className="board-fold-name">Automático</span>
              <span className="board-figure">menor desperdicio</span>
            </button>
            {schemes.map(scheme => (
              <button
                key={scheme.id}
                type="button"
                className={`board-cell board-fold${scheme.id === foldingSchemeId ? ' selected' : ''}`}
                aria-pressed={scheme.id === foldingSchemeId}
                aria-label={`${scheme.name}, ${scheme.pagesPerSignature} páginas por firma`}
                onClick={() => setFoldingScheme(scheme.id)}
              >
                <FoldGrid scheme={scheme} selected={scheme.id === foldingSchemeId} />
                {/* The count first and the name under it, as the imposition
                    step has them: a scheme is chosen by how many pages it
                    carries, and its name here is a whole sentence. */}
                <span className="board-fold-name">{scheme.pagesPerSignature} pág.</span>
                <span className="board-figure">{scheme.cols}×{scheme.rows} · {scheme.name}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section
        letter="E"
        title="Tapas"
        note="el lomo es el del libro en curso"
        catalog="covers"
        editLabel="Editar el catálogo de tapas"
      >
        <div className="board-covers">
          {covers.map(cover => (
            <button
              key={cover.id}
              type="button"
              className={`board-cell board-cover${cover.id === coverId ? ' selected' : ''}`}
              aria-pressed={cover.id === coverId}
              aria-label={`Tapa ${cover.name}`}
              onClick={() => setCover(cover.id)}
            >
              <CoverShape cover={cover} />
              <span className="board-cover-name">{cover.name}</span>
              <span className="board-figure">{coverSpec(cover, substrates)}</span>
            </button>
          ))}
        </div>
      </Section>

      {/*
        * Whose numbers these are, said where they are read. The header says it
        * once for the whole tool; here it names the directory, because the
        * board is where someone decides a value is wrong and goes looking for
        * the file that holds it. Which catalogs are still the repository's is
        * read from the files themselves, so replacing them changes this line.
        */}
      <p className="board-foot">
        {provisional.length > 0 && <>Datos de ejemplo en {provisional.join(', ')}. </>}
        Todo sale de <span className="catalog-file">public/config/</span>. Cada «editar» abre el catálogo que los cambia.
      </p>
    </div>
  );
}
