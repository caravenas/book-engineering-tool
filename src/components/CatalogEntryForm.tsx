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
  /**
   * A field the form asks for once, when the entry is created, and never
   * offers again. A paper is added with the one weight it is bought in,
   * because a paper with no weights cannot be selected; its further weights
   * are added afterwards through the list that hangs off it, so showing the
   * first one here again would suggest editing that list from the wrong
   * place.
   */
  onlyWhenAdding?: boolean;
}

export type FormValues = Record<string, string | boolean>;

export interface CatalogEditor<Entry> {
  /**
   * Why this catalog cannot be edited here, for the ones that cannot: only
   * grammages, which hang off a paper and are keyed by their own value, so
   * there is nothing to patch and nothing to replace — you add yours and you
   * remove it again. Absent where every entry can be edited, so the form has
   * no sentence to print that is no longer true.
   */
  readOnlyNote?: string;
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
  /**
   * Absent when the store has no way to change an entry in place. Grammages
   * are like that: they hang off a paper and are keyed by their own value, so
   * there is nothing to patch and nothing to hide — only adding yours and
   * removing it again. The form shows what that catalog can do and no more.
   */
  patch?: (changes: Record<string, unknown>) => boolean;
  /**
   * Replacing an entry of your own. Separate from `patch` because a patch is
   * a difference from a factory entry and an entry of your own has none: it
   * is not a smaller edit of the same kind, it is a different operation.
   */
  editOwn?: (changes: Record<string, unknown>) => boolean;
  unpatch?: () => void;
  hide?: () => void;
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

/**
 * Whether a field still says what the factory entry says. Numbers are compared
 * as numbers: "5.0" and "05" are the same 5, and comparing the text would have
 * recorded a patch that changes nothing, leaving the entry marked as edited
 * and refusing to unpatch itself.
 */
function sameValue(kind: FieldKind, a: string | boolean, b: string | boolean): boolean {
  if (kind === 'boolean') return Boolean(a) === Boolean(b);
  if (kind === 'text') return String(a).trim() === String(b).trim();
  const left = Number(String(a).trim());
  const right = Number(String(b).trim());
  // Two NaNs are not equal to each other, but two empty boxes say the same
  // thing, so fall back to the text when either side is not a number.
  if (!Number.isFinite(left) || !Number.isFinite(right)) return String(a).trim() === String(b).trim();
  return left === right;
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
   * An entry of your own is replaced rather than patched, so it is editable
   * exactly when the store offers that replacement. A catalog that offers
   * neither shows its fields as they are and no save button, rather than one
   * that quietly does nothing.
   */
  const editable = adding || (editor.origin === 'own' ? Boolean(editor.editOwn) : Boolean(editor.patch));
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
     * What to diff against depends on what saving does. A patch is a
     * difference from the FACTORY entry and replaces the patch before it
     * rather than merging into it, so diffing a patch against the effective
     * entry would drop every earlier edit the moment a second one was saved.
     * An entry of your own has no factory behind it and is replaced outright,
     * so there the baseline is the entry as it stands.
     */
    const baseline = editor.origin === 'own' ? values : factoryValues;
    const changed = new Set<string>();
    if (baseline) {
      for (const { key, kind, readOnly, onlyWhenAdding } of editor.fields) {
        if (readOnly || onlyWhenAdding) continue;
        if (!sameValue(kind, shown[key], baseline[key])) changed.add(key);
      }
    }

    if (changed.size === 0) {
      // Every field is back at its factory value, so there is no longer a
      // difference to record: the patch goes rather than lingering as one that
      // changes nothing and bounces the form back to its old values.
      if (editor.origin === 'edited') editor.unpatch?.();
      setEdit(null);
      return;
    }

    const changes = editor.toChanges(shown, changed);
    const saved = editor.origin === 'own' ? editor.editOwn?.(changes) : editor.patch?.(changes);
    if (saved) setEdit(null);
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
          {editor.fields.filter(field => adding || !field.onlyWhenAdding).map(({ key, label, kind, readOnly }) => (
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

        {!editable && editor.readOnlyNote && (
          <p className="calculation-note">{editor.readOnlyNote}</p>
        )}

        <div className="catalog-actions">
          {!adding && editor.origin === 'edited' && editor.unpatch && (
            <button type="button" className="catalog-secondary" onClick={() => { editor.unpatch?.(); setEdit(null); }}>
              Volver a fábrica
            </button>
          )}
          {!adding && editor.origin === 'own' && (
            <button type="button" className="catalog-danger" onClick={editor.remove}>
              Eliminar
            </button>
          )}
          {!adding && editor.origin !== 'own' && editor.hide && (
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
