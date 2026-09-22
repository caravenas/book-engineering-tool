import { useBookStore, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';

/**
 * The derivations behind the figures, folded away until someone asks for
 * them. They used to sit open in the steps that produce them: the spine
 * formulas under the page count, and the creep paragraph — the longest text
 * in the app — under the binding method. Both are read once, to check that
 * the tool means what the reader thinks it means, and then never again, so
 * they cost a screen of the spec sheet every session to answer a question
 * asked in the first one.
 *
 * It lives at the foot of the results column because that is what it
 * explains. Until R-21 it was folded away behind a disclosure; the design
 * canvas keeps it open, under a rule, as part of the column — six short
 * lines that say what the figures above them are made of, which is worth the
 * room it takes and was not worth a click.
 */
export function HowItIsCalculated() {
  const {
    totalPages, totalPagesInput, spineResult, pageWidth_mm, pageHeight_mm, selectedGrammage, bindingCreep,
  } = useBookStore();

  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);
  const sheetCount = Math.ceil(totalPages / 2);

  // Nothing to explain is not an empty section: a disclosure that opens onto
  // nothing is worse than no disclosure at all.
  if (!safeResult && !bindingCreep) return null;

  return (
    <section className="how-panel" aria-label="Cómo se calcula">
      <h3 className="how-panel-title">Cómo se calcula</h3>

      {safeResult && (
        <p className="how-panel-formula">
          Hojas físicas = ⌈{totalPages} ÷ 2⌉ = {sheetCount} hojas<br />
          Lomo estimado = {sheetCount} hojas × calibre<br />
          Peso interior estimado = ({formatRoundedValue(pageWidth_mm / 1000, 4)} × {formatRoundedValue(pageHeight_mm / 1000, 4)}) m² × {sheetCount} hojas × {selectedGrammage} g/m²
        </p>
      )}

      {bindingCreep && (
        <p className="how-panel-text">
          Corrimiento (creep): esta encuadernación anida pliegos plegados de 4 páginas, uno dentro de otro; hay {bindingCreep.nestedSheets} pliegos anidados.
          El pliego más externo se desplaza un máximo de {formatRoundedValue(bindingCreep.maxShift_mm, 3)} mm y el más interno no se desplaza.
          Este pliego plegado es distinto del pliego de prensa de Imposición por firmas, porque aquí se cuenta cada grupo de 4 páginas ya plegado, sin importar el esquema de plegado elegido.
        </p>
      )}

      {/* The one sentence the whole column is qualified by, said where the
          column ends rather than repeated under each figure. */}
      <p className="how-panel-note">valores preliminares · confirmar con la imprenta</p>
    </section>
  );
}
