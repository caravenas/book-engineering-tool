import type { ReactNode } from 'react';
import { useBookFigures } from './bookFigures';
import { layoutSide } from '../engine/signatures';
import { formatRoundedValue, formatWeightParts, formatMm, roundTo } from '../engine/units';

/**
 * The six figures the design canvas draws, each with the picture that makes
 * it readable: a spine measured against spines you know, a weight measured
 * against things you have carried, a count of sheets you can see at a glance.
 *
 * Their labels carry the same `stat-label` class the rows below use, and for
 * the same reason: a figure that got a drawing is still a result, and
 * `e2e/inventory.spec.ts` counts every result on the page by that class.
 *
 * Each of the six takes a figure out of the rows below rather than repeating
 * it there. What stays in the rows is what breaks a figure down — the spine's
 * two addends, the blank pages, the boards of a hard cover — which is
 * structure, not duplication.
 */

/** A figure, its marginalia, the drawing that explains it, and the number. */
function Figure({
  label, aside, children, value, unit,
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
  value: string;
  unit: ReactNode;
}) {
  return (
    <div className="figure">
      <div className="figure-head">
        <span className="stat-label">{label}</span>
        {aside && <span className="figure-aside">{aside}</span>}
      </div>
      <div className="figure-drawing">{children}</div>
      <div className="figure-value">
        <span className="stat-value">{value}</span>
        <span className="figure-unit">{unit}</span>
      </div>
    </div>
  );
}

/** The spines a print shop already knows, drawn beside the one in hand. */
const SPINE_REFERENCES = [5, 10, 20, 40];

function SpineFigure() {
  const { spineTotal_mm, sheets, caliper_mm, hasFlatSpine } = useBookFigures();
  if (spineTotal_mm === null) return null;

  // One scale for the references and the real thing, chosen so the widest of
  // them fits: a comparison at two scales compares nothing.
  const widest = Math.max(spineTotal_mm, ...SPINE_REFERENCES);
  const scale = 60 / widest;

  return (
    <Figure
      label={hasFlatSpine ? 'Lomo final con encuadernación' : 'Grosor del papel en el pliegue'}
      aside={`${sheets} hojas × ${caliper_mm} µm`}
      value={formatRoundedValue(spineTotal_mm, 2)}
      unit="mm"
    >
      <div className="spine-bars">
        {SPINE_REFERENCES.map((reference, index) => (
          <div key={reference} className="spine-bar">
            {/* The unit once, on the last of them, rather than five times. */}
            <span className="spine-bar-label">
              {reference}{index === SPINE_REFERENCES.length - 1 ? ' mm' : ''}
            </span>
            <span className="spine-bar-mark" style={{ width: `${Math.max(2, reference * scale)}px` }} />
          </div>
        ))}
        {/* The one in hand: taller and filled, and unlabelled because the
            figure under the drawing is its label. */}
        <div className="spine-bar current">
          <span className="spine-bar-label" />
          <span className="spine-bar-mark" style={{ width: `${Math.max(2, spineTotal_mm * scale)}px` }} />
        </div>
      </div>
    </Figure>
  );
}

/** The scale the weight is read against, in grams, and its marked points. */
const WEIGHT_SCALE_G = 1500;
const WEIGHT_REFERENCES = [
  { label: '100 g', grams: 100 },
  { label: '500 g', grams: 500 },
  { label: '1 kg', grams: 1000 },
  { label: '1,5 kg', grams: 1500 },
];

function WeightFigure() {
  const { interiorWeight_g, coverWeight_g, paperWeight_g, boardUnweighed } = useBookFigures();
  if (paperWeight_g === null || interiorWeight_g === null || coverWeight_g === null) return null;

  const weight = formatWeightParts(paperWeight_g);
  const share = Math.min(100, (paperWeight_g / WEIGHT_SCALE_G) * 100);
  const interiorShare = Math.min(100, (interiorWeight_g / WEIGHT_SCALE_G) * 100);

  return (
    <Figure
      label="Peso del papel por ejemplar"
      aside={
        <>
          interior {formatWeightParts(interiorWeight_g).value} {formatWeightParts(interiorWeight_g).unit}
          {' + tapa '}
          {formatWeightParts(coverWeight_g).value} {formatWeightParts(coverWeight_g).unit}
          {/* A hard cover's board has no declared density, so it is not in
              the total. Said on the figure, not under it: a weight that
              leaves something out has to say so where it is read. */}
          {boardUnweighed && ' · sin el cartón'}
        </>
      }
      value={weight.value}
      unit={weight.unit}
    >
      <div className="weight-scale">
        <div className="weight-track">
          <span className="weight-fill" style={{ width: `${share}%` }} />
          <span className="weight-split" style={{ left: `${interiorShare}%` }} />
        </div>
        <div className="weight-ticks">
          {WEIGHT_REFERENCES.map(reference => (
            <span
              key={reference.label}
              className="weight-tick"
              style={{ left: `${(reference.grams / WEIGHT_SCALE_G) * 100}%` }}
            >
              {reference.label}
            </span>
          ))}
        </div>
      </div>
    </Figure>
  );
}

/** At most this many press sheets are drawn, and this many signatures. */
const MAX_DRAWN_SHEETS = 40;
const MAX_DRAWN_SIGNATURES = 8;

function SheetsFigure() {
  const { plan, sheetSize, totalPages } = useBookFigures();
  if (!plan || !sheetSize) return null;

  const perSide = plan.cols * plan.rows;
  const drawn = Math.min(plan.sheetsPerCopy, MAX_DRAWN_SHEETS);
  // How much of the last sheet the book actually fills, which is the one
  // place the waste of a short run shows up as paper somebody pays for.
  const onLastSheet = totalPages - (plan.sheetsPerCopy - 1) * 2 * perSide;
  const lastFill = Math.max(0, Math.min(100, Math.round((onLastSheet / (2 * perSide)) * 100)));

  return (
    <Figure
      label="Pliegos de prensa por ejemplar"
      aside={`${perSide} pág. por cara · ${perSide * 2} por pliego`}
      value={String(plan.sheetsPerCopy)}
      unit={`pliegos ${sheetSize.name}`}
    >
      <div className="sheet-icons">
        {Array.from({ length: drawn }, (_, index) => (
          <span
            key={index}
            className="sheet-icon"
            style={{
              width: `${Math.max(4, Math.round(sheetSize.width_mm / 40))}px`,
              height: `${Math.max(6, Math.round(sheetSize.height_mm / 40))}px`,
              /* The last one is filled only as far as the book fills it. */
              background: index === drawn - 1
                ? `linear-gradient(to top, var(--color-text-primary) ${lastFill}%, var(--color-bg-input) ${lastFill}%)`
                : 'var(--color-text-primary)',
            }}
          />
        ))}
      </div>
    </Figure>
  );
}

function SignaturesFigure() {
  const { plan, sheets, binding } = useBookFigures();
  if (!plan) return null;

  const drawn = Math.min(plan.signatures, MAX_DRAWN_SIGNATURES);

  return (
    <Figure
      label="Firmas por ejemplar"
      aside={`${plan.scheme.pagesPerSignature} pág. cada una`}
      value={String(plan.signatures)}
      unit={`firmas · ${sheets} hojas · ${binding?.name ?? 'sin método'}`}
    >
      {/* Stacked with an offset, the way a pile of folded signatures sits on a
          bench: the folded edge of each one is the thick left rule. */}
      <div className="signature-fan">
        {Array.from({ length: drawn }, (_, index) => (
          <span key={index} className="signature-leaf" style={{ left: `${index * 18}px`, top: `${20 - index * 2}px` }} />
        ))}
        {plan.signatures > drawn && <span className="signature-more">+{plan.signatures - drawn} más</span>}
      </div>
    </Figure>
  );
}

/** How big the sheet of the waste figure is drawn, in pixels. */
const MINI_SHEET = 62;

function WasteFigure() {
  const { plan, sheetSize, press } = useBookFigures();
  if (!plan || !sheetSize || !press) return null;

  const scale = Math.min(MINI_SHEET / sheetSize.width_mm, MINI_SHEET / sheetSize.height_mm);
  // The real imposition, not a grid redrawn from the same numbers: the pages
  // sit where the engine puts them, gutters and margins included.
  const placements = layoutSide(plan, 'front');
  const used = roundTo(100 - plan.wastePercentage, 1);

  return (
    <Figure
      label="Aprovechamiento del pliego"
      aside={`pinza ${press.gripperMargin_mm} mm`}
      value={formatRoundedValue(used, 1)}
      unit={`% aprovechado · ${formatRoundedValue(plan.wastePercentage, 1)} % de merma`}
    >
      <div className="waste-row">
        <span
          className="waste-sheet"
          style={{ width: `${sheetSize.width_mm * scale}px`, height: `${sheetSize.height_mm * scale}px` }}
        >
          {placements.map((placement, index) => (
            <span
              key={index}
              className="waste-cell"
              style={{
                left: `${placement.x_mm * scale}px`,
                top: `${placement.y_mm * scale}px`,
                width: `${placement.width_mm * scale}px`,
                height: `${placement.height_mm * scale}px`,
              }}
            />
          ))}
        </span>
        <span className="waste-bar">
          <span className="waste-fill" style={{ width: `${used}%` }} />
        </span>
      </div>
    </Figure>
  );
}

function CoverFigure() {
  const { coverPlan, cover, spineTotal_mm } = useBookFigures();
  if (!coverPlan) return null;

  const width_mm = coverPlan.kind === 'blanda' ? coverPlan.sheetWidth_mm : coverPlan.wrapWidth_mm;
  const height_mm = coverPlan.kind === 'blanda' ? coverPlan.sheetHeight_mm : coverPlan.wrapHeight_mm;
  const sections = coverPlan.kind === 'blanda' ? coverPlan.sections : null;
  const scale = Math.min(230 / width_mm, 50 / height_mm);

  return (
    <Figure
      label="Tapa extendida"
      aside={cover?.name ?? 'sin tapa'}
      value={`${formatMm(width_mm)} × ${formatMm(height_mm)}`}
      unit={coverPlan.kind === 'blanda' ? 'mm, ya con el lomo' : 'mm de forro'}
    >
      <span className="flat-cover" style={{ height: `${height_mm * scale}px` }}>
        {sections ? (
          <>
            {sections.flapLeft_mm > 0 && <span className="flat-flap" style={{ width: `${sections.flapLeft_mm * scale}px` }} />}
            <span className="flat-panel" style={{ width: `${sections.back_mm * scale}px` }} />
            <span className="flat-spine" style={{ width: `${Math.max(2, sections.spine_mm * scale)}px` }} />
            <span className="flat-panel" style={{ width: `${sections.front_mm * scale}px` }} />
            {sections.flapRight_mm > 0 && <span className="flat-flap" style={{ width: `${sections.flapRight_mm * scale}px` }} />}
          </>
        ) : (
          /* A hard cover's wrap is one sheet with the boards inside it; what
             the drawing can honestly show is where the spine falls on it. */
          <>
            <span className="flat-panel" style={{ width: `${((width_mm - (spineTotal_mm ?? 0)) / 2) * scale}px` }} />
            <span className="flat-spine" style={{ width: `${Math.max(2, (spineTotal_mm ?? 0) * scale)}px` }} />
            <span className="flat-panel" style={{ width: `${((width_mm - (spineTotal_mm ?? 0)) / 2) * scale}px` }} />
          </>
        )}
      </span>
    </Figure>
  );
}

export function ResultFigures() {
  return (
    <div className="figure-grid">
      <SpineFigure />
      <WeightFigure />
      <SheetsFigure />
      <SignaturesFigure />
      <WasteFigure />
      <CoverFigure />
    </div>
  );
}
