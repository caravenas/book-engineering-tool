import { useBookStore, getAllSheetSizes, getAllPresses } from '../store/useBookStore';
import { useCatalogPanel } from './CatalogPanel';
import { ConfigSourceNote } from './ConfigSourceNote';
import { getCatalogOrigin, CatalogOriginNote } from './CatalogOrigin';

export function ImpositionVisualizer() {
  const { open: openCatalog } = useCatalogPanel();
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

        <div className="form-group" role="group" aria-labelledby="sheet-size-group-label">
          <div className="form-label-row">
            <span id="sheet-size-group-label" className="form-label">Tamaño del pliego</span>
            <button
              type="button"
              className="step-options"
              aria-label="Opciones de pliego"
              aria-haspopup="dialog"
              onClick={() => openCatalog('sheetSizes')}
            >
              ···
            </button>
          </div>
          <label className="visually-hidden" htmlFor="select-sheet-size">Pliego seleccionado</label>
          <select
            className="form-input"
            value={sheetSizeId}
            onChange={event => setSheetSize(event.target.value)}
            id="select-sheet-size"
          >
            {allSheets.map(sheet => (
              <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
            ))}
          </select>
          <CatalogOriginNote origin={sheetOrigin} />
          {isSelectedSheetCustom ? (
            <ConfigSourceNote text={userLayerStorageAvailable ? 'pliego personalizado' : 'pliego personalizado, guardado solo para esta sesión'} />
          ) : catalog && (
            <ConfigSourceNote file="config/pliegos.json" text={catalog.sheetSizesSource} />
          )}
        </div>
      </div>

      {signatureError && (
        <p className="calculation-error" role="alert">{signatureError}</p>
      )}

    </div>
  );
}
