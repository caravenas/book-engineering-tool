import type { ConfigError, ValidateCatalogResult } from './validateCatalog';
import { validateCatalog } from './validateCatalog';

const FILE_NAMES = ['sustratos.json', 'pliegos.json', 'maquinas.json', 'esquemas.json', 'encuadernaciones.json', 'tapas.json', 'formatos.json'] as const;
type FileName = typeof FILE_NAMES[number];

type FetchLike = typeof fetch;

const DEFAULT_TIMEOUT_MS = 10000;

type FetchOutcome =
  | { file: FileName; value: unknown }
  | { file: FileName; error: ConfigError };

function networkError(file: FileName): ConfigError {
  return {
    file,
    path: '',
    message: 'No se pudo obtener el archivo por un fallo de red. Revisa tu conexión e inténtalo de nuevo.',
  };
}

function timeoutError(file: FileName, timeoutMs: number): ConfigError {
  return {
    file,
    path: '',
    message: `El servidor no respondió en ${timeoutMs / 1000} s.`,
  };
}

function isTimeoutSignal(signal: AbortSignal): boolean {
  const reason = signal.reason as { name?: string } | undefined;
  return signal.aborted && reason?.name === 'TimeoutError';
}

async function fetchCatalogFile(file: FileName, fetchImpl: FetchLike, timeoutMs: number): Promise<FetchOutcome> {
  const signal = AbortSignal.timeout(timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${import.meta.env.BASE_URL}config/${file}`, {
      cache: 'no-cache',
      signal,
    });
  } catch (error) {
    return { file, error: isTimeoutSignal(signal) ? timeoutError(file, timeoutMs) : networkError(file) };
  }

  if (!response.ok) {
    return {
      file,
      error: { file, path: '', message: `No se pudo cargar el archivo (código de estado ${response.status}).` },
    };
  }

  // Static hosts and `vite preview` often answer a missing file with a 200
  // HTML fallback page (the SPA shell) instead of a real 404, which would
  // otherwise be misreported as invalid JSON.
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('text/html')) {
    return {
      file,
      error: { file, path: '', message: 'No se encontró el archivo: el servidor devolvió una página HTML en lugar de JSON.' },
    };
  }

  try {
    const value = await response.json();
    return { file, value };
  } catch {
    // A timeout that fires while the body is still being read surfaces here
    // as a parse failure; report it as a timeout instead of invalid JSON.
    return {
      file,
      error: isTimeoutSignal(signal)
        ? timeoutError(file, timeoutMs)
        : { file, path: '', message: 'El archivo no contiene JSON válido.' },
    };
  }
}

/**
 * Load the three runtime config files in parallel and validate them.
 * Every fetch/parse failure becomes a ConfigError for that file, but the
 * other files that did load are still fully validated (a missing file only
 * skips the specific cross-file checks that need its data), so unrelated
 * problems are reported together instead of being hidden behind the first
 * failure.
 */
export async function loadCatalog(fetchImpl: FetchLike = fetch, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<ValidateCatalogResult> {
  const outcomes = await Promise.all(FILE_NAMES.map(file => fetchCatalogFile(file, fetchImpl, timeoutMs)));

  const errors: ConfigError[] = [];
  const values: Partial<Record<FileName, unknown>> = {};
  const unavailableFiles = new Set<FileName>();

  for (const outcome of outcomes) {
    if ('error' in outcome) {
      errors.push(outcome.error);
      unavailableFiles.add(outcome.file);
    } else {
      values[outcome.file] = outcome.value;
    }
  }

  const result = validateCatalog({
    'sustratos.json': values['sustratos.json'],
    'pliegos.json': values['pliegos.json'],
    'maquinas.json': values['maquinas.json'],
    'esquemas.json': values['esquemas.json'],
    'encuadernaciones.json': values['encuadernaciones.json'],
    'tapas.json': values['tapas.json'],
    'formatos.json': values['formatos.json'],
  }, unavailableFiles);

  if (result.ok) {
    return errors.length > 0 ? { ok: false, errors } : result;
  }

  return { ok: false, errors: [...errors, ...result.errors] };
}
