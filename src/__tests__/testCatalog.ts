import sustratosRaw from '../../public/config/sustratos.json?raw';
import pliegosRaw from '../../public/config/pliegos.json?raw';
import maquinasRaw from '../../public/config/maquinas.json?raw';
import esquemasRaw from '../../public/config/esquemas.json?raw';
import encuadernacionesRaw from '../../public/config/encuadernaciones.json?raw';
import formatosRaw from '../../public/config/formatos.json?raw';
import { validateCatalog } from '../config/validateCatalog';
import type { Catalog } from '../types';

/**
 * Load and validate the real shipped `public/config/*.json` files.
 * Used by tests that need the actual runtime catalog instead of a stub.
 */
export function loadShippedCatalog(): Catalog {
  const result = validateCatalog({
    'sustratos.json': JSON.parse(sustratosRaw),
    'pliegos.json': JSON.parse(pliegosRaw),
    'maquinas.json': JSON.parse(maquinasRaw),
    'esquemas.json': JSON.parse(esquemasRaw),
    'encuadernaciones.json': JSON.parse(encuadernacionesRaw),
    'formatos.json': JSON.parse(formatosRaw),
  });

  if (!result.ok) {
    throw new Error(`El catálogo de configuración de ejemplo es inválido: ${JSON.stringify(result.errors)}`);
  }

  return result.catalog;
}
