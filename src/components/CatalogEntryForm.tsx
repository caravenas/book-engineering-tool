import { useState } from 'react';

/**
 * One form for every catalog that can be edited, driven by a description of
 * the catalog rather than written once per catalog. Four of them would have
 * been four copies of the same twenty decisions — what a patch records, when
 * it is dropped, what a press of your own may do — and those decisions were
 * already got wrong once while there was only one copy.
 *
 * What differs between catalogs is the shape of an entry, so that is what a
 * descriptor carries: the fields, how to read an entry into them, and how to
 * turn the ones that changed back into the shape the store patches with. The
 * rules around them are the same everywhere and live here.
 */
export type FieldKind = 'text' | 'number' | 'boolean';

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  /**
   * A field the store cannot patch, shown so the entry can be recognised but
   * not offered for editing: a proportion is keyed by its own label, so
   * renaming one is not a change it can carry. Typing into it would look like
   * an edit and do nothing.
   */
  readOnly?: boolean;
}

export type FormValues = Record<string, string | boolean>;

export interface CatalogEditor<Entry> {
  /** What the catalog is called in a sentence: "una prensa tuya", "un pliego tuyo". */
  ownNoun: string;
  /** What the add button offers: "+ Nueva prensa". */
  addLabel: string;
  /** What the add button's submit says: "Añadir prensa". */
  addSubmitLabel: string;
  /** The hidden-entries line: (2) => "2 prensas de fábrica ocultas." */
  hiddenLine: (count: number) => string;
  /** The button that brings them back: "Mostrar prensas ocultas". */
  restoreLabel: string;
  fields: FieldSpec[];
  /** The entry as shown, patches included, or null when nothing is selected. */
  entry: Entry | null;
  /** The same entry as the shipped catalog defines it, or null for your own. */
  factory: Entry | null;
  origin: 'own' | 'edited' | 'factory';
  error: string | null;
  clearError: () => void;
  read: (entry: Entry) => FormValues;
  /** The changed fields, as the shape the store patches or adds with. */
  toChanges: (values: FormValues, changed: Set<string>) => Record<string, unknown>;
  add: (values: FormValues) => boolean;
  patch: (changes: Record<string, unknown>) => boolean;
  unpatch: () => void;
  hide: () => void;
  remove: () => void;
  hiddenCount: number;
  restoreHidden: () => void;
}

/** Blank is not zero: the store rejects a NaN and says so in its own words. */
export function toNumber(value: string | boolean): number {
  if (typeof value === 'boolean') return Number.NaN;
  return value.trim() === '' ? Number.NaN : Number(value);
}

/**
 * Whether a field holds something the store could use. Only consulted while
 * the store has refused the entry, to say which box is the problem rather
 * than marking all of them and leaving the reader to guess.
 */
function isUsable(kind: FieldKind, value: string | boolean): boolean {
  if (kind === 'boolean') return true;
  const text = String(value).trim();
  if (text === '') return false;
  return kind !== 'number' || Number.isFinite(Number(text));
}

function emptyValues(fields: FieldSpec[]): FormValues {
  return Object.fromEntries(fields.map(field => [field.key, field.kind === 'boolean' ? false : '']));
}

export function CatalogEntryForm<Entry>({ editor }: { editor: CatalogEditor<Entry> }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<FormValues>(() => emptyValues(editor.fields));
  const [edit, setEdit] = useState<FormValues | null>(null);

  const values = editor.entry ? editor.read(editor.entry) : emptyValues(editor.fields);
  const shown = adding ? draft : (edit ?? values);

  /*
   * An entry of your own has no factory entry to differ from, and the store
   * has no action that edits one: it can be added and removed, nothing else.
   * So its fields are shown as they are and there is nothing to save, rather
   * than a save button that quietly does nothing.
   */
  const editable = adding || editor.origin !== 'own';
  const factoryValues = editor.factory ? editor.read(editor.factory) : null;

  const setField = (key: string, value: string | boolean) => {
    if (adding) setDraft({ ...draft, [key]: value });
    else setEdit({ ...shown, [key]: value });
  };

  const cancel = () => {
    setEdit(null);
    setDraft(emptyValues(editor.fields));
    editor.clearError();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (adding) {
      if (editor.add(draft)) {
        setAdding(false);
        setDraft(emptyValues(editor.fields));
        editor.clearError();
      }
      return;
    }

    /*
     * A patch is a difference from the factory entry, and saving one replaces
     * the one before it rather than merging into it. So the fields to record
     * are the ones that differ from FACTORY, not the ones touched since the
     * form opened: diffing against the effective entry would drop every
     * earlier edit the moment a second one was saved.
     */
    const changed = new Set<string>();
    if (factoryValues) {
      for (const { key, kind, readOnly } of editor.fields) {
        if (readOnly) continue;
        const now = kind === 'text' ? String(shown[key]).trim() : shown[key];
        const before = kind === 'text' ? String(factoryValues[key]).trim() : factoryValues[key];
        if (now !== before) changed.add(key);
      }
    }

    if (changed.size === 0) {
      // Every field is back at its factory value, so there is no longer a
      // difference to record: the patch goes rather than lingering as one that
      // changes nothing and bounces the form back to its old values.
      if (editor.origin === 'edited') editor.unpatch();
      setEdit(null);
      return;
    }

    if (editor.patch(editor.toChanges(shown, changed))) setEdit(null);
  };

  return (
    <>
      {editor.hiddenCount > 0 && (
        <p className="calculation-note">
          {editor.hiddenLine(editor.hiddenCount)}{' '}
          <button type="button" className="catalog-secondary" onClick={editor.restoreHidden}>
            {editor.restoreLabel}
          </button>
        </p>
      )}

      {/*
        * noValidate because the browser would otherwise refuse to submit a
        * field that breaks `min`, and refuse silently as far as this app is
        * concerned: the store validates the whole entry and says what is wrong
        * with it, in the same words the rest of the app uses.
        */}
      <form
        className="catalog-form"
        id={adding ? 'custom-entry-form' : undefined}
        noValidate
        onSubmit={submit}
      >
        <div className="catalog-form-head">
          <h4 className="catalog-form-title">{adding ? editor.addSubmitLabel : (editor.entry ? String(shown[editor.fields[0].key]) : 'Nada seleccionado')}</h4>
          <button
            type="button"
            className="catalog-secondary"
            aria-expanded={adding}
            onClick={() => { setAdding(!adding); cancel(); }}
          >
            {adding ? 'Cancelar' : editor.addLabel}
          </button>
        </div>

        <div className="catalog-field-grid">
          {editor.fields.map(({ key, label, kind, readOnly }) => (
            <label key={key} className={`catalog-field catalog-field-${kind}`}>
              <span className="form-label">{label}</span>
              {kind === 'boolean' ? (
                <input
                  type="checkbox"
                  checked={Boolean(shown[key])}
                  disabled={!editable || (Boolean(readOnly) && !adding)}
                  onChange={event => setField(key, event.target.checked)}
                />
              ) : (
                <input
                  className="form-input"
                  type={kind === 'number' ? 'number' : 'text'}
                  min={kind === 'number' ? 0 : undefined}
                  aria-invalid={editor.error ? !isUsable(kind, shown[key]) : undefined}
                  aria-describedby={editor.error ? 'catalog-entry-error' : undefined}
                  value={String(shown[key])}
                  readOnly={!editable || (Boolean(readOnly) && !adding)}
                  onChange={event => setField(key, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        {editor.error && (
          <p className="calculation-error" role="alert" id="catalog-entry-error">{editor.error}</p>
        )}

        {!editable && (
          <p className="calculation-note">
            {editor.ownNoun} no se edita: elimínala y vuelve a añadirla con los valores nuevos.
          </p>
        )}

        <div className="catalog-actions">
          {!adding && editor.origin === 'edited' && (
            <button type="button" className="catalog-secondary" onClick={() => { editor.unpatch(); setEdit(null); }}>
              Volver a fábrica
            </button>
          )}
          {!adding && editor.origin === 'own' && (
            <button type="button" className="catalog-danger" onClick={editor.remove}>
              Eliminar
            </button>
          )}
          {!adding && editor.origin !== 'own' && (
            <button type="button" className="catalog-danger" onClick={editor.hide}>
              Ocultar
            </button>
          )}
          <span className="catalog-actions-gap" />
          {!adding && edit && (
            <button type="button" className="catalog-secondary" onClick={cancel}>
              Cancelar
            </button>
          )}
          {editable && (
            <button type="submit" className="catalog-primary">
              {adding ? editor.addSubmitLabel : 'Guardar cambios'}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
