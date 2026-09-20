import { useState } from 'react';
import { useBookStore, getAllSheetSizes, getAllPresses } from '../store/useBookStore';
import { useCatalogPanel } from './CatalogPanel';
import { isPositiveFinite } from '../engine/units';
import { ConfigSourceNote } from './ConfigSourceNote';
import { getCatalogOrigin, CatalogOriginNote } from './CatalogOrigin';
import type { SheetSize } from '../types';

export function ImpositionVisualizer() {
  const { open: openCatalog } = useCatalogPanel();
  const {
    catalog,
    sheetSizeId,
    customSheetSizes,
    sheetSizePatches,
    hiddenSheetSizeIds,
    customSheetSizeError,
    pressId,
    customPresses,
    pressPatches,
    hiddenPressIds,
    userLayerStorageAvailable,
    foldingSchemeId,
    signatureError,
    setSheetSize,
    addCustomSheetSize,
    removeCustomSheetSize,
    hideSheetSize,
    showSheetSize,
    patchSheetSize,
    unpatchSheetSize,
    clearCustomSheetSizeError,
    setPress,
    setFoldingScheme,
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customSheetError, setCustomSheetError] = useState<string | null>(null);


  const [showSheetEditForm, setShowSheetEditForm] = useState(false);
  const [editSheetName, setEditSheetName] = useState('');
  const [editSheetWidth, setEditSheetWidth] = useState('');
  const [editSheetHeight, setEditSheetHeight] = useState('');


  const customWidthIsValid = isPositiveFinite(Number(customW));
  const customHeightIsValid = isPositiveFinite(Number(customH));
  const allSheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;
  const currentSheet = allSheets.find(sheet => sheet.id === sheetSizeId);
  const isSelectedSheetCustom = customSheetSizes.some(sheet => sheet.id === sheetSizeId);
  const sheetOrigin = getCatalogOrigin(sheetSizeId, customSheetSizes.map(sheet => sheet.id), sheetSizePatches.map(patch => patch.id));
  const allPresses = catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses;
  const pressOrigin = getCatalogOrigin(pressId, customPresses.map(press => press.id), pressPatches.map(patch => patch.id));

  const handleAddCustom = () => {
    const width = Number(customW);
    const height = Number(customH);

    if (!customWidthIsValid || !customHeightIsValid) {
      setCustomSheetError('Introduce ancho y alto como números finitos mayores que cero para crear el pliego.');
      return;
    }

    if (!addCustomSheetSize(customName.trim(), width, height)) {
      setCustomSheetError('No se pudo crear el pliego. Corrige ancho y alto e inténtalo de nuevo.');
      return;
    }

    setShowCustomForm(false);
    setCustomName('');
    setCustomW('');
    setCustomH('');
    setCustomSheetError(null);
  };



  const handleOpenSheetEdit = () => {
    if (currentSheet) {
      setEditSheetName(currentSheet.name);
      setEditSheetWidth(String(currentSheet.width_mm));
      setEditSheetHeight(String(currentSheet.height_mm));
    }
    clearCustomSheetSizeError();
    setShowSheetEditForm(true);
  };

  const handleCancelSheetEdit = () => {
    setShowSheetEditForm(false);
    clearCustomSheetSizeError();
  };

  const handleSaveSheetEdit = () => {
    if (!catalog) return;
    const factorySheet = catalog.sheetSizes.find(sheet => sheet.id === sheetSizeId);
    if (!factorySheet) return;

    // The diff is computed against the factory entry, not the previous patch,
    // because patchSheetSize replaces the whole patch rather than merging it.
    const changes: Partial<Pick<SheetSize, 'name' | 'width_mm' | 'height_mm'>> = {};
    const trimmedName = editSheetName.trim();
    if (trimmedName !== factorySheet.name) changes.name = trimmedName;
    const width = Number(editSheetWidth);
    if (width !== factorySheet.width_mm) changes.width_mm = width;
    const height = Number(editSheetHeight);
    if (height !== factorySheet.height_mm) changes.height_mm = height;

    if (Object.keys(changes).length === 0) {
      unpatchSheetSize(sheetSizeId);
      setShowSheetEditForm(false);
      return;
    }

    if (patchSheetSize(sheetSizeId, changes)) {
      setShowSheetEditForm(false);
    }
  };




  return (
    <div className="panel" id="imposition-visualizer">
      <p className="calculation-note">
        Muestra la firma elegida sobre el pliego, con la pinza y los márgenes de la prensa descontados.
        Es una referencia preliminar, no una imposición industrial certificada.
      </p>

      <div className="input-row">
        <div className="form-group" role="group" aria-labelledby="press-group-label">
          <div className="form-label-row">
            <span id="press-group-label" className="form-label">Prensa</span>
            <button
              type="button"
              className="step-options"
              aria-label="Opciones de prensa"
              aria-haspopup="dialog"
              onClick={() => openCatalog('presses')}
            >
              ···
            </button>
          </div>
          <label className="visually-hidden" htmlFor="select-press">Prensa seleccionada</label>
          <select
            className="form-input"
            value={pressId}
            onChange={event => setPress(event.target.value)}
            id="select-press"
          >
            {allPresses.map(press => (
              <option key={press.id} value={press.id}>{press.name}</option>
            ))}
          </select>
          <CatalogOriginNote origin={pressOrigin} />
          {pressOrigin === 'own' ? (
            <ConfigSourceNote
              text={userLayerStorageAvailable
                ? 'prensa personalizada'
                : 'prensa personalizada, guardada solo para esta sesión'}
            />
          ) : (
            catalog && <ConfigSourceNote file="config/maquinas.json" text={catalog.pressesSource} />
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="select-folding-scheme">Esquema de plegado</label>
          <select
            className="form-input"
            value={foldingSchemeId ?? ''}
            onChange={event => setFoldingScheme(event.target.value || null)}
            id="select-folding-scheme"
          >
            <option value="">Automático (menor desperdicio)</option>
            {catalog?.foldingSchemes.map(scheme => (
              <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
            ))}
          </select>
          {catalog && (
            <ConfigSourceNote file="config/esquemas.json" text={catalog.foldingSchemesSource} />
          )}
        </div>

        <div
          className="form-group"
          role="group"
          aria-labelledby="sheet-size-group-label"
        >
          <div className="form-label-row">
            <span id="sheet-size-group-label" className="form-label">Tamaño del pliego</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isSelectedSheetCustom && !showCustomForm && (
                <button
                  type="button"
                  onClick={showSheetEditForm ? handleCancelSheetEdit : handleOpenSheetEdit}
                  aria-expanded={showSheetEditForm}
                  aria-controls="edit-sheet-form"
                  aria-label={showSheetEditForm ? 'Cancelar edición de pliego' : 'Editar pliego de fábrica'}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-amber-600)',
                    cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}
                >
                  {showSheetEditForm ? 'Cancelar' : 'Editar'}
                </button>
              )}
              {sheetOrigin === 'edited' && !showCustomForm && !showSheetEditForm && (
                <button
                  type="button"
                  onClick={() => unpatchSheetSize(sheetSizeId)}
                  aria-label="Volver el pliego a fábrica"
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-amber-600)',
                    cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}
                >
                  Volver a fábrica
                </button>
              )}
              {!showSheetEditForm && (
                <button
                  type="button"
                  onClick={() => {
                    if (showCustomForm) {
                      setCustomSheetError(null);
                    }
                    setShowCustomForm(!showCustomForm);
                  }}
                  aria-expanded={showCustomForm}
                  aria-controls="custom-sheet-form"
                  aria-label={showCustomForm
                    ? 'Cancelar pliego personalizado'
                    : 'Añadir pliego personalizado'}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-amber-600)',
                    cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}
                >
                  {showCustomForm ? 'Cancelar' : '+ Person.'}
                </button>
              )}
            </div>
          </div>

          {showSheetEditForm ? (
            <div id="edit-sheet-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label" htmlFor="input-edit-sheet-name">Nombre</label>
                <input
                  type="text"
                  className="form-input"
                  value={editSheetName}
                  onChange={event => setEditSheetName(event.target.value)}
                  id="input-edit-sheet-name"
                />
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-edit-sheet-width">Ancho</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editSheetWidth}
                      onChange={event => setEditSheetWidth(event.target.value)}
                      min="1"
                      id="input-edit-sheet-width"
                      aria-describedby={customSheetSizeError ? 'edit-sheet-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-edit-sheet-height">Alto</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editSheetHeight}
                      onChange={event => setEditSheetHeight(event.target.value)}
                      min="1"
                      id="input-edit-sheet-height"
                      aria-describedby={customSheetSizeError ? 'edit-sheet-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              {customSheetSizeError && (
                <p className="calculation-error" id="edit-sheet-error" role="alert">
                  {customSheetSizeError}
                </p>
              )}
              <button
                type="button"
                onClick={handleSaveSheetEdit}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-text-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Guardar cambios del pliego
              </button>
            </div>
          ) : showCustomForm ? (
            <div id="custom-sheet-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label" htmlFor="input-custom-sheet-name">Nombre (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={customName}
                  onChange={event => setCustomName(event.target.value)}
                  id="input-custom-sheet-name"
                />
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-custom-sheet-width">Ancho</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={customW}
                      onChange={event => setCustomW(event.target.value)}
                      min="1"
                      id="input-custom-sheet-width"
                      aria-invalid={Boolean(customSheetError) && !customWidthIsValid}
                      aria-describedby={customSheetError ? 'custom-sheet-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-custom-sheet-height">Alto</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={customH}
                      onChange={event => setCustomH(event.target.value)}
                      min="1"
                      id="input-custom-sheet-height"
                      aria-invalid={Boolean(customSheetError) && !customHeightIsValid}
                      aria-describedby={customSheetError ? 'custom-sheet-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              {customSheetError && (
                <p className="calculation-error" id="custom-sheet-error" role="alert">
                  {customSheetError}
                </p>
              )}
              <button
                type="button"
                onClick={handleAddCustom}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-text-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Crear pliego
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <label className="visually-hidden" htmlFor="select-sheet-size">Pliego seleccionado</label>
              <select
                className="form-input"
                value={sheetSizeId}
                onChange={event => setSheetSize(event.target.value)}
                id="select-sheet-size"
                style={{ flex: 1 }}
              >
                {allSheets.map(sheet => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name} ({sheet.width_mm}×{sheet.height_mm} mm)
                  </option>
                ))}
              </select>
              {isSelectedSheetCustom ? (
                <button
                  type="button"
                  className="remove-sheet-button"
                  onClick={() => removeCustomSheetSize(sheetSizeId)}
                  title="Eliminar pliego personalizado"
                  aria-label="Eliminar pliego personalizado"
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: 'var(--color-danger-foreground)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    width: '42px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  ×
                </button>
              ) : (
                <button
                  type="button"
                  className="remove-sheet-button"
                  onClick={() => hideSheetSize(sheetSizeId)}
                  title="Ocultar pliego de fábrica"
                  aria-label="Ocultar pliego de fábrica"
                  style={{
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    width: '42px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  –
                </button>
              )}
            </div>
          )}
          {isSelectedSheetCustom ? (
            <ConfigSourceNote text={userLayerStorageAvailable ? 'pliego personalizado' : 'pliego personalizado, guardado solo para esta sesión'} />
          ) : catalog && (
            <ConfigSourceNote file="config/pliegos.json" text={catalog.sheetSizesSource} />
          )}
          <CatalogOriginNote origin={sheetOrigin} />
          {hiddenSheetSizeIds.length > 0 && (
            <p className="config-source-note">
              {hiddenSheetSizeIds.length} {hiddenSheetSizeIds.length === 1 ? 'pliego de fábrica oculto' : 'pliegos de fábrica ocultos'}.{' '}
              <button
                type="button"
                onClick={() => hiddenSheetSizeIds.forEach(id => showSheetSize(id))}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-amber-600)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Mostrar pliegos ocultos
              </button>
            </p>
          )}
        </div>
      </div>

      {signatureError && (
        <p className="calculation-error" role="alert">{signatureError}</p>
      )}

    </div>
  );
}
