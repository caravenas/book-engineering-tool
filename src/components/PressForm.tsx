import { useState } from 'react';
import { useBookStore, getAllPresses } from '../store/useBookStore';
import { getCatalogOrigin } from './CatalogOrigin';

/**
 * The press being used, edited in place. A press is the richest entry any
 * catalog holds — a maximum sheet and four margins the imposition subtracts —
 * and editing it used to mean expanding one of two inline forms inside the
 * imposition step, one to add and one to change.
 *
 * The form edits whichever press is selected, which is also the row the list
 * above marks: a catalog you are looking at and a press you are working with
 * are the same choice, and splitting them would mean explaining which one the
 * fields refer to.
 */
const FIELDS = [
  { key: 'maxSheetWidth_mm', label: 'Pliego máximo · ancho' },
  { key: 'maxSheetHeight_mm', label: 'Pliego máximo · alto' },
  { key: 'gripperMargin_mm', label: 'Pinza' },
  { key: 'sideMargin_mm', label: 'Lateral' },
  { key: 'tailMargin_mm', label: 'Cola' },
  { key: 'gutter_mm', label: 'Calle' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

/** Blank is not zero: the store rejects a NaN and says so in its own words. */
function toNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function emptyDraft(): Record<FieldKey | 'name', string> {
  return { name: '', maxSheetWidth_mm: '', maxSheetHeight_mm: '', gripperMargin_mm: '', sideMargin_mm: '', tailMargin_mm: '', gutter_mm: '' };
}

export function PressForm() {
  const {
    catalog,
    pressId,
    customPresses,
    pressPatches,
    hiddenPressIds,
    customPressError,
    addCustomPress,
    removeCustomPress,
    patchPress,
    unpatchPress,
    hidePress,
    showPress,
    clearCustomPressError,
  } = useBookStore();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [edit, setEdit] = useState<Record<FieldKey | 'name', string> | null>(null);

  if (!catalog) return null;

  const presses = getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds);
  const press = presses.find(item => item.id === pressId) ?? null;
  const origin = getCatalogOrigin(pressId, customPresses.map(item => item.id), pressPatches.map(patch => patch.id));

  // What the form shows: the entry as it currently is, patches included.
  const values = (press
    ? {
      name: press.name,
      maxSheetWidth_mm: String(press.maxSheetWidth_mm),
      maxSheetHeight_mm: String(press.maxSheetHeight_mm),
      gripperMargin_mm: String(press.gripperMargin_mm),
      sideMargin_mm: String(press.sideMargin_mm),
      tailMargin_mm: String(press.tailMargin_mm),
      gutter_mm: String(press.gutter_mm),
    }
    : emptyDraft());

  const shown = adding ? draft : (edit ?? values);

  /*
   * A patch is a difference from the factory entry, and saving one replaces
   * the one before it rather than merging into it. So the fields to record are
   * the ones that differ from FACTORY, not the ones touched since the form
   * opened: diffing against the effective entry would drop every earlier edit
   * the moment a second one was saved.
   */
  const factory = catalog.presses.find(item => item.id === pressId) ?? null;

  /*
   * A press of your own has no factory entry to differ from, and the store has
   * no action that edits one: it can be added and removed, nothing else. So
   * its fields are shown as they are and there is nothing to save, rather than
   * a save button that quietly does nothing.
   */
  const editable = adding || origin !== 'own';
  const setField = (key: FieldKey | 'name', value: string) => {
    if (adding) setDraft({ ...draft, [key]: value });
    else setEdit({ ...shown, [key]: value });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (adding) {
      const saved = addCustomPress(
        draft.name,
        toNumber(draft.maxSheetWidth_mm),
        toNumber(draft.maxSheetHeight_mm),
        toNumber(draft.gripperMargin_mm),
        toNumber(draft.sideMargin_mm),
        toNumber(draft.tailMargin_mm),
        toNumber(draft.gutter_mm)
      );
      if (saved) {
        setAdding(false);
        setDraft(emptyDraft());
      }
      return;
    }
    /*
     * Only the fields that differ from factory: sending all of them would
     * record six differences where the reader made one, and a later change to
     * the shipped catalog would stop reaching an entry nobody really edited.
     */
    const changes: Record<string, string | number> = {};
    if (factory && shown.name.trim() !== factory.name) changes.name = shown.name.trim();
    for (const { key } of FIELDS) {
      if (factory && shown[key] !== String(factory[key])) changes[key] = toNumber(shown[key]);
    }
    if (Object.keys(changes).length === 0) {
      // Every field is back at its factory value, so there is no longer a
      // difference to record: the patch goes rather than lingering as one
      // that changes nothing and bounces the form back to its old values.
      if (origin === 'edited') unpatchPress(pressId);
      setEdit(null);
      return;
    }
    if (patchPress(pressId, changes)) setEdit(null);
  };

  /*
   * Hiding without a way back would be a one-way door, and the control that
   * used to offer the way back lived in the step this form emptied.
   */
  const hidden = hiddenPressIds.length;

  return (
    <>
    {hidden > 0 && (
      <p className="calculation-note">
        {hidden === 1 ? '1 prensa de fábrica oculta.' : `${hidden} prensas de fábrica ocultas.`}{' '}
        <button
          type="button"
          className="catalog-secondary"
          onClick={() => hiddenPressIds.forEach(id => showPress(id))}
        >
          Mostrar prensas ocultas
        </button>
      </p>
    )}
    {/*
      * noValidate because the browser would otherwise refuse to submit a field
      * that breaks `min`, and refuse silently as far as this app is concerned:
      * the store validates the whole entry and says what is wrong with it, in
      * the same words the rest of the app uses. `min` stays for the spinner.
      */}
    <form
      className="catalog-form"
      id={adding ? 'custom-press-form' : undefined}
      noValidate
      onSubmit={submit}
    >
      <div className="catalog-form-head">
        <h4 className="catalog-form-title">{adding ? 'Nueva prensa' : press?.name ?? 'Sin prensa'}</h4>
        <button
          type="button"
          className="catalog-secondary"
          aria-expanded={adding}
          onClick={() => { setAdding(!adding); setEdit(null); clearCustomPressError(); }}
        >
          {adding ? 'Cancelar' : '+ Nueva prensa'}
        </button>
      </div>

      <label className="catalog-field">
        <span className="form-label">Nombre</span>
        <input
          className="form-input"
          value={shown.name}
          readOnly={!editable}
          onChange={event => setField('name', event.target.value)}
        />
      </label>

      <div className="catalog-field-grid">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="catalog-field">
            <span className="form-label">{label}</span>
            <input
              className="form-input"
              type="number"
              min={0}
              value={shown[key]}
              readOnly={!editable}
              onChange={event => setField(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      {customPressError && <p className="calculation-error" role="alert">{customPressError}</p>}

      {!editable && (
        <p className="calculation-note">
          Una prensa tuya no se edita: elimínala y vuelve a añadirla con las medidas nuevas.
        </p>
      )}

      <div className="catalog-actions">
        {!adding && origin === 'edited' && (
          <button type="button" className="catalog-secondary" onClick={() => { unpatchPress(pressId); setEdit(null); }}>
            Volver a fábrica
          </button>
        )}
        {!adding && origin === 'own' && (
          <button type="button" className="catalog-danger" onClick={() => removeCustomPress(pressId)}>
            Eliminar
          </button>
        )}
        {!adding && origin !== 'own' && (
          <button type="button" className="catalog-danger" onClick={() => hidePress(pressId)}>
            Ocultar
          </button>
        )}
        <span className="catalog-actions-gap" />
        {!adding && edit && (
          <button
            type="button"
            className="catalog-secondary"
            onClick={() => { setEdit(null); clearCustomPressError(); }}
          >
            Cancelar
          </button>
        )}
        {editable && (
          <button type="submit" className="catalog-primary">
            {adding ? 'Añadir prensa' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </form>
    </>
  );
}
