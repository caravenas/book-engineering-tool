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

/**
 * One place for everything the catalogs hold, instead of an "edit", an "add"
 * and a "hide" seeded through the steps in eleven-pixel links, each catalog
 * offering them a little differently.
 *
 * Built on <dialog> and showModal(), for the reason the steps are built on
 * <details>: the platform already traps focus, closes on Escape and makes the
 * rest of the page inert, and those are exactly the parts that get written
 * badly by hand.
 */

type CatalogId = 'proportions' | 'substrates' | 'bindings' | 'presses' | 'sheetSizes' | 'foldingSchemes' | 'covers';

interface CatalogPanelApi {
  /** Opens the panel showing one catalog. */
  open: (catalog: CatalogId) => void;
}

const CatalogPanelContext = createContext<CatalogPanelApi | null>(null);

/** Lets a control anywhere in the tree open the panel at its own catalog. */
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
        title: 'Proporciones',
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
        title: 'Papeles',
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
        title: 'Encuadernaciones',
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
        title: 'Prensas',
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
        title: 'Pliegos',
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
        title: 'Esquemas de plegado',
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
        title: 'Tapas',
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<CatalogId>('presses');
  const [isOpen, setIsOpen] = useState(false);
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

  const open = useCallback((id: CatalogId) => {
    setSelected(id);
    setEditingKey(null);
    setEditingGrammage(null);
    const element = dialog.current;
    if (!element) return;
    /*
     * showModal brings the focus trap, the inert backdrop and Escape with it,
     * but it is not everywhere: an environment without it, jsdom among them,
     * still gets a panel that opens, without those three. Better than a panel
     * that throws.
     */
    if (typeof element.showModal === 'function') element.showModal();
    else element.open = true;
    setIsOpen(true);
  }, []);

  const api = useMemo(() => ({ open }), [open]);

  const close = useCallback(() => {
    const element = dialog.current;
    if (!element) return;
    if (typeof element.close === 'function') element.close();
    else element.open = false;
    setIsOpen(false);
  }, []);

  /*
   * A panel left open by an unmounting tree would keep the rest of the page
   * inert with nothing to close it. The element is captured while it still
   * exists: by the time the cleanup runs, React has already emptied the ref.
   */
  useEffect(() => {
    const element = dialog.current;
    return () => {
      if (element && typeof element.close === 'function' && element.open) element.close();
    };
  }, []);

  return (
    <CatalogPanelContext.Provider value={api}>
      {children}

      <dialog
        ref={dialog}
        className="catalog-dialog"
        aria-label="Catálogo"
        // Escape closes a dialog without going through anything of ours.
        onClose={() => setIsOpen(false)}
      >
        <div className="catalog-header">
          <h2 className="catalog-title">Catálogo</h2>
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

        {/*
          * Only while open: a closed dialog still renders its children, so the
          * seven catalogs would be computed on every keystroke elsewhere in
          * the app, and their entries would sit in the accessibility tree
          * where nobody asked for them.
          */}
        {isOpen && (
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
                    onClick={() => { setSelected(item.id); setEditingKey(null); setEditingGrammage(null); }}
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
        )}
      </dialog>
    </CatalogPanelContext.Provider>
  );
}
