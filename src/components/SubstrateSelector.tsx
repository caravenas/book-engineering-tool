import { useCatalogPanel } from './CatalogPanel';
import { useBookStore, getAllGrammageOptions, getAllSubstrates } from '../store/useBookStore';
import { OriginBadge } from './CatalogOrigin';

export function SubstrateSelector() {
  const { open: openCatalog } = useCatalogPanel();
  const {
    substrateId,
    selectedGrammage,
    customGrammages,
    customSubstrates,
    substratePatches,
    hiddenSubstrateIds,
    catalog,
    userLayerStorageAvailable,
    setSubstrate,
    setGrammage,
  } = useBookStore();


  const substrates = catalog
    ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds)
    : customSubstrates;
  const currentSubstrate = substrates.find(substrate => substrate.id === substrateId);
  const allOptions = getAllGrammageOptions(substrates, substrateId, customGrammages);
  const currentOption = allOptions.find(option => option.grammage === selectedGrammage);
  const isSelectedGrammageCustom = customGrammages.some(custom => (
    custom.substrateId === substrateId && custom.grammage === selectedGrammage
  ));



  return (
    <div className="panel" id="substrate-selector">

      <div className="form-group">
        <label className="form-label" htmlFor="select-substrate">Tipo de papel</label>
        <select
          className="form-input"
          value={substrateId}
          onChange={event => setSubstrate(event.target.value)}
          id="select-substrate"
        >
          {substrates.map(substrate => (
            <option key={substrate.id} value={substrate.id}>
              {substrate.name}
            </option>
          ))}
        </select>
      </div>

      {currentSubstrate && (
        <div className="form-group">
          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>
            {currentSubstrate.description}
          </p>
        </div>
      )}

      <div className="form-group" role="group" aria-labelledby="grammage-group-label">
        <div className="form-label-row">
          <span className="form-label" id="grammage-group-label">Gramaje</span>
          <OriginBadge origin={isSelectedGrammageCustom ? 'own' : 'factory'} />
          <button
            type="button"
            className="step-options"
            aria-label="Opciones de gramaje"
            aria-haspopup="dialog"
            onClick={() => openCatalog('substrates')}
          >
            ···
          </button>
        </div>
        <div className="segment-group grammage-options">
          {allOptions.map(option => {
            const isCustom = customGrammages.some(custom => (
              custom.substrateId === substrateId && custom.grammage === option.grammage
            ));
            const isActive = selectedGrammage === option.grammage;

            return (
              <button
                key={option.grammage}
                type="button"
                className={`segment-btn ${isActive ? 'active' : ''}`}
                onClick={() => setGrammage(option.grammage)}
                aria-pressed={isActive}
                id={`grammage-${substrateId}-${option.grammage}`}
              >
                {`${option.grammage} g/m²`}{isCustom && ' *'}
              </button>
            );
          })}
        </div>
        {isSelectedGrammageCustom && !userLayerStorageAvailable && (
          <p className="config-source-note">gramaje personalizado, guardado solo para esta sesión</p>
        )}
      </div>


      {currentOption && (
        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
          <div className="stat-label" style={{ marginBottom: 'var(--space-2)' }}>Calibre declarado</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {currentOption.caliper} <span style={{ fontSize: '2rem' }}>μm</span>
          </div>
        </div>
      )}
    </div>
  );
}
