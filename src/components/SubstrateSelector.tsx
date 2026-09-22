import { useCatalogPanel } from './CatalogPanel';
import { useBookStore, getAllGrammageOptions, getAllSubstrates } from '../store/useBookStore';
import { getCatalogOrigin, ORIGIN_LABEL } from './CatalogOrigin';
import { OptionField, OptionCard } from './OptionGroup';

/** How tall the shortest and the tallest notch of the scale are drawn. */
const NOTCH_MIN_HEIGHT = 12;
const NOTCH_MAX_HEIGHT = 44;

/**
 * The height of a weight's notch, from the caliper the catalog declares for
 * it rather than from the weight itself: what a stack of this paper measures
 * is the caliper, and it is the figure every thickness in this tool is built
 * on. Scaled inside the chosen paper's own range, because the catalog runs
 * from a 70µm coated sheet to a 490µm board and one scale for all of them
 * would draw every interior paper as the same stub.
 */
function notchHeight(caliper: number, thinnest: number, thickest: number): number {
  if (!(thickest > thinnest)) return NOTCH_MAX_HEIGHT;
  const share = (caliper - thinnest) / (thickest - thinnest);
  return NOTCH_MIN_HEIGHT + share * (NOTCH_MAX_HEIGHT - NOTCH_MIN_HEIGHT);
}

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
  const substrateOrigin = getCatalogOrigin(
    substrateId,
    customSubstrates.map(substrate => substrate.id),
    substratePatches.map(patch => patch.id)
  );
  const allOptions = getAllGrammageOptions(substrates, substrateId, customGrammages);
  const currentOption = allOptions.find(option => option.grammage === selectedGrammage);
  const isCustomGrammage = (grammage: number) => customGrammages.some(custom => (
    custom.substrateId === substrateId && custom.grammage === grammage
  ));
  const isSelectedGrammageCustom = isCustomGrammage(selectedGrammage);

  const calipers = allOptions.map(option => option.caliper);
  const thinnest = Math.min(...calipers);
  const thickest = Math.max(...calipers);

  return (
    <div className="panel" id="substrate-selector">

      {/*
        * The papers as a sample book: what a paper is for is written on the
        * card, where it is read while choosing, instead of under the control
        * where it described a choice already made.
        */}
      <OptionField
        label="Tipo de papel"
        id="substrate-group"
        columns={2}
        fromCatalog
        marginalia={ORIGIN_LABEL[substrateOrigin]}
        options={{ label: 'Opciones de papel', onOpen: () => openCatalog('substrates') }}
      >
        {substrates.map(substrate => (
          <OptionCard
            key={substrate.id}
            id={`substrate-${substrate.id}`}
            name={substrate.name}
            detail={substrate.description}
            selected={substrate.id === substrateId}
            onSelect={() => setSubstrate(substrate.id)}
          />
        ))}
      </OptionField>

      {/*
        * The weights as a scale standing on an axis, each notch as thick as
        * the paper it stands for. A weight is a number a printer knows by
        * heart, so every notch keeps its own, and an asterisk marks the ones
        * this shop added rather than bought from the catalog.
        */}
      <OptionField
        label="Gramaje"
        id="grammage-group"
        layout="scale"
        fromCatalog
        marginalia={ORIGIN_LABEL[isSelectedGrammageCustom ? 'own' : 'factory']}
        note={isSelectedGrammageCustom && !userLayerStorageAvailable && (
          <p className="config-source-note">gramaje personalizado, guardado solo para esta sesión</p>
        )}
      >
        {allOptions.map(option => {
          const custom = isCustomGrammage(option.grammage);
          const chosen = selectedGrammage === option.grammage;
          return (
            <OptionCard
              key={option.grammage}
              id={`grammage-${substrateId}-${option.grammage}`}
              variant="notch"
              /* The unit rides on the chosen notch alone: on all five it would
                 repeat what the axis already means, and on none of them the
                 unit would be nowhere on screen. */
              name={`${option.grammage}${chosen ? ' g/m²' : ''}${custom ? ' *' : ''}`}
              ariaLabel={`${option.grammage} g/m²${custom ? ', personalizado' : ''}`}
              selected={chosen}
              onSelect={() => setGrammage(option.grammage)}
              figure={(
                <span
                  className="grammage-notch"
                  style={{ height: `${notchHeight(option.caliper, thinnest, thickest)}px` }}
                />
              )}
            />
          );
        })}
      </OptionField>

      {currentOption && (
        <div className="caliper-figure">
          <div className="stat-label">Calibre declarado</div>
          <div className="caliper-value">
            {currentOption.caliper} <span className="caliper-unit">μm</span>
          </div>
        </div>
      )}
    </div>
  );
}
