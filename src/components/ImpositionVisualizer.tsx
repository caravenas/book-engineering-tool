import { useBookStore, getAllSheetSizes, getAllPresses } from '../store/useBookStore';
import { sheetFitsPress } from '../engine/signatures';
import { getCatalogOrigin, ORIGIN_LABEL } from './CatalogOrigin';
import { OptionField, OptionCard } from './OptionGroup';
import type { Press, SheetSize } from '../types';

/** Millimetres per pixel in the press and sheet drawings, so both compare. */
const SHEET_SCALE = 25;
const PRESS_SCALE = 30;

/**
 * What a press can hold, drawn at scale, with the gripper it cannot print on
 * as a thick edge along the top: that margin is why a sheet that fits the
 * press still loses a strip of itself, and it is the one press measurement
 * that changes the imposition.
 */
function PressFigure({ press }: { press: Press }) {
  return (
    <span
      className="press-figure"
      style={{
        width: `${press.maxSheetWidth_mm / PRESS_SCALE}px`,
        height: `${press.maxSheetHeight_mm / PRESS_SCALE}px`,
        borderTopWidth: `${Math.max(2, press.gripperMargin_mm / 3)}px`,
      }}
    />
  );
}

/** A sheet at 1:25, so the six of them are read against each other. */
function SheetFigure({ sheet }: { sheet: SheetSize }) {
  return (
    <span
      className="option-shape"
      style={{
        width: `${sheet.width_mm / SHEET_SCALE}px`,
        height: `${sheet.height_mm / SHEET_SCALE}px`,
      }}
    />
  );
}

/** How big one cell of a folding scheme's grid is drawn, in pixels. */
const FOLD_CELL = 9;

/**
 * The signature's own grid: how many pages a side of the sheet carries, and
 * in what arrangement. The box grows with the grid instead of being a fixed
 * rectangle the cells are squeezed into, so a scheme two pages wide and four
 * tall is drawn as the tall thing it is.
 */
function FoldFigure({ cols, rows }: { cols: number; rows: number }) {
  return (
    <span
      className="fold-figure"
      style={{
        width: `${cols * FOLD_CELL}px`,
        height: `${rows * FOLD_CELL}px`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: cols * rows }, (_, index) => <span key={index} />)}
    </span>
  );
}

export function ImpositionVisualizer() {
  const {
    catalog,
    sheetSizeId,
    customSheetSizes,
    sheetSizePatches,
    hiddenSheetSizeIds,
    pressId,
    customPresses,
    pressPatches,
    hiddenPressIds,
    userLayerStorageAvailable,
    foldingSchemeId,
    signatureError,
    setSheetSize,
    setPress,
    setFoldingScheme,
  } = useBookStore();

  const allSheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;
  const isSelectedSheetCustom = customSheetSizes.some(sheet => sheet.id === sheetSizeId);
  const sheetOrigin = getCatalogOrigin(sheetSizeId, customSheetSizes.map(sheet => sheet.id), sheetSizePatches.map(patch => patch.id));
  const allPresses = catalog ? getAllPresses(catalog, customPresses, pressPatches, hiddenPressIds) : customPresses;
  const pressOrigin = getCatalogOrigin(pressId, customPresses.map(press => press.id), pressPatches.map(patch => patch.id));
  const selectedPress = allPresses.find(press => press.id === pressId) ?? null;

  /**
   * Why this sheet cannot be printed on the press in use, or null when it
   * can. The judgement is the engine's own, so a sheet the step offers and
   * one the imposition accepts can never disagree. The sheet in use is never
   * disabled: the plan already explains that pairing in full.
   */
  function whyUnavailable(sheet: SheetSize): string | null {
    if (!selectedPress || sheet.id === sheetSizeId) return null;
    return sheetFitsPress(sheet.width_mm, sheet.height_mm, selectedPress)
      ? null
      : 'no cabe en la prensa';
  }

  return (
    <div className="panel" id="imposition-visualizer">
      <p className="calculation-note">
        Muestra la firma elegida sobre el pliego, con la pinza y los márgenes de la prensa descontados.
        Es una referencia preliminar, no una imposición industrial certificada.
      </p>

      <OptionField
        label="Prensa"
        id="press-group"
        columns={1}
        fromCatalog
        marginalia={ORIGIN_LABEL[pressOrigin]}
        note={pressOrigin === 'own' && !userLayerStorageAvailable && (
          <p className="config-source-note">prensa personalizada, guardada solo para esta sesión</p>
        )}
      >
        {allPresses.map(press => (
          <OptionCard
            key={press.id}
            id={`press-${press.id}`}
            row
            name={press.name}
            detail={`pinza ${press.gripperMargin_mm} mm · máx ${press.maxSheetWidth_mm / 10}×${press.maxSheetHeight_mm / 10} cm`}
            selected={press.id === pressId}
            onSelect={() => setPress(press.id)}
            figure={<PressFigure press={press} />}
          />
        ))}
      </OptionField>

      <OptionField
        label="Esquema de plegado"
        id="folding-scheme-group"
        columns={3}
        fromCatalog
        note={/*
          * The only one of the seven source notes that is not boilerplate: the
          * other six say the values are examples, which the header now says
          * once, and this one warns that a scheme has to be checked against a
          * folded sheet before anything is printed from it. It stays with the
          * control it warns about, and costs nothing while the step is closed.
          */
          catalog && <p className="config-source-note">{catalog.foldingSchemesSource}</p>
        }
      >
        <OptionCard
          id="folding-scheme-auto"
          name="Automático"
          detail="menor desperdicio"
          selected={foldingSchemeId === null}
          onSelect={() => setFoldingScheme(null)}
        />
        {catalog?.foldingSchemes.map(scheme => (
          <OptionCard
            key={scheme.id}
            id={`folding-scheme-${scheme.id}`}
            name={`${scheme.pagesPerSignature} pág.`}
            ariaLabel={scheme.name}
            title={scheme.name}
            selected={foldingSchemeId === scheme.id}
            onSelect={() => setFoldingScheme(scheme.id)}
            figure={<FoldFigure cols={scheme.cols} rows={scheme.rows} />}
          />
        ))}
      </OptionField>

      <OptionField
        label="Tamaño del pliego"
        id="sheet-size-group"
        columns={3}
        fromCatalog
        marginalia={ORIGIN_LABEL[sheetOrigin]}
        error={signatureError}
        note={isSelectedSheetCustom && !userLayerStorageAvailable && (
          <p className="config-source-note">pliego personalizado, guardado solo para esta sesión</p>
        )}
      >
        {allSheets.map(sheet => (
          <OptionCard
            key={sheet.id}
            id={`sheet-${sheet.id}`}
            name={sheet.name}
            selected={sheet.id === sheetSizeId}
            disabledReason={whyUnavailable(sheet)}
            onSelect={() => setSheetSize(sheet.id)}
            figure={<SheetFigure sheet={sheet} />}
          />
        ))}
      </OptionField>
    </div>
  );
}
