import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  useBookStore,
  getAllProportions,
  getAllSheetSizes,
  getAllPresses,
  getAllBindings,
  getSelectedBindingInfo,
  getAllGrammageOptions,
  getAllSubstrates,
  getAllCovers,
} from '../store/useBookStore';
import { getCatalogOrigin, ORIGIN_LABEL } from './CatalogOrigin';
import { CatalogEntryForm } from './CatalogEntryForm';
import { usePressEditor, useSheetSizeEditor, useBindingEditor, useProportionEditor, useGrammageEditor, useSubstrateEditor, useCoverEditor } from './catalogEditors';
import { useCentralView } from './CentralView';
import { CATALOG_TITLES } from './catalogNames';

/**
 * One place for everything the catalogs hold, instead of an "edit", an "add"
 * and a "hide" seeded through the steps in eleven-pixel links, each catalog
 * offering them a little differently.
 *
 * It was a modal <dialog> from R-4a to R-24, for the reason the steps are
 * built on <details>: the platform traps focus, closes on Escape and makes
 * the rest of the page inert, and those are the parts that get written badly
 * by hand. R-24 makes the catalog a view of its own and this the other half
 * of it — the board reads and applies, this edits — so a sheet of glass over
 * the whole tool is the wrong thing: it hid the view its own «editar» was
 * pressed in. It slides in over the board instead, and Escape still closes
 * it, because that is the one thing a dialog gave that a panel has to be
 * told.
 */

export type CatalogId = 'proportions' | 'substrates' | 'bindings' | 'presses' | 'sheetSizes' | 'foldingSchemes' | 'covers';

interface CatalogPanelApi {
  /** Which catalog the editor is on. It keeps the last one while closed, so
   *  the panel still has something to draw while it slides away. */
  catalog: CatalogId;
  /** Whether the editor is the thing the catalog view is showing. */
  isOpen: boolean;
  /** Shows the editor on one catalog, switching to the catalog view first. */
  open: (catalog: CatalogId) => void;
  /** Moves the editor to another catalog without closing it. */
  select: (catalog: CatalogId) => void;
  close: () => void;
}

const CatalogPanelContext = createContext<CatalogPanelApi | null>(null);

/** Lets a control anywhere in the tree open the editor at its own catalog. */
export function useCatalogPanel(): CatalogPanelApi {
  const api = useContext(CatalogPanelContext);
  if (!api) throw new Error('useCatalogPanel used outside CatalogPanelProvider');
  return api;
}

interface CatalogEntry {
  key: string;
  name: string;
  detail: string;
  origin: 'own' | 'edited' | 'factory';
}

interface CatalogDescriptor {
  id: CatalogId;
  group: 'Formato' | 'Papel' | 'Producción';
  title: string;
  description: string;
  file: string;
  /**
   * What that file declares about where its numbers come from, or null for a
   * file that declares nothing. Read from the catalog rather than written
   * here, so replacing the shipped data replaces this line with it.
   */
  source: string | null;
  /** A catalog with no user layer behind it: it can be read and nothing else. */
  readOnly: boolean;
  entries: CatalogEntry[];
}

const GROUPS = ['Formato', 'Papel', 'Producción'] as const;

function useCatalogs(): CatalogDescriptor[] {
  const {
    catalog,
    customProportions,
    proportionPatches,
    hiddenProportionLabels,
    customSheetSizes,
    sheetSizePatches,
    hiddenSheetSizeIds,
    customPresses,
    pressPatches,
    hiddenPressIds,
    customSubstrates,
    substratePatches,
    hiddenSubstrateIds,
    customCovers,
    coverPatches,
    hiddenCoverIds,
    customBindings,
    bindingPatches,
    hiddenBindingIds,
  } = useBookStore();

  return useMemo(() => {
    if (!catalog) return [];

    const proportions = getAllProportions(catalog, customProportions, proportionPatches, hiddenProportionLabels);
    const sheetSizes = getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds);
    const presses = getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds);
    const substrates = getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds);
    const covers = getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds);
    const bindings = getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds);

    return [
      {
        id: 'proportions',
        group: 'Formato',
        title: CATALOG_TITLES.proportions,
        description: 'La relación entre ancho y alto de la página.',
        file: 'config/formatos.json',
        source: null,
        readOnly: false,
        entries: proportions.map(item => ({
          key: item.label,
          name: item.label,
          detail: `${item.ratio[0]} : ${item.ratio[1]}`,
          origin: getCatalogOrigin(
            item.label,
            customProportions.map(entry => entry.label),
            proportionPatches.map(patch => patch.label)
          ),
        })),
      },
      {
        id: 'substrates',
        group: 'Papel',
        title: CATALOG_TITLES.substrates,
        description: 'Los papeles del interior, con los gramajes que cada uno ofrece.',
        file: 'config/sustratos.json',
        source: catalog.substratesSource,
        readOnly: false,
        entries: substrates.map(item => ({
          key: item.id,
          name: item.name,
          detail: `${item.options.length} gramajes`,
          origin: getCatalogOrigin(item.id, customSubstrates.map(entry => entry.id), substratePatches.map(patch => patch.id)),
        })),
      },
      {
        id: 'bindings',
        group: 'Producción',
        title: CATALOG_TITLES.bindings,
        description: 'El método, con las páginas que admite y lo que aporta al lomo.',
        file: 'config/encuadernaciones.json',
        source: catalog.bindingsSource,
        readOnly: false,
        entries: bindings.map(item => ({
          key: item.id,
          name: item.name,
          detail: `${item.minPages}–${item.maxPages} págs, múltiplo de ${item.pageMultiple}`,
          origin: getCatalogOrigin(item.id, customBindings.map(entry => entry.id), bindingPatches.map(patch => patch.id)),
        })),
      },
      {
        id: 'presses',
        group: 'Producción',
        title: CATALOG_TITLES.presses,
        description: 'Definen el pliego máximo y los márgenes que la imposición descuenta.',
        file: 'config/maquinas.json',
        source: catalog.pressesSource,
        readOnly: false,
        entries: presses.map(item => ({
          key: item.id,
          name: item.name,
          detail: `${item.maxSheetWidth_mm} × ${item.maxSheetHeight_mm} mm`,
          origin: getCatalogOrigin(item.id, customPresses.map(entry => entry.id), pressPatches.map(patch => patch.id)),
        })),
      },
      {
        id: 'sheetSizes',
        group: 'Producción',
        title: CATALOG_TITLES.sheetSizes,
        description: 'El papel tal como llega a la prensa, antes de cortar.',
        file: 'config/pliegos.json',
        source: catalog.sheetSizesSource,
        readOnly: false,
        entries: sheetSizes.map(item => ({
          key: item.id,
          name: item.name,
          detail: `${item.width_mm} × ${item.height_mm} mm`,
          origin: getCatalogOrigin(item.id, customSheetSizes.map(entry => entry.id), sheetSizePatches.map(patch => patch.id)),
        })),
      },
      {
        id: 'foldingSchemes',
        group: 'Producción',
        title: CATALOG_TITLES.foldingSchemes,
        description: 'Cómo se dobla un pliego y en qué orden quedan sus páginas.',
        file: 'config/esquemas.json',
        source: catalog.foldingSchemesSource,
        readOnly: true,
        entries: catalog.foldingSchemes.map(item => ({
          key: item.id,
          name: item.name,
          detail: `${item.pagesPerSignature} págs, ${item.cols} × ${item.rows}`,
          origin: 'factory' as const,
        })),
      },
      {
        id: 'covers',
        group: 'Producción',
        title: CATALOG_TITLES.covers,
        description: 'El tipo de tapa, con sus solapas, cejas y dobleces.',
        file: 'config/tapas.json',
        source: catalog.coversSource,
        readOnly: false,
        entries: covers.map(item => ({
          key: item.id,
          name: item.name,
          detail: item.kind === 'dura' ? 'tapa dura' : 'tapa blanda',
          origin: getCatalogOrigin(item.id, customCovers.map(entry => entry.id), coverPatches.map(patch => patch.id)),
        })),
      },
    ];
  }, [
    catalog, customProportions, proportionPatches, hiddenProportionLabels,
    customSubstrates, substratePatches, hiddenSubstrateIds,
    customCovers, coverPatches, hiddenCoverIds,
    customSheetSizes, sheetSizePatches, hiddenSheetSizeIds,
    customPresses, pressPatches, hiddenPressIds,
    customBindings, bindingPatches, hiddenBindingIds,
  ]);
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function CatalogPanelProvider({ children }: { children: ReactNode }) {
  const { show } = useCentralView();
  const [catalog, setCatalog] = useState<CatalogId>('presses');
  const [isOpen, setIsOpen] = useState(false);
  /*
   * Where the keyboard was when the editor took over. A modal gave this for
   * free; a panel has to be told, and without it a reader who opened the
   * editor from a step's own call came back to the top of the document.
   *
   * It is remembered here rather than in the view, because the view is not
   * always there to remember it: opening the editor from a step switches the
   * middle of the screen, so the catalog view mounts with the editor already
   * open and never sees the moment the focus left.
   */
  const cameFrom = useRef<HTMLElement | null>(null);

  /*
   * Opening the editor from a step's own call means leaving whatever the
   * middle of the screen was showing: the editor lives in the catalog view
   * now, so the way in has to take you there.
   */
  const open = useCallback((id: CatalogId) => {
    cameFrom.current = document.activeElement as HTMLElement | null;
    setCatalog(id);
    setIsOpen(true);
    show('catalog');
  }, [show]);

  const select = useCallback((id: CatalogId) => setCatalog(id), []);

  const close = useCallback(() => {
    setIsOpen(false);
    const previous = cameFrom.current;
    cameFrom.current = null;
    /*
     * Only if it is still on the page. A board section's «editar» is covered
     * by the very panel it opened, so by now it is gone; a step's call is
     * beside the panel and survives, which is the case worth handling.
     */
    if (previous?.isConnected) previous.focus();
  }, []);
  const api = useMemo(
    () => ({ catalog, isOpen, open, select, close }),
    [catalog, isOpen, open, select, close]
  );

  return <CatalogPanelContext.Provider value={api}>{children}</CatalogPanelContext.Provider>;
}

/**
 * The editor itself: the seven catalogs, the entries of the one in view, and
 * the form that adds, patches and hides them.
 */
export function CatalogEditor() {
  const { catalog: selected, select, close } = useCatalogPanel();
  /*
   * Which entry the form is pointed at. Deliberately not the book's own
   * selection: opening the catalog to fix a typo in a press nobody is using
   * must not quietly reprint the book on it. Null means "whatever the book
   * is made of", which is what the catalog opens on.
   */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingGrammage, setEditingGrammage] = useState<number | null>(null);
  const catalogs = useCatalogs();
  const current = catalogs.find(item => item.id === selected) ?? null;
  /*
   * A key survives only while its entry does: deleting or hiding the entry
   * being edited leaves the form pointed at nothing, so it falls back to the
   * book's selection rather than showing an empty form.
   */
  const target = current?.entries.some(entry => entry.key === editingKey) ? editingKey : null;
  const pressEditor = usePressEditor(target);
  const sheetSizeEditor = useSheetSizeEditor(target);
  const bindingEditor = useBindingEditor(target);
  const proportionEditor = useProportionEditor(target);
  const substrateEditor = useSubstrateEditor(target);
  const coverEditor = useCoverEditor(target);
  const editingPaper = selected === 'substrates' ? target : null;
  const grammageEditor = useGrammageEditor(editingPaper, editingGrammage);
  const {
    // The book's own selections are not read here any more: since R-9 each
    // editor falls back to them on its own, and the panel points at whatever
    // the list chose. `substrateId` stays because the weight list still needs
    // a paper to fall back to before anything is chosen.
    substrateId, selectedGrammage, customGrammages,
    customSubstrates, substratePatches, hiddenSubstrateIds,
    catalog, customBindings, bindingPatches, hiddenBindingIds,
    userLayerStorageAvailable, userLayerWriteFailed,
  } = useBookStore();
  const storageWorks = userLayerStorageAvailable && !userLayerWriteFailed;
  /*
   * About the binding the catalog is pointed at, not the one the book is made
   * of: the note sits under that form and says "el método elegido", and read
   * from the book it described a different method from the one on screen.
   */
  const { hasFlatSpine } = catalog && bindingEditor.entry
    ? getSelectedBindingInfo(getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds), bindingEditor.entry.id)
    : { hasFlatSpine: true };

  /*
   * The key the form is on, per catalog: the chosen one when there is one,
   * and the book's own entry when there is not. Read from the editors rather
   * than recomputed, so the mark on the list cannot drift from the form.
   */
  const currentKey = (id: CatalogId): string | null => {
    switch (id) {
      case 'presses': return pressEditor.entry?.id ?? null;
      case 'sheetSizes': return sheetSizeEditor.entry?.id ?? null;
      case 'bindings': return bindingEditor.entry?.id ?? null;
      case 'proportions': return proportionEditor.entry?.label ?? null;
      case 'substrates': return substrateEditor.entry?.id ?? null;
      case 'covers': return coverEditor.entry?.id ?? null;
      // The folding schemes have no user layer and no form, so nothing is
      // under one: the list marks nothing rather than marking the first row.
      case 'foldingSchemes': return null;
    }
  };

  /*
   * Escape used to belong to the dialog. A panel has to be told, and it is
   * the one thing about the dialog worth carrying over: it is how anyone who
   * opened the editor by mistake gets out of it without hunting for a button.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);

  /*
   * The panel takes the keyboard when it arrives, the way a dialog did. It is
   * the panel and not its close button that is focused, so what a reader
   * hears first is where they now are rather than the way back out.
   */
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);

  return (
      <div className="catalog-editor-panel" aria-label="Editar catálogo" tabIndex={-1} ref={panel}>
        <div className="catalog-header">
          <h2 className="catalog-title">Editar catálogo</h2>
          {/*
            * Where whether your changes survive belongs: beside the changes,
            * rather than as a notice floating above a page that may not be
            * showing any.
            */}
          <p className={`catalog-persistence${storageWorks ? '' : ' catalog-persistence-warning'}`}>
            {storageWorks ? 'Guardado en este navegador' : 'Solo para esta sesión'}
          </p>
          <button
            type="button"
            className="catalog-close"
            aria-label="Cerrar catálogo"
            onClick={close}
          >
            ×
          </button>
        </div>

        <div className="catalog-body">
          <nav className="catalog-nav" aria-label="Catálogos">
            {GROUPS.map(group => (
              <div key={group}>
                <span className="form-label">{group}</span>
                {catalogs.filter(item => item.group === group).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="catalog-nav-item"
                    // Without this the count runs into the title and a screen
                    // reader announces "Proporciones5"; the lock is a picture
                    // and says nothing at all.
                    aria-label={[
                      item.title,
                      item.entries.length === 1 ? '1 entrada' : `${item.entries.length} entradas`,
                      item.readOnly ? 'solo lectura' : null,
                    ].filter(Boolean).join(', ')}
                    aria-current={item.id === selected ? 'page' : undefined}
                    onClick={() => { select(item.id); setEditingKey(null); setEditingGrammage(null); }}
                  >
                    <span className="catalog-nav-name">{item.title}</span>
                    {item.readOnly && <LockIcon />}
                    <span className="catalog-nav-count">{item.entries.length}</span>
                  </button>
                ))}
              </div>
            ))}
            <p className="catalog-nav-note">
              Los candados marcan catálogos que por ahora solo se leen desde <span className="catalog-file">public/config/</span>.
            </p>
          </nav>

          <div className="catalog-content">
            {current && (() => {
              const formKey = currentKey(current.id) ?? 'nothing';
              return (
              <>
                <h3 className="catalog-content-title">{current.title}</h3>
                <p className="catalog-content-description">{current.description}</p>
                <p className="catalog-file">{current.file}</p>
                {current.source && <p className="catalog-source">{current.source}</p>}

                {/*
                  * Choosing here points the form at an entry; it does not
                  * change what the book is made of. The one the form is on
                  * is marked, because a form that edits "the selected entry"
                  * without saying which is the state R-9 set out to fix.
                  */}
                {/* Named apart from the weight list nested below it, which is
                    the same shape and belongs to one entry rather than the
                    catalog. */}
                <ul className="catalog-list catalog-entry-list">
                  {current.entries.map(entry => (
                    <li key={entry.key}>
                      <button
                        type="button"
                        className="catalog-list-item"
                        // Three cells run together otherwise, the way the nav
                        // items did: "Bond3 gramajesde fábrica".
                        aria-label={[entry.name, entry.detail, ORIGIN_LABEL[entry.origin]].join(', ')}
                        aria-current={entry.key === currentKey(current.id) ? 'true' : undefined}
                        onClick={() => { setEditingKey(entry.key); setEditingGrammage(null); }}
                      >
                        <span className="catalog-list-name">{entry.name}</span>
                        <span className="catalog-list-detail">{entry.detail}</span>
                        <span className="catalog-list-origin">{ORIGIN_LABEL[entry.origin]}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                {/*
                  * Keyed on the entry the form is actually on, which since
                  * R-9 is the one chosen in the list and not the one the book
                  * is made of. Keyed on the book's instead, picking a second
                  * row left the form mounted and carried the draft typed for
                  * the first onto it, where saving would have written it.
                  */}
                {current.id === 'presses' && <CatalogEntryForm key={formKey} editor={pressEditor} />}
                {current.id === 'sheetSizes' && <CatalogEntryForm key={formKey} editor={sheetSizeEditor} />}
                {current.id === 'bindings' && <CatalogEntryForm key={formKey} editor={bindingEditor} />}
                {current.id === 'proportions' && <CatalogEntryForm key={formKey} editor={proportionEditor} />}
                {current.id === 'covers' && <CatalogEntryForm key={formKey} editor={coverEditor} />}

                {/*
                  * Grammages are not a catalog beside papers: they hang off
                  * one, so they are shown inside the paper they belong to,
                  * for the paper currently chosen.
                  */}
                {current.id === 'substrates' && (
                  <>
                    <CatalogEntryForm key={substrateEditor.entry?.id ?? substrateId} editor={substrateEditor} />
                    <h4 className="catalog-content-title">
                      Gramajes de {substrateEditor.entry?.name ?? 'el papel elegido'}
                    </h4>
                    <ul className="catalog-list">
                      {(catalog ? getAllGrammageOptions(
                        getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds),
                        substrateEditor.entry?.id ?? substrateId,
                        customGrammages
                      ) : []).map(option => (
                        <li key={option.grammage}>
                          <button
                            type="button"
                            className="catalog-list-item"
                            aria-label={`${option.grammage} g/m², calibre ${option.caliper} µm`}
                            aria-current={option.grammage === (grammageEditor.entry?.grammage ?? null) ? 'true' : undefined}
                            onClick={() => setEditingGrammage(option.grammage)}
                          >
                            <span className="catalog-list-name">{option.grammage} g/m²</span>
                            <span className="catalog-list-detail">calibre {option.caliper} µm</span>
                            <span className="catalog-list-origin">
                              {customGrammages.some(custom => custom.substrateId === (substrateEditor.entry?.id ?? substrateId) && custom.grammage === option.grammage)
                                ? ORIGIN_LABEL.own
                                : ORIGIN_LABEL.factory}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <CatalogEntryForm
                      key={`${substrateEditor.entry?.id ?? substrateId}-${grammageEditor.entry?.grammage ?? selectedGrammage}`}
                      editor={grammageEditor}
                    />
                  </>
                )}

                {current.readOnly && (
                  <p className="calculation-note">
                    Este catálogo solo se lee. Para cambiarlo, edita <span className="catalog-file">{current.file}</span> y recarga.
                  </p>
                )}
                {current.id === 'substrates' && (
                  <p className="calculation-note">
                    Los gramajes admiten los tuyos, pero los de fábrica no se editan ni se ocultan: cuelgan del papel y no tienen identidad propia.
                  </p>
                )}
                {current.id === 'bindings' && !hasFlatSpine && (
                  <p className="calculation-note">
                    El método elegido anida los pliegos, así que el libro no tiene lomo plano.
                  </p>
                )}
              </>
              );
            })()}
          </div>
        </div>
      </div>
  );
}
