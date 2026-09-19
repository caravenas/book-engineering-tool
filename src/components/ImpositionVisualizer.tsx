import { useState } from 'react';
import { useBookStore, getAllSheetSizes, getAllPresses } from '../store/useBookStore';
import { layoutSide } from '../engine/signatures';
import { ConfigSourceNote } from './ConfigSourceNote';
import { getCatalogOrigin, CatalogOriginNote } from './CatalogOrigin';
import { ImpositionResults } from './ImpositionResults';
import type { Press, SheetSize, SignatureOption } from '../types';

const SVG_PADDING = 30;
const SVG_MAX_WIDTH = 500;
const SVG_MAX_HEIGHT = 400;

type Side = 'front' | 'back';

interface SignatureSlotGeometry {
  page: number;
  rotated: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
}

interface SignatureSvgGeometry {
  sheetWidth: number;
  sheetHeight: number;
  scaledSheetWidth: number;
  scaledSheetHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  sheetLabelX: number;
  sheetLabelY: number;
  slots: SignatureSlotGeometry[];
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Compute the scaled SVG geometry for one side of a selected signature
 * option, or `null` when the sheet, the option, or any derived number is
 * missing or unusable, so the caller can fall back to an accessible message
 * instead of rendering a broken preview.
 */
function getSignatureSvgGeometry(
  sheet: SheetSize | undefined,
  option: SignatureOption | null,
  side: Side
): SignatureSvgGeometry | null {
  if (!sheet || !option || !isPositiveFinite(sheet.width_mm) || !isPositiveFinite(sheet.height_mm)) {
    return null;
  }

  const scale = Math.min(
    (SVG_MAX_WIDTH - SVG_PADDING * 2) / sheet.width_mm,
    (SVG_MAX_HEIGHT - SVG_PADDING * 2) / sheet.height_mm
  );
  const scaledSheetWidth = sheet.width_mm * scale;
  const scaledSheetHeight = sheet.height_mm * scale;
  const viewBoxWidth = scaledSheetWidth + SVG_PADDING * 2;
  const viewBoxHeight = scaledSheetHeight + SVG_PADDING * 2 + 20;
  const sheetLabelX = SVG_PADDING + scaledSheetWidth / 2;
  const sheetLabelY = SVG_PADDING + scaledSheetHeight + 16;

  if (!isPositiveFinite(scale)
    || !isPositiveFinite(scaledSheetWidth)
    || !isPositiveFinite(scaledSheetHeight)
    || !isPositiveFinite(viewBoxWidth)
    || !isPositiveFinite(viewBoxHeight)
    || !isPositiveFinite(sheetLabelX)
    || !isPositiveFinite(sheetLabelY)) {
    return null;
  }

  let placements;
  try {
    placements = layoutSide(option, side);
  } catch {
    return null;
  }

  const slots: SignatureSlotGeometry[] = [];
  for (const placement of placements) {
    if (!isNonNegativeFinite(placement.x_mm)
      || !isNonNegativeFinite(placement.y_mm)
      || !isPositiveFinite(placement.width_mm)
      || !isPositiveFinite(placement.height_mm)) {
      return null;
    }

    const x = SVG_PADDING + placement.x_mm * scale;
    const y = SVG_PADDING + placement.y_mm * scale;
    const width = placement.width_mm * scale;
    const height = placement.height_mm * scale;
    const labelX = x + width / 2;
    const labelY = y + height / 2;

    if (!isPositiveFinite(x) || !isPositiveFinite(y)
      || !isPositiveFinite(width) || !isPositiveFinite(height)
      || !isPositiveFinite(labelX) || !isPositiveFinite(labelY)) {
      return null;
    }

    slots.push({ page: placement.page, rotated: placement.rotation === 180, x, y, width, height, labelX, labelY });
  }

  return {
    sheetWidth: sheet.width_mm,
    sheetHeight: sheet.height_mm,
    scaledSheetWidth,
    scaledSheetHeight,
    viewBoxWidth,
    viewBoxHeight,
    sheetLabelX,
    sheetLabelY,
    slots,
  };
}

export function ImpositionVisualizer() {
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
    customPressError,
    userLayerStorageAvailable,
    foldingSchemeId,
    signaturePlan,
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
    addCustomPress,
    removeCustomPress,
    hidePress,
    showPress,
    patchPress,
    unpatchPress,
    clearCustomPressError,
    setFoldingScheme,
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customSheetError, setCustomSheetError] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('front');

  const [showPressForm, setShowPressForm] = useState(false);
  const [pressName, setPressName] = useState('');
  const [pressMaxWidth, setPressMaxWidth] = useState('');
  const [pressMaxHeight, setPressMaxHeight] = useState('');
  const [pressGripperMargin, setPressGripperMargin] = useState('');
  const [pressSideMargin, setPressSideMargin] = useState('');
  const [pressTailMargin, setPressTailMargin] = useState('');
  const [pressGutter, setPressGutter] = useState('');

  const [showSheetEditForm, setShowSheetEditForm] = useState(false);
  const [editSheetName, setEditSheetName] = useState('');
  const [editSheetWidth, setEditSheetWidth] = useState('');
  const [editSheetHeight, setEditSheetHeight] = useState('');

  const [showPressEditForm, setShowPressEditForm] = useState(false);
  const [editPressName, setEditPressName] = useState('');
  const [editPressMaxWidth, setEditPressMaxWidth] = useState('');
  const [editPressMaxHeight, setEditPressMaxHeight] = useState('');
  const [editPressGripperMargin, setEditPressGripperMargin] = useState('');
  const [editPressSideMargin, setEditPressSideMargin] = useState('');
  const [editPressTailMargin, setEditPressTailMargin] = useState('');
  const [editPressGutter, setEditPressGutter] = useState('');

  const customWidthIsValid = isPositiveFinite(Number(customW));
  const customHeightIsValid = isPositiveFinite(Number(customH));
  const allSheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;
  const currentSheet = allSheets.find(sheet => sheet.id === sheetSizeId);
  const isSelectedSheetCustom = customSheetSizes.some(sheet => sheet.id === sheetSizeId);
  const sheetOrigin = getCatalogOrigin(sheetSizeId, customSheetSizes.map(sheet => sheet.id), sheetSizePatches.map(patch => patch.id));
  const allPresses = catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses;
  const currentPress = allPresses.find(press => press.id === pressId);
  const isSelectedPressCustom = customPresses.some(press => press.id === pressId);
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

  const handleTogglePressForm = () => {
    setShowPressForm(!showPressForm);
    clearCustomPressError();
  };

  const handleAddPress = () => {
    const added = addCustomPress(
      pressName,
      Number(pressMaxWidth),
      Number(pressMaxHeight),
      Number(pressGripperMargin),
      Number(pressSideMargin),
      Number(pressTailMargin),
      Number(pressGutter)
    );

    if (added) {
      setShowPressForm(false);
      setPressName('');
      setPressMaxWidth('');
      setPressMaxHeight('');
      setPressGripperMargin('');
      setPressSideMargin('');
      setPressTailMargin('');
      setPressGutter('');
    }
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

  const handleOpenPressEdit = () => {
    if (currentPress) {
      setEditPressName(currentPress.name);
      setEditPressMaxWidth(String(currentPress.maxSheetWidth_mm));
      setEditPressMaxHeight(String(currentPress.maxSheetHeight_mm));
      setEditPressGripperMargin(String(currentPress.gripperMargin_mm));
      setEditPressSideMargin(String(currentPress.sideMargin_mm));
      setEditPressTailMargin(String(currentPress.tailMargin_mm));
      setEditPressGutter(String(currentPress.gutter_mm));
    }
    clearCustomPressError();
    setShowPressEditForm(true);
  };

  const handleCancelPressEdit = () => {
    setShowPressEditForm(false);
    clearCustomPressError();
  };

  const handleSavePressEdit = () => {
    if (!catalog) return;
    const factoryPress = catalog.presses.find(press => press.id === pressId);
    if (!factoryPress) return;

    // The diff is computed against the factory entry, not the previous patch,
    // because patchPress replaces the whole patch rather than merging it.
    const changes: Partial<Omit<Press, 'id'>> = {};
    const trimmedName = editPressName.trim();
    if (trimmedName !== factoryPress.name) changes.name = trimmedName;
    const maxWidth = Number(editPressMaxWidth);
    if (maxWidth !== factoryPress.maxSheetWidth_mm) changes.maxSheetWidth_mm = maxWidth;
    const maxHeight = Number(editPressMaxHeight);
    if (maxHeight !== factoryPress.maxSheetHeight_mm) changes.maxSheetHeight_mm = maxHeight;
    const gripperMargin = Number(editPressGripperMargin);
    if (gripperMargin !== factoryPress.gripperMargin_mm) changes.gripperMargin_mm = gripperMargin;
    const sideMargin = Number(editPressSideMargin);
    if (sideMargin !== factoryPress.sideMargin_mm) changes.sideMargin_mm = sideMargin;
    const tailMargin = Number(editPressTailMargin);
    if (tailMargin !== factoryPress.tailMargin_mm) changes.tailMargin_mm = tailMargin;
    const gutter = Number(editPressGutter);
    if (gutter !== factoryPress.gutter_mm) changes.gutter_mm = gutter;

    if (Object.keys(changes).length === 0) {
      unpatchPress(pressId);
      setShowPressEditForm(false);
      return;
    }

    if (patchPress(pressId, changes)) {
      setShowPressEditForm(false);
    }
  };

  const selected = signaturePlan?.selected ?? null;
  const svgGeometry = getSignatureSvgGeometry(currentSheet, selected, side);

  const svgContent = svgGeometry && (
    <svg
      className="imposition-svg"
      viewBox={`0 0 ${svgGeometry.viewBoxWidth} ${svgGeometry.viewBoxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Vista previa del ${side === 'front' ? 'tiro' : 'retiro'} de la firma`}
    >
      <rect
        className="sheet-bg"
        x={SVG_PADDING}
        y={SVG_PADDING}
        width={svgGeometry.scaledSheetWidth}
        height={svgGeometry.scaledSheetHeight}
      />

      {svgGeometry.slots.map((slot, index) => (
        <g key={index} transform={slot.rotated ? `rotate(180 ${slot.labelX} ${slot.labelY})` : undefined}>
          <rect
            className="page-rect"
            x={slot.x}
            y={slot.y}
            width={slot.width}
            height={slot.height}
          />
          <text
            className="page-number"
            x={slot.labelX}
            y={slot.labelY}
          >
            {slot.page}
          </text>
        </g>
      ))}

      <text
        className="dimension-text"
        x={svgGeometry.sheetLabelX}
        y={svgGeometry.sheetLabelY}
        textAnchor="middle"
      >
        {svgGeometry.sheetWidth} × {svgGeometry.sheetHeight} mm
      </text>
    </svg>
  );

  return (
    <div className="panel" id="imposition-visualizer">
      <h2 className="panel-title">Imposición por firmas</h2>
      <p className="calculation-note">
        Muestra la firma elegida sobre el pliego, con la pinza y los márgenes de la prensa descontados.
        Es una referencia preliminar, no una imposición industrial certificada.
      </p>

      <div className="input-row">
        <div
          className="form-group"
          role="group"
          aria-labelledby="press-group-label"
        >
          <div className="form-label-row">
            <span id="press-group-label" className="form-label">Prensa</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isSelectedPressCustom && !showPressForm && (
                <button
                  type="button"
                  onClick={showPressEditForm ? handleCancelPressEdit : handleOpenPressEdit}
                  aria-expanded={showPressEditForm}
                  aria-controls="edit-press-form"
                  aria-label={showPressEditForm ? 'Cancelar edición de prensa' : 'Editar prensa de fábrica'}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-amber-600)',
                    cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}
                >
                  {showPressEditForm ? 'Cancelar' : 'Editar'}
                </button>
              )}
              {pressOrigin === 'edited' && !showPressForm && !showPressEditForm && (
                <button
                  type="button"
                  onClick={() => unpatchPress(pressId)}
                  aria-label="Volver la prensa a fábrica"
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-amber-600)',
                    cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}
                >
                  Volver a fábrica
                </button>
              )}
              {!showPressEditForm && (
                <button
                  type="button"
                  onClick={handleTogglePressForm}
                  aria-expanded={showPressForm}
                  aria-controls="custom-press-form"
                  aria-label={showPressForm ? 'Cancelar prensa personalizada' : 'Añadir prensa personalizada'}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-amber-600)',
                    cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
                  }}
                >
                  {showPressForm ? 'Cancelar' : '+ Person.'}
                </button>
              )}
            </div>
          </div>

          {showPressEditForm ? (
            <div id="edit-press-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label" htmlFor="input-edit-press-name">Nombre</label>
                <input
                  type="text"
                  className="form-input"
                  value={editPressName}
                  onChange={event => setEditPressName(event.target.value)}
                  id="input-edit-press-name"
                />
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-edit-press-max-width">Ancho máximo de pliego</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editPressMaxWidth}
                      onChange={event => setEditPressMaxWidth(event.target.value)}
                      min="1"
                      id="input-edit-press-max-width"
                      aria-describedby={customPressError ? 'edit-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-edit-press-max-height">Alto máximo de pliego</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editPressMaxHeight}
                      onChange={event => setEditPressMaxHeight(event.target.value)}
                      min="1"
                      id="input-edit-press-max-height"
                      aria-describedby={customPressError ? 'edit-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-edit-press-gripper-margin">Margen de pinza</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editPressGripperMargin}
                      onChange={event => setEditPressGripperMargin(event.target.value)}
                      min="0"
                      id="input-edit-press-gripper-margin"
                      aria-describedby={customPressError ? 'edit-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-edit-press-tail-margin">Margen de cola</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editPressTailMargin}
                      onChange={event => setEditPressTailMargin(event.target.value)}
                      min="0"
                      id="input-edit-press-tail-margin"
                      aria-describedby={customPressError ? 'edit-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-edit-press-side-margin">Margen lateral</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editPressSideMargin}
                      onChange={event => setEditPressSideMargin(event.target.value)}
                      min="0"
                      id="input-edit-press-side-margin"
                      aria-describedby={customPressError ? 'edit-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-edit-press-gutter">Calle</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={editPressGutter}
                      onChange={event => setEditPressGutter(event.target.value)}
                      min="0"
                      id="input-edit-press-gutter"
                      aria-describedby={customPressError ? 'edit-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              {customPressError && (
                <p className="calculation-error" id="edit-press-error" role="alert">
                  {customPressError}
                </p>
              )}
              <button
                type="button"
                onClick={handleSavePressEdit}
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
                Guardar cambios de la prensa
              </button>
            </div>
          ) : showPressForm ? (
            <div id="custom-press-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label" htmlFor="input-custom-press-name">Nombre</label>
                <input
                  type="text"
                  className="form-input"
                  value={pressName}
                  onChange={event => setPressName(event.target.value)}
                  id="input-custom-press-name"
                />
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-custom-press-max-width">Ancho máximo de pliego</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={pressMaxWidth}
                      onChange={event => setPressMaxWidth(event.target.value)}
                      min="1"
                      id="input-custom-press-max-width"
                      aria-describedby={customPressError ? 'custom-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-custom-press-max-height">Alto máximo de pliego</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={pressMaxHeight}
                      onChange={event => setPressMaxHeight(event.target.value)}
                      min="1"
                      id="input-custom-press-max-height"
                      aria-describedby={customPressError ? 'custom-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-custom-press-gripper-margin">Margen de pinza</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={pressGripperMargin}
                      onChange={event => setPressGripperMargin(event.target.value)}
                      min="0"
                      id="input-custom-press-gripper-margin"
                      aria-describedby={customPressError ? 'custom-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-custom-press-tail-margin">Margen de cola</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={pressTailMargin}
                      onChange={event => setPressTailMargin(event.target.value)}
                      min="0"
                      id="input-custom-press-tail-margin"
                      aria-describedby={customPressError ? 'custom-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-custom-press-side-margin">Margen lateral</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={pressSideMargin}
                      onChange={event => setPressSideMargin(event.target.value)}
                      min="0"
                      id="input-custom-press-side-margin"
                      aria-describedby={customPressError ? 'custom-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-custom-press-gutter">Calle</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={pressGutter}
                      onChange={event => setPressGutter(event.target.value)}
                      min="0"
                      id="input-custom-press-gutter"
                      aria-describedby={customPressError ? 'custom-press-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              {customPressError && (
                <p className="calculation-error" id="custom-press-error" role="alert">
                  {customPressError}
                </p>
              )}
              <button
                type="button"
                onClick={handleAddPress}
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
                Crear prensa
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <label className="visually-hidden" htmlFor="select-press">Prensa seleccionada</label>
              <select
                className="form-input"
                value={pressId}
                onChange={event => setPress(event.target.value)}
                id="select-press"
                style={{ flex: 1 }}
              >
                {allPresses.map(press => (
                  <option key={press.id} value={press.id}>{press.name}</option>
                ))}
              </select>
              {isSelectedPressCustom ? (
                <button
                  type="button"
                  className="remove-sheet-button"
                  onClick={() => removeCustomPress(pressId)}
                  title="Eliminar prensa personalizada"
                  aria-label="Eliminar prensa personalizada"
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
                  onClick={() => hidePress(pressId)}
                  title="Ocultar prensa de fábrica"
                  aria-label="Ocultar prensa de fábrica"
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
          {isSelectedPressCustom ? (
            <ConfigSourceNote text={userLayerStorageAvailable ? 'prensa personalizada' : 'prensa personalizada, guardada solo para esta sesión'} />
          ) : catalog && (
            <ConfigSourceNote file="config/maquinas.json" text={catalog.pressesSource} />
          )}
          <CatalogOriginNote origin={pressOrigin} />
          {hiddenPressIds.length > 0 && (
            <p className="config-source-note">
              {hiddenPressIds.length} {hiddenPressIds.length === 1 ? 'prensa de fábrica oculta' : 'prensas de fábrica ocultas'}.{' '}
              <button
                type="button"
                onClick={() => hiddenPressIds.forEach(id => showPress(id))}
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
                Mostrar prensas ocultas
              </button>
            </p>
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

        <div className="form-group">
          <label className="form-label" htmlFor="select-imposition-side">Cara mostrada</label>
          <select
            className="form-input"
            value={side}
            onChange={event => setSide(event.target.value as Side)}
            id="select-imposition-side"
          >
            <option value="front">Tiro (frente)</option>
            <option value="back">Retiro (dorso)</option>
          </select>
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

      <div className="imposition-svg-container">
        {svgContent || (
          <p className="calculation-note" role="status">
            {selected
              ? 'Corrige los valores indicados para recuperar la vista previa.'
              : 'Ningún esquema de plegado disponible cabe en el pliego, la prensa y las páginas actuales. Elige otro pliego, otra prensa o revisa la configuración.'}
          </p>
        )}
      </div>

      <ImpositionResults />
    </div>
  );
}
