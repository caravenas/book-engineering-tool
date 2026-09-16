import type {
  Catalog,
  CatalogDefaults,
  FoldingScheme,
  GrammageOption,
  Press,
  Proportion,
  SheetSize,
  SlotPlacement,
  Substrate,
} from '../types';

export interface ConfigError {
  file: string;
  path: string;
  message: string;
}

export type ValidateCatalogResult =
  | { ok: true; catalog: Catalog }
  | { ok: false; errors: ConfigError[] };

export interface CatalogFiles {
  'sustratos.json': unknown;
  'pliegos.json': unknown;
  'maquinas.json': unknown;
  'esquemas.json': unknown;
  'formatos.json': unknown;
}

export type CatalogFileName = keyof CatalogFiles;

const SUSTRATOS_FILE = 'sustratos.json';
const PLIEGOS_FILE = 'pliegos.json';
const MAQUINAS_FILE = 'maquinas.json';
const ESQUEMAS_FILE = 'esquemas.json';
const FORMATOS_FILE = 'formatos.json';
const VISIBLE_PROPORTIONS_COUNT = 3;
// Real signatures never approach this size; the cap exists to reject
// pathological input (e.g. 16000000) before the coverage check below builds
// an array and a join() of that size.
const MAX_PAGES_PER_SIGNATURE = 128;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Non-empty, with no leading/trailing whitespace: required for ids, labels, and default references. */
function isCleanIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

interface SustratosValidation {
  substrates: Substrate[];
  source: string | undefined;
  /** Ids seen well-formed, regardless of other fields on that entry, for duplicate/reference checks. */
  knownIds: Set<string>;
  /** Grammages seen well-formed per substrate id, regardless of caliper validity on that option. */
  knownGrammagesById: Map<string, Set<number>>;
}

/**
 * Validate `sustratos.json` and collect every structural or semantic error found.
 * The returned `substrates` array may be incomplete when errors were reported;
 * callers must only trust it once `errors` is empty. `knownIds`/`knownGrammagesById`
 * stay reliable even then, so cross-file reference checks don't cascade false errors.
 */
function validateSustratos(raw: unknown, available: boolean, errors: ConfigError[]): SustratosValidation {
  const knownIds = new Set<string>();
  const knownGrammagesById = new Map<string, Set<number>>();

  if (!available) {
    return { substrates: [], source: undefined, knownIds, knownGrammagesById };
  }

  if (!isPlainObject(raw)) {
    errors.push({ file: SUSTRATOS_FILE, path: '', message: 'El archivo debe contener un objeto JSON.' });
    return { substrates: [], source: undefined, knownIds, knownGrammagesById };
  }

  const { substrates, source } = raw;

  if (!isNonEmptyString(source)) {
    errors.push({ file: SUSTRATOS_FILE, path: 'source', message: 'El campo "source" debe ser un texto no vacío que indique el origen de los datos.' });
  }

  if (!Array.isArray(substrates)) {
    errors.push({ file: SUSTRATOS_FILE, path: 'substrates', message: 'El campo "substrates" debe ser un arreglo.' });
    return { substrates: [], source: isNonEmptyString(source) ? source : undefined, knownIds, knownGrammagesById };
  }
  if (substrates.length === 0) {
    errors.push({ file: SUSTRATOS_FILE, path: 'substrates', message: 'El catálogo de sustratos no puede estar vacío.' });
  }

  const result: Substrate[] = [];

  substrates.forEach((rawSubstrate, index) => {
    const path = `substrates[${index}]`;
    if (!isPlainObject(rawSubstrate)) {
      errors.push({ file: SUSTRATOS_FILE, path, message: 'Cada sustrato debe ser un objeto.' });
      return;
    }

    const { id, name, type, description, options } = rawSubstrate;
    let headerValid = true;

    if (!isCleanIdentifier(id)) {
      errors.push({ file: SUSTRATOS_FILE, path: `${path}.id`, message: 'El id del sustrato debe ser un texto no vacío, sin espacios al inicio o al final.' });
      headerValid = false;
    } else if (knownIds.has(id)) {
      errors.push({ file: SUSTRATOS_FILE, path: `${path}.id`, message: `El id de sustrato "${id}" está duplicado.` });
      headerValid = false;
    }

    if (!isNonEmptyString(name)) {
      errors.push({ file: SUSTRATOS_FILE, path: `${path}.name`, message: 'El nombre del sustrato debe ser un texto no vacío.' });
      headerValid = false;
    }

    if (!isNonEmptyString(type)) {
      errors.push({ file: SUSTRATOS_FILE, path: `${path}.type`, message: 'El tipo del sustrato debe ser un texto no vacío.' });
      headerValid = false;
    }

    if (!isNonEmptyString(description)) {
      errors.push({ file: SUSTRATOS_FILE, path: `${path}.description`, message: 'La descripción del sustrato debe ser un texto no vacío.' });
      headerValid = false;
    }

    // Track the id (and its grammages below) as soon as they are well-formed,
    // independent of headerValid, so a problem elsewhere on this entry doesn't
    // make a valid, existing id/grammage look nonexistent to other checks.
    const substrateKnownGrammages = new Set<number>();
    if (isCleanIdentifier(id) && !knownGrammagesById.has(id)) {
      // Only register the first copy's set: a later duplicate id must not
      // overwrite (and thus hide) the grammages already known for this id.
      knownGrammagesById.set(id, substrateKnownGrammages);
    }

    const optionsResult: GrammageOption[] = [];
    if (!Array.isArray(options)) {
      errors.push({ file: SUSTRATOS_FILE, path: `${path}.options`, message: 'Las opciones de gramaje deben ser un arreglo.' });
    } else {
      if (options.length === 0) {
        errors.push({ file: SUSTRATOS_FILE, path: `${path}.options`, message: 'El sustrato debe declarar al menos una opción de gramaje.' });
      }

      options.forEach((rawOption, optionIndex) => {
        const optionPath = `${path}.options[${optionIndex}]`;
        if (!isPlainObject(rawOption)) {
          errors.push({ file: SUSTRATOS_FILE, path: optionPath, message: 'Cada opción de gramaje debe ser un objeto.' });
          return;
        }

        const { grammage, caliper } = rawOption;
        const grammageWellFormed = isFiniteNumber(grammage) && grammage > 0;
        let optionValid = true;

        if (!grammageWellFormed) {
          errors.push({ file: SUSTRATOS_FILE, path: `${optionPath}.grammage`, message: 'El gramaje debe ser un número finito mayor que cero.' });
          optionValid = false;
        } else if (substrateKnownGrammages.has(grammage)) {
          errors.push({ file: SUSTRATOS_FILE, path: `${optionPath}.grammage`, message: `El gramaje ${grammage} está duplicado en este sustrato.` });
          optionValid = false;
        }

        if (!isFiniteNumber(caliper) || caliper <= 0) {
          errors.push({ file: SUSTRATOS_FILE, path: `${optionPath}.caliper`, message: 'El calibre debe ser un número finito mayor que cero.' });
          optionValid = false;
        }

        // Record the raw grammage as seen even if the caliper on this same
        // entry is invalid, so a duplicate is still caught and other files'
        // references to this grammage aren't falsely reported as missing.
        if (grammageWellFormed) {
          substrateKnownGrammages.add(grammage);
        }

        if (optionValid && grammageWellFormed && isFiniteNumber(caliper)) {
          optionsResult.push({ grammage, caliper });
        }
      });
    }

    if (isCleanIdentifier(id)) {
      knownIds.add(id);
    }

    if (headerValid && isCleanIdentifier(id) && isNonEmptyString(name)
      && isNonEmptyString(type) && isNonEmptyString(description)) {
      result.push({ id, name, type, description, options: optionsResult });
    }
  });

  return {
    substrates: result,
    source: isNonEmptyString(source) ? source : undefined,
    knownIds,
    knownGrammagesById,
  };
}

interface PliegosValidation {
  sheetSizes: SheetSize[];
  source: string | undefined;
  knownIds: Set<string>;
}

/**
 * Validate `pliegos.json` and collect every structural or semantic error found.
 */
function validatePliegos(raw: unknown, available: boolean, errors: ConfigError[]): PliegosValidation {
  const knownIds = new Set<string>();

  if (!available) {
    return { sheetSizes: [], source: undefined, knownIds };
  }

  if (!isPlainObject(raw)) {
    errors.push({ file: PLIEGOS_FILE, path: '', message: 'El archivo debe contener un objeto JSON.' });
    return { sheetSizes: [], source: undefined, knownIds };
  }

  const { sheetSizes, source } = raw;

  if (!isNonEmptyString(source)) {
    errors.push({ file: PLIEGOS_FILE, path: 'source', message: 'El campo "source" debe ser un texto no vacío que indique el origen de los datos.' });
  }

  if (!Array.isArray(sheetSizes)) {
    errors.push({ file: PLIEGOS_FILE, path: 'sheetSizes', message: 'El campo "sheetSizes" debe ser un arreglo.' });
    return { sheetSizes: [], source: isNonEmptyString(source) ? source : undefined, knownIds };
  }
  if (sheetSizes.length === 0) {
    errors.push({ file: PLIEGOS_FILE, path: 'sheetSizes', message: 'El catálogo de pliegos no puede estar vacío.' });
  }

  const result: SheetSize[] = [];

  sheetSizes.forEach((rawSheet, index) => {
    const path = `sheetSizes[${index}]`;
    if (!isPlainObject(rawSheet)) {
      errors.push({ file: PLIEGOS_FILE, path, message: 'Cada pliego debe ser un objeto.' });
      return;
    }

    const { id, name, width_mm, height_mm } = rawSheet;
    let valid = true;

    if (!isCleanIdentifier(id)) {
      errors.push({ file: PLIEGOS_FILE, path: `${path}.id`, message: 'El id del pliego debe ser un texto no vacío, sin espacios al inicio o al final.' });
      valid = false;
    } else if (knownIds.has(id)) {
      errors.push({ file: PLIEGOS_FILE, path: `${path}.id`, message: `El id de pliego "${id}" está duplicado.` });
      valid = false;
    }

    if (!isNonEmptyString(name)) {
      errors.push({ file: PLIEGOS_FILE, path: `${path}.name`, message: 'El nombre del pliego debe ser un texto no vacío.' });
      valid = false;
    }

    if (!isFiniteNumber(width_mm) || width_mm <= 0) {
      errors.push({ file: PLIEGOS_FILE, path: `${path}.width_mm`, message: 'El ancho del pliego debe ser un número finito mayor que cero.' });
      valid = false;
    }

    if (!isFiniteNumber(height_mm) || height_mm <= 0) {
      errors.push({ file: PLIEGOS_FILE, path: `${path}.height_mm`, message: 'El alto del pliego debe ser un número finito mayor que cero.' });
      valid = false;
    }

    if (isCleanIdentifier(id)) {
      knownIds.add(id);
    }

    if (valid && isCleanIdentifier(id) && isNonEmptyString(name)
      && isFiniteNumber(width_mm) && isFiniteNumber(height_mm)) {
      result.push({ id, name, width_mm, height_mm });
    }
  });

  return { sheetSizes: result, source: isNonEmptyString(source) ? source : undefined, knownIds };
}

interface PressesValidation {
  presses: Press[];
  source: string | undefined;
  /** Ids seen well-formed, regardless of other fields on that entry, for duplicate/reference checks. */
  knownIds: Set<string>;
}

/**
 * Validate `maquinas.json` and collect every structural or semantic error found.
 */
function validatePresses(raw: unknown, available: boolean, errors: ConfigError[]): PressesValidation {
  const knownIds = new Set<string>();

  if (!available) {
    return { presses: [], source: undefined, knownIds };
  }

  if (!isPlainObject(raw)) {
    errors.push({ file: MAQUINAS_FILE, path: '', message: 'El archivo debe contener un objeto JSON.' });
    return { presses: [], source: undefined, knownIds };
  }

  const { presses, source } = raw;

  if (!isNonEmptyString(source)) {
    errors.push({ file: MAQUINAS_FILE, path: 'source', message: 'El campo "source" debe ser un texto no vacío que indique el origen de los datos.' });
  }

  if (!Array.isArray(presses)) {
    errors.push({ file: MAQUINAS_FILE, path: 'presses', message: 'El campo "presses" debe ser un arreglo.' });
    return { presses: [], source: isNonEmptyString(source) ? source : undefined, knownIds };
  }
  if (presses.length === 0) {
    errors.push({ file: MAQUINAS_FILE, path: 'presses', message: 'El catálogo de prensas no puede estar vacío.' });
  }

  const result: Press[] = [];

  presses.forEach((rawPress, index) => {
    const path = `presses[${index}]`;
    if (!isPlainObject(rawPress)) {
      errors.push({ file: MAQUINAS_FILE, path, message: 'Cada prensa debe ser un objeto.' });
      return;
    }

    const {
      id, name, maxSheetWidth_mm, maxSheetHeight_mm,
      gripperMargin_mm, sideMargin_mm, tailMargin_mm, gutter_mm,
    } = rawPress;
    let valid = true;

    if (!isCleanIdentifier(id)) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.id`, message: 'El id de la prensa debe ser un texto no vacío, sin espacios al inicio o al final.' });
      valid = false;
    } else if (knownIds.has(id)) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.id`, message: `El id de prensa "${id}" está duplicado.` });
      valid = false;
    }

    if (!isNonEmptyString(name)) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.name`, message: 'El nombre de la prensa debe ser un texto no vacío.' });
      valid = false;
    }

    const widthValid = isFiniteNumber(maxSheetWidth_mm) && maxSheetWidth_mm > 0;
    if (!widthValid) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.maxSheetWidth_mm`, message: 'El ancho máximo de pliego debe ser un número finito mayor que cero.' });
      valid = false;
    }

    const heightValid = isFiniteNumber(maxSheetHeight_mm) && maxSheetHeight_mm > 0;
    if (!heightValid) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.maxSheetHeight_mm`, message: 'El alto máximo de pliego debe ser un número finito mayor que cero.' });
      valid = false;
    }

    const gripperValid = isFiniteNumber(gripperMargin_mm) && gripperMargin_mm >= 0;
    if (!gripperValid) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.gripperMargin_mm`, message: 'El margen de pinza debe ser un número finito no negativo.' });
      valid = false;
    }

    const sideValid = isFiniteNumber(sideMargin_mm) && sideMargin_mm >= 0;
    if (!sideValid) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.sideMargin_mm`, message: 'El margen lateral debe ser un número finito no negativo.' });
      valid = false;
    }

    const tailValid = isFiniteNumber(tailMargin_mm) && tailMargin_mm >= 0;
    if (!tailValid) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.tailMargin_mm`, message: 'El margen de cola debe ser un número finito no negativo.' });
      valid = false;
    }

    const gutterValid = isFiniteNumber(gutter_mm) && gutter_mm >= 0;
    if (!gutterValid) {
      errors.push({ file: MAQUINAS_FILE, path: `${path}.gutter_mm`, message: 'La calle entre páginas debe ser un número finito no negativo.' });
      valid = false;
    }

    if (heightValid && gripperValid && tailValid
      && (gripperMargin_mm as number) + (tailMargin_mm as number) >= (maxSheetHeight_mm as number)) {
      errors.push({
        file: MAQUINAS_FILE,
        path: `${path}.gripperMargin_mm`,
        message: 'La pinza y el margen de cola no dejan área imprimible: su suma debe ser menor que el alto máximo de pliego.',
      });
      valid = false;
    }

    if (widthValid && sideValid && 2 * (sideMargin_mm as number) >= (maxSheetWidth_mm as number)) {
      errors.push({
        file: MAQUINAS_FILE,
        path: `${path}.sideMargin_mm`,
        message: 'Los márgenes laterales no dejan área imprimible: el doble del margen lateral debe ser menor que el ancho máximo de pliego.',
      });
      valid = false;
    }

    if (isCleanIdentifier(id)) {
      knownIds.add(id);
    }

    if (valid && isCleanIdentifier(id) && isNonEmptyString(name)
      && widthValid && heightValid && gripperValid && sideValid && tailValid && gutterValid) {
      result.push({
        id,
        name,
        maxSheetWidth_mm: maxSheetWidth_mm as number,
        maxSheetHeight_mm: maxSheetHeight_mm as number,
        gripperMargin_mm: gripperMargin_mm as number,
        sideMargin_mm: sideMargin_mm as number,
        tailMargin_mm: tailMargin_mm as number,
        gutter_mm: gutter_mm as number,
      });
    }
  });

  return { presses: result, source: isNonEmptyString(source) ? source : undefined, knownIds };
}

interface FoldingSchemesValidation {
  foldingSchemes: FoldingScheme[];
  source: string | undefined;
  knownIds: Set<string>;
}

interface SchemeSideValidation {
  slots: SlotPlacement[];
  /** False when any slot in this side was structurally invalid (not an object, bad page, or bad rotation). */
  valid: boolean;
}

/**
 * Validate one side (`front` or `back`) of a folding scheme's slots: each slot must be an
 * object with an integer `page` and a `rotation` of 0 or 180. Returns the well-formed
 * `{ page, rotation }` pairs found (skipping malformed slots) and whether every slot was
 * well-formed, so the caller can both check page coverage and mark the whole scheme invalid
 * when a slot is not.
 */
function validateSchemeSide(
  raw: unknown,
  file: string,
  path: string,
  errors: ConfigError[]
): SchemeSideValidation {
  if (!Array.isArray(raw)) {
    errors.push({ file, path, message: `El campo "${path}" debe ser un arreglo.` });
    return { slots: [], valid: false };
  }

  const result: SlotPlacement[] = [];
  let valid = true;

  raw.forEach((rawSlot, index) => {
    const slotPath = `${path}[${index}]`;
    if (!isPlainObject(rawSlot)) {
      errors.push({ file, path: slotPath, message: 'Cada posición debe ser un objeto.' });
      valid = false;
      return;
    }

    const { page, rotation } = rawSlot;
    let slotValid = true;

    if (!Number.isInteger(page)) {
      errors.push({ file, path: `${slotPath}.page`, message: 'El número de página debe ser un entero.' });
      slotValid = false;
    }

    if (rotation !== 0 && rotation !== 180) {
      errors.push({ file, path: `${slotPath}.rotation`, message: 'La rotación debe ser 0 o 180 grados.' });
      slotValid = false;
    }

    if (slotValid) {
      result.push({ page: page as number, rotation: rotation as 0 | 180 });
    } else {
      valid = false;
    }
  });

  return { slots: result, valid };
}

/**
 * Check that every page 1..pagesPerSignature appears exactly once across `front` and `back`
 * together: a page appearing more than once is reported as a duplicate at the slot where it
 * reappears, and any page never used is reported once as missing. Returns whether coverage
 * was complete and free of duplicates/out-of-range pages, so the caller can mark the scheme
 * invalid. Callers must only invoke this once `front`/`back` are already known to be
 * structurally sound (right slot count, every slot well-formed): otherwise a coverage gap
 * caused by an already-reported problem would pile on a confusing second error.
 */
function validatePageCoverage(
  front: SlotPlacement[],
  back: SlotPlacement[],
  pagesPerSignature: number,
  schemePath: string,
  errors: ConfigError[]
): boolean {
  const seen = new Set<number>();
  const sides: Array<[SlotPlacement[], string]> = [[front, `${schemePath}.sides.front`], [back, `${schemePath}.sides.back`]];
  let valid = true;

  for (const [slots, sidePath] of sides) {
    slots.forEach((slot, index) => {
      if (slot.page < 1 || slot.page > pagesPerSignature) {
        errors.push({
          file: ESQUEMAS_FILE,
          path: `${sidePath}[${index}].page`,
          message: `La página ${slot.page} está fuera del rango 1..${pagesPerSignature}.`,
        });
        valid = false;
        return;
      }
      if (seen.has(slot.page)) {
        errors.push({
          file: ESQUEMAS_FILE,
          path: `${sidePath}[${index}].page`,
          message: `La página ${slot.page} está duplicada entre tiro y retiro.`,
        });
        valid = false;
        return;
      }
      seen.add(slot.page);
    });
  }

  const missing: number[] = [];
  for (let page = 1; page <= pagesPerSignature; page += 1) {
    if (!seen.has(page)) {
      missing.push(page);
    }
  }
  if (missing.length > 0) {
    errors.push({
      file: ESQUEMAS_FILE,
      path: `${schemePath}.sides`,
      message: `Faltan las páginas ${missing.join(', ')} entre tiro y retiro.`,
    });
    valid = false;
  }

  return valid;
}

/**
 * Validate `esquemas.json` and collect every structural or semantic error found.
 */
function validateFoldingSchemes(raw: unknown, available: boolean, errors: ConfigError[]): FoldingSchemesValidation {
  const knownIds = new Set<string>();

  if (!available) {
    return { foldingSchemes: [], source: undefined, knownIds };
  }

  if (!isPlainObject(raw)) {
    errors.push({ file: ESQUEMAS_FILE, path: '', message: 'El archivo debe contener un objeto JSON.' });
    return { foldingSchemes: [], source: undefined, knownIds };
  }

  const { foldingSchemes, source } = raw;

  if (!isNonEmptyString(source)) {
    errors.push({ file: ESQUEMAS_FILE, path: 'source', message: 'El campo "source" debe ser un texto no vacío que indique el origen de los datos.' });
  }

  if (!Array.isArray(foldingSchemes)) {
    errors.push({ file: ESQUEMAS_FILE, path: 'foldingSchemes', message: 'El campo "foldingSchemes" debe ser un arreglo.' });
    return { foldingSchemes: [], source: isNonEmptyString(source) ? source : undefined, knownIds };
  }
  if (foldingSchemes.length === 0) {
    errors.push({ file: ESQUEMAS_FILE, path: 'foldingSchemes', message: 'El catálogo de esquemas de plegado no puede estar vacío.' });
  }

  const result: FoldingScheme[] = [];

  foldingSchemes.forEach((rawScheme, index) => {
    const path = `foldingSchemes[${index}]`;
    if (!isPlainObject(rawScheme)) {
      errors.push({ file: ESQUEMAS_FILE, path, message: 'Cada esquema de plegado debe ser un objeto.' });
      return;
    }

    const { id, name, pagesPerSignature, cols, rows, sides } = rawScheme;
    let valid = true;

    if (!isCleanIdentifier(id)) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.id`, message: 'El id del esquema debe ser un texto no vacío, sin espacios al inicio o al final.' });
      valid = false;
    } else if (knownIds.has(id)) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.id`, message: `El id de esquema "${id}" está duplicado.` });
      valid = false;
    }

    if (!isNonEmptyString(name)) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.name`, message: 'El nombre del esquema debe ser un texto no vacío.' });
      valid = false;
    }

    const pagesValid = isPositiveSafeInteger(pagesPerSignature)
      && pagesPerSignature % 4 === 0
      && pagesPerSignature <= MAX_PAGES_PER_SIGNATURE;
    if (!pagesValid) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.pagesPerSignature`, message: `Las páginas por firma deben ser un entero seguro mayor que cero, múltiplo de 4, y como máximo ${MAX_PAGES_PER_SIGNATURE}.` });
      valid = false;
    }

    const colsValid = isPositiveSafeInteger(cols);
    if (!colsValid) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.cols`, message: 'El número de columnas debe ser un entero seguro mayor que cero.' });
      valid = false;
    }

    const rowsValid = isPositiveSafeInteger(rows);
    if (!rowsValid) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.rows`, message: 'El número de filas debe ser un entero seguro mayor que cero.' });
      valid = false;
    }

    if (pagesValid && colsValid && rowsValid
      && (cols as number) * (rows as number) !== (pagesPerSignature as number) / 2) {
      errors.push({
        file: ESQUEMAS_FILE,
        path: `${path}.cols`,
        message: `El producto de "cols" y "rows" (${(cols as number) * (rows as number)}) debe ser igual a la mitad de "pagesPerSignature" (${(pagesPerSignature as number) / 2}).`,
      });
      valid = false;
    }

    let front: SlotPlacement[] = [];
    let back: SlotPlacement[] = [];
    if (!isPlainObject(sides)) {
      errors.push({ file: ESQUEMAS_FILE, path: `${path}.sides`, message: 'El campo "sides" debe ser un objeto con "front" y "back".' });
      valid = false;
    } else {
      const frontSide = validateSchemeSide(sides.front, ESQUEMAS_FILE, `${path}.sides.front`, errors);
      const backSide = validateSchemeSide(sides.back, ESQUEMAS_FILE, `${path}.sides.back`, errors);
      front = frontSide.slots;
      back = backSide.slots;
      if (!frontSide.valid || !backSide.valid) {
        valid = false;
      }

      const expectedSlots = colsValid && rowsValid ? (cols as number) * (rows as number) : undefined;
      let frontCountValid = true;
      let backCountValid = true;
      if (expectedSlots !== undefined) {
        if (Array.isArray(sides.front) && sides.front.length !== expectedSlots) {
          errors.push({
            file: ESQUEMAS_FILE,
            path: `${path}.sides.front`,
            message: `El tiro debe tener exactamente ${expectedSlots} posiciones (cols × rows).`,
          });
          frontCountValid = false;
          valid = false;
        }
        if (Array.isArray(sides.back) && sides.back.length !== expectedSlots) {
          errors.push({
            file: ESQUEMAS_FILE,
            path: `${path}.sides.back`,
            message: `El retiro debe tener exactamente ${expectedSlots} posiciones (cols × rows).`,
          });
          backCountValid = false;
          valid = false;
        }
      }

      // Only check page coverage once the sides are structurally sound (every
      // slot well-formed and the right slot count): otherwise a problem
      // already reported above (e.g. one rejected rotation) would also
      // surface as a confusing, redundant "faltan las páginas" here.
      if (pagesValid && frontSide.valid && backSide.valid && frontCountValid && backCountValid) {
        if (!validatePageCoverage(front, back, pagesPerSignature as number, path, errors)) {
          valid = false;
        }
      }
    }

    if (isCleanIdentifier(id)) {
      knownIds.add(id);
    }

    if (valid && isCleanIdentifier(id) && isNonEmptyString(name) && pagesValid && colsValid && rowsValid) {
      result.push({
        id,
        name,
        pagesPerSignature: pagesPerSignature as number,
        cols: cols as number,
        rows: rows as number,
        sides: { front, back },
      });
    }
  });

  return { foldingSchemes: result, source: isNonEmptyString(source) ? source : undefined, knownIds };
}

interface ProportionsValidation {
  proportions: Proportion[];
  knownLabels: Set<string>;
  /** Labels well-formed at raw indices 0-2, regardless of other fields on that entry. */
  visibleLabels: Set<string>;
}

function validateProportions(raw: unknown, errors: ConfigError[]): ProportionsValidation {
  const knownLabels = new Set<string>();
  const visibleLabels = new Set<string>();

  if (!Array.isArray(raw)) {
    errors.push({ file: FORMATOS_FILE, path: 'proportions', message: 'El campo "proportions" debe ser un arreglo.' });
    return { proportions: [], knownLabels, visibleLabels };
  }
  if (raw.length === 0) {
    errors.push({ file: FORMATOS_FILE, path: 'proportions', message: 'El catálogo de proporciones no puede estar vacío.' });
  }

  const result: Proportion[] = [];

  raw.forEach((rawProportion, index) => {
    const path = `proportions[${index}]`;
    if (!isPlainObject(rawProportion)) {
      errors.push({ file: FORMATOS_FILE, path, message: 'Cada proporción debe ser un objeto.' });
      return;
    }

    const { label, ratio, description } = rawProportion;
    let valid = true;

    if (!isCleanIdentifier(label)) {
      errors.push({ file: FORMATOS_FILE, path: `${path}.label`, message: 'La etiqueta de la proporción debe ser un texto no vacío, sin espacios al inicio o al final.' });
      valid = false;
    } else if (knownLabels.has(label)) {
      errors.push({ file: FORMATOS_FILE, path: `${path}.label`, message: `La etiqueta de proporción "${label}" está duplicada.` });
      valid = false;
    }

    if (!isNonEmptyString(description)) {
      errors.push({ file: FORMATOS_FILE, path: `${path}.description`, message: 'La descripción de la proporción debe ser un texto no vacío.' });
      valid = false;
    }

    if (!Array.isArray(ratio) || ratio.length !== 2) {
      errors.push({ file: FORMATOS_FILE, path: `${path}.ratio`, message: 'La proporción "ratio" debe ser un arreglo de exactamente dos números.' });
      valid = false;
    } else {
      const [rw, rh] = ratio;
      if (!isFiniteNumber(rw) || rw <= 0) {
        errors.push({ file: FORMATOS_FILE, path: `${path}.ratio[0]`, message: 'El primer valor de "ratio" debe ser un número finito mayor que cero.' });
        valid = false;
      }
      if (!isFiniteNumber(rh) || rh <= 0) {
        errors.push({ file: FORMATOS_FILE, path: `${path}.ratio[1]`, message: 'El segundo valor de "ratio" debe ser un número finito mayor que cero.' });
        valid = false;
      }
    }

    if (isCleanIdentifier(label)) {
      knownLabels.add(label);
      if (index < VISIBLE_PROPORTIONS_COUNT) {
        visibleLabels.add(label);
      }
    }

    if (valid && isCleanIdentifier(label) && isNonEmptyString(description)
      && Array.isArray(ratio) && ratio.length === 2
      && isFiniteNumber(ratio[0]) && isFiniteNumber(ratio[1])) {
      result.push({ label, description, ratio: [ratio[0], ratio[1]] });
    }
  });

  return { proportions: result, knownLabels, visibleLabels };
}

function validateDefaults(raw: unknown, errors: ConfigError[]): CatalogDefaults | undefined {
  if (!isPlainObject(raw)) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults', message: 'El campo "defaults" debe ser un objeto.' });
    return undefined;
  }

  const {
    substrateId, grammage, sheetSizeId, pageWidth_mm, proportionId, bleed_mm, totalPages, pressId,
  } = raw;
  let valid = true;

  if (!isCleanIdentifier(substrateId)) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.substrateId', message: 'El sustrato por defecto debe ser un texto no vacío, sin espacios al inicio o al final.' });
    valid = false;
  }
  if (!isFiniteNumber(grammage) || grammage <= 0) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.grammage', message: 'El gramaje por defecto debe ser un número finito mayor que cero.' });
    valid = false;
  }
  if (!isCleanIdentifier(sheetSizeId)) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.sheetSizeId', message: 'El pliego por defecto debe ser un texto no vacío, sin espacios al inicio o al final.' });
    valid = false;
  }
  if (!isFiniteNumber(pageWidth_mm) || pageWidth_mm <= 0) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.pageWidth_mm', message: 'El ancho de página por defecto debe ser un número finito mayor que cero.' });
    valid = false;
  }
  if (!isCleanIdentifier(proportionId)) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.proportionId', message: 'La proporción por defecto debe ser un texto no vacío, sin espacios al inicio o al final.' });
    valid = false;
  }
  if (!isFiniteNumber(bleed_mm) || bleed_mm < 0) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.bleed_mm', message: 'El sangrado por defecto debe ser un número finito no negativo.' });
    valid = false;
  }
  if (!isPositiveSafeInteger(totalPages)) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.totalPages', message: 'El número de páginas por defecto debe ser un entero seguro mayor que cero.' });
    valid = false;
  }
  if (!isCleanIdentifier(pressId)) {
    errors.push({ file: FORMATOS_FILE, path: 'defaults.pressId', message: 'La prensa por defecto debe ser un texto no vacío, sin espacios al inicio o al final.' });
    valid = false;
  }

  if (!valid || !isCleanIdentifier(substrateId) || !isFiniteNumber(grammage)
    || !isCleanIdentifier(sheetSizeId) || !isFiniteNumber(pageWidth_mm)
    || !isCleanIdentifier(proportionId) || !isFiniteNumber(bleed_mm)
    || !isPositiveSafeInteger(totalPages) || !isCleanIdentifier(pressId)) {
    return undefined;
  }

  return { substrateId, grammage, sheetSizeId, pageWidth_mm, proportionId, bleed_mm, totalPages, pressId };
}

/**
 * Cross-check that every id referenced by `defaults` exists in its catalog.
 * Existence is checked against ids/grammages seen well-formed while parsing,
 * not against the (possibly filtered) clean result arrays, so an unrelated
 * problem elsewhere on the referenced entry doesn't produce a false
 * "no existe" error on top of its real one. Checks that need a file which
 * failed to load are skipped, since that failure already has its own error.
 */
function validateDefaultsReferences(
  defaults: CatalogDefaults,
  visibleProportionLabels: Set<string>,
  knownSubstrateIds: Set<string>,
  knownGrammagesById: Map<string, Set<number>>,
  knownSheetIds: Set<string>,
  knownProportionLabels: Set<string>,
  knownPressIds: Set<string>,
  substratesAvailable: boolean,
  sheetSizesAvailable: boolean,
  pressesAvailable: boolean,
  errors: ConfigError[]
): void {
  if (substratesAvailable) {
    if (!knownSubstrateIds.has(defaults.substrateId)) {
      errors.push({
        file: FORMATOS_FILE,
        path: 'defaults.substrateId',
        message: `El sustrato por defecto "${defaults.substrateId}" no existe en sustratos.json.`,
      });
    } else {
      const grammages = knownGrammagesById.get(defaults.substrateId);
      if (!grammages || !grammages.has(defaults.grammage)) {
        errors.push({
          file: FORMATOS_FILE,
          path: 'defaults.grammage',
          message: `El gramaje por defecto ${defaults.grammage} no existe para el sustrato "${defaults.substrateId}".`,
        });
      }
    }
  }

  if (sheetSizesAvailable && !knownSheetIds.has(defaults.sheetSizeId)) {
    errors.push({
      file: FORMATOS_FILE,
      path: 'defaults.sheetSizeId',
      message: `El pliego por defecto "${defaults.sheetSizeId}" no existe en pliegos.json.`,
    });
  }

  if (!knownProportionLabels.has(defaults.proportionId)) {
    errors.push({
      file: FORMATOS_FILE,
      path: 'defaults.proportionId',
      message: `La proporción por defecto "${defaults.proportionId}" no existe en proportions.`,
    });
  } else {
    if (!visibleProportionLabels.has(defaults.proportionId)) {
      errors.push({
        file: FORMATOS_FILE,
        path: 'defaults.proportionId',
        message: `La proporción por defecto "${defaults.proportionId}" debe estar entre las tres primeras de "proportions": el Canvas Designer solo muestra botones para esas tres.`,
      });
    }
  }

  if (pressesAvailable && !knownPressIds.has(defaults.pressId)) {
    errors.push({
      file: FORMATOS_FILE,
      path: 'defaults.pressId',
      message: `La prensa por defecto "${defaults.pressId}" no existe en maquinas.json.`,
    });
  }
}

/**
 * Validate the five parsed catalog files together and collect every error found,
 * instead of stopping at the first one. A file whose raw value is `undefined`
 * failed to load upstream: pass its name in `unavailableFiles` so its own
 * structural checks are skipped (the loader already reported why) instead of
 * being reported again here. The other files that did load are still fully
 * validated, and only the cross-file reference checks that need a file listed
 * in `unavailableFiles` are skipped. A file that is missing from `input`
 * without being listed in `unavailableFiles` is a real validation error: this
 * function never returns `ok: true` for an incomplete `input` on its own.
 */
export function validateCatalog(
  input: CatalogFiles,
  unavailableFiles: ReadonlySet<CatalogFileName> = new Set()
): ValidateCatalogResult {
  const errors: ConfigError[] = [];

  const substratesAvailable = !unavailableFiles.has(SUSTRATOS_FILE);
  const sheetSizesAvailable = !unavailableFiles.has(PLIEGOS_FILE);
  const pressesAvailable = !unavailableFiles.has(MAQUINAS_FILE);
  const foldingSchemesAvailable = !unavailableFiles.has(ESQUEMAS_FILE);
  const formatosAvailable = !unavailableFiles.has(FORMATOS_FILE);

  const sustratos = validateSustratos(input[SUSTRATOS_FILE], substratesAvailable, errors);
  const pliegos = validatePliegos(input[PLIEGOS_FILE], sheetSizesAvailable, errors);
  const maquinas = validatePresses(input[MAQUINAS_FILE], pressesAvailable, errors);
  const esquemas = validateFoldingSchemes(input[ESQUEMAS_FILE], foldingSchemesAvailable, errors);

  let proportionsResult: ProportionsValidation = { proportions: [], knownLabels: new Set(), visibleLabels: new Set() };
  let defaults: CatalogDefaults | undefined;
  const formatosRaw = input[FORMATOS_FILE];
  if (formatosAvailable) {
    if (!isPlainObject(formatosRaw)) {
      errors.push({ file: FORMATOS_FILE, path: '', message: 'El archivo debe contener un objeto JSON.' });
    } else {
      proportionsResult = validateProportions(formatosRaw.proportions, errors);
      defaults = validateDefaults(formatosRaw.defaults, errors);
    }
  }

  if (defaults) {
    validateDefaultsReferences(
      defaults,
      proportionsResult.visibleLabels,
      sustratos.knownIds,
      sustratos.knownGrammagesById,
      pliegos.knownIds,
      proportionsResult.knownLabels,
      maquinas.knownIds,
      substratesAvailable,
      sheetSizesAvailable,
      pressesAvailable,
      errors
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // No errors were reported, so every parsed value above is guaranteed complete.
  return {
    ok: true,
    catalog: {
      substrates: sustratos.substrates,
      substratesSource: sustratos.source as string,
      sheetSizes: pliegos.sheetSizes,
      sheetSizesSource: pliegos.source as string,
      presses: maquinas.presses,
      pressesSource: maquinas.source as string,
      foldingSchemes: esquemas.foldingSchemes,
      foldingSchemesSource: esquemas.source as string,
      proportions: proportionsResult.proportions,
      defaults: defaults as CatalogDefaults,
    },
  };
}
