import type {
  Binding,
  BindingPageCountResult,
  BindingSpineResult,
  CreepCompensationResult,
} from '../types';

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un número finito mayor que cero`);
  }
}

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} debe ser un número finito no negativo`);
  }
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un entero seguro mayor que cero`);
  }
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/**
 * Largest multiple of `step` that is <= `totalPages` and no less than the
 * smallest in-range multiple of `step`, or `null` when even that smallest
 * in-range multiple already exceeds `totalPages`.
 */
function nearestValidCounts(
  totalPages: number,
  minPages: number,
  maxPages: number,
  step: number
): { nearestBelow: number | null; nearestAbove: number | null } {
  const lowerAnchor = Math.ceil(minPages / step) * step;
  const upperAnchor = Math.floor(maxPages / step) * step;

  if (lowerAnchor > upperAnchor) {
    // No multiple of `step` fits inside [minPages, maxPages] at all.
    return { nearestBelow: null, nearestAbove: null };
  }

  const rawBelow = Math.floor(totalPages / step) * step;
  const rawAbove = Math.ceil(totalPages / step) * step;

  return {
    nearestBelow: rawBelow < lowerAnchor ? null : Math.min(rawBelow, upperAnchor),
    nearestAbove: rawAbove > upperAnchor ? null : Math.max(rawAbove, lowerAnchor),
  };
}

function describeNearest(nearestBelow: number | null, nearestAbove: number | null): string {
  if (nearestBelow !== null && nearestAbove !== null) {
    return `los valores válidos más cercanos son ${nearestBelow} y ${nearestAbove}`;
  }
  if (nearestBelow !== null) {
    return `el valor válido más cercano es ${nearestBelow}`;
  }
  if (nearestAbove !== null) {
    return `el valor válido más cercano es ${nearestAbove}`;
  }
  return 'no existe un número de páginas válido para esta encuadernación en el rango configurado';
}

/**
 * The smallest number of pages a count can move by and still satisfy this
 * method: its own page multiple, or the least common multiple of that and the
 * signature size when the method demands whole signatures. It is what
 * `validatePageCount` measures a count against, and since R-16 also what the
 * page counter in the interface adds and subtracts, so that pressing + can
 * never land on a count the same rule then rejects.
 *
 * `pagesPerSignature` is `null` when no signature plan is available, exactly
 * as in `validatePageCount`: the signature rule is then not in force, so it
 * does not enlarge the step either.
 */
export function pageCountStep(binding: Binding, pagesPerSignature: number | null): number {
  assertPositiveSafeInteger(binding.pageMultiple, 'El múltiplo de páginas de la encuadernación');
  if (pagesPerSignature !== null) {
    assertPositiveSafeInteger(pagesPerSignature, 'Las páginas por firma');
  }

  return binding.requiresSignatureMultiple && pagesPerSignature !== null
    ? lcm(binding.pageMultiple, pagesPerSignature)
    : binding.pageMultiple;
}

/**
 * Validate `totalPages` against one binding method's rules: the page multiple
 * it demands, its [minPages, maxPages] range, and, when the method requires
 * it and a signature size is known, the folding signature's own multiple.
 * `pagesPerSignature` is `null` when no signature plan is available yet; the
 * signature-multiple rule is then simply not evaluated, not treated as a
 * failure. Any other value that isn't a positive integer is a caller bug,
 * not a legitimate "no plan" state, and throws instead of being silently
 * accepted.
 *
 * Reason priority, checked in this order, because a count can fail more than
 * one rule at once and only one reason can be reported: `not-multiple` first
 * (the method's own page multiple is the most basic requirement), then
 * `not-signature-multiple` (a stricter multiple that only applies on top of
 * the first), then the range checks `below-min`/`above-max` (which only make
 * sense once the count is already a valid multiple).
 */
export function validatePageCount(
  binding: Binding,
  totalPages: number,
  pagesPerSignature: number | null
): BindingPageCountResult {
  assertPositiveSafeInteger(binding.pageMultiple, 'El múltiplo de páginas de la encuadernación');
  assertPositiveSafeInteger(binding.minPages, 'El mínimo de páginas de la encuadernación');
  assertPositiveSafeInteger(binding.maxPages, 'El máximo de páginas de la encuadernación');
  if (binding.minPages > binding.maxPages) {
    throw new RangeError('El mínimo de páginas de la encuadernación debe ser menor o igual que el máximo');
  }

  assertPositiveSafeInteger(totalPages, 'El número de páginas');

  if (pagesPerSignature !== null) {
    assertPositiveSafeInteger(pagesPerSignature, 'Las páginas por firma');
  }

  const signatureMultipleApplies = binding.requiresSignatureMultiple && pagesPerSignature !== null;
  const step = pageCountStep(binding, pagesPerSignature);

  const { nearestBelow, nearestAbove } = nearestValidCounts(totalPages, binding.minPages, binding.maxPages, step);

  if (totalPages % binding.pageMultiple !== 0) {
    return {
      ok: false,
      reason: 'not-multiple',
      message: `El número de páginas debe ser múltiplo de ${binding.pageMultiple} para "${binding.name}"; ${describeNearest(nearestBelow, nearestAbove)}.`,
      nearestBelow,
      nearestAbove,
    };
  }

  if (signatureMultipleApplies && totalPages % (pagesPerSignature as number) !== 0) {
    return {
      ok: false,
      reason: 'not-signature-multiple',
      message: `El número de páginas debe ser múltiplo del tamaño de firma (${pagesPerSignature}) para "${binding.name}"; ${describeNearest(nearestBelow, nearestAbove)}.`,
      nearestBelow,
      nearestAbove,
    };
  }

  if (totalPages < binding.minPages) {
    return {
      ok: false,
      reason: 'below-min',
      message: `El número de páginas está por debajo del mínimo de ${binding.minPages} para "${binding.name}"; ${describeNearest(nearestBelow, nearestAbove)}.`,
      nearestBelow,
      nearestAbove,
    };
  }

  if (totalPages > binding.maxPages) {
    return {
      ok: false,
      reason: 'above-max',
      message: `El número de páginas supera el máximo de ${binding.maxPages} para "${binding.name}"; ${describeNearest(nearestBelow, nearestAbove)}.`,
      nearestBelow,
      nearestAbove,
    };
  }

  return { ok: true };
}

/**
 * Add a binding method's contribution to the interior paper spine, keeping
 * both parts visible instead of collapsing them into a single number.
 */
export function spineWithBinding(interiorSpine_mm: number, binding: Binding): BindingSpineResult {
  assertNonNegativeFinite(interiorSpine_mm, 'El lomo del papel interior');
  assertNonNegativeFinite(binding.spineAllowance_mm, 'El aporte al lomo de la encuadernación');

  return {
    interior_mm: interiorSpine_mm,
    allowance_mm: binding.spineAllowance_mm,
    total_mm: interiorSpine_mm + binding.spineAllowance_mm,
  };
}

/**
 * Creep (also called push-out or shingling) only affects binding methods
 * whose folded sheets nest inside one another (`binding.nests`): a
 * saddle-stitched booklet folds every four pages into one nested sheet, and
 * each sheet further from the center sits inside the ones before it, so it
 * must be shifted outward by one caliper per nested sheet between it and the
 * center. Adhesive and sewn methods stack their signatures instead of
 * nesting them, so they declare `nests: false` and this returns `null` for
 * them. `validatePageCount` already enforces that a nesting method's page
 * count is a multiple of 4 upstream; this function re-asserts it so it never
 * silently computes a wrong shift for a caller that skipped that check.
 */
export function creepCompensation(
  binding: Binding,
  totalPages: number,
  caliper_microns: number
): CreepCompensationResult | null {
  assertPositiveSafeInteger(totalPages, 'El número de páginas');

  if (!binding.nests) {
    return null;
  }

  assertPositiveFinite(caliper_microns, 'El calibre');
  if (totalPages % 4 !== 0) {
    throw new RangeError('Un método de encuadernación que anida pliegos exige un número de páginas múltiplo de 4');
  }

  const nestedSheets = totalPages / 4;
  const maxShift_mm = nestedSheets * (caliper_microns / 1000);

  return {
    nestedSheets,
    maxShift_mm,
    // The innermost nested sheet is the reference point of the nest, not a
    // computed value: every other sheet shifts outward relative to it.
    innermostShift_mm: 0,
  };
}
