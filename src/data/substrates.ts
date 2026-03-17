import type { Substrate, SheetSize, Proportion } from '../types';

// ─── Proportions ─────────────────────────────────────────────────────────

export const PROPORTIONS: Proportion[] = [
  {
    label: '1:1',
    ratio: [1, 1],
    description: 'Cuadrado perfecto',
  },
  {
    label: '2:3',
    ratio: [2, 3],
    description: 'Proporción clásica editorial',
  },
  {
    label: '3:5 (Áurea)',
    ratio: [3, 5],
    description: 'Proporción áurea aproximada (φ ≈ 1.618)',
  },
  {
    label: '3:4',
    ratio: [3, 4],
    description: 'Formato estándar fotográfico',
  },
  {
    label: '1:√2 (ISO)',
    ratio: [1, 1.4142],
    description: 'Proporción ISO (A4, A3, etc.)',
  },
];

// ─── Press Sheet Sizes ───────────────────────────────────────────────────

export const SHEET_SIZES: SheetSize[] = [
  { id: 'carta',       name: 'Carta (Letter)',       width_mm: 216,  height_mm: 279 },
  { id: 'oficio',      name: 'Oficio (Legal)',        width_mm: 216,  height_mm: 356 },
  { id: 'tabloide',    name: 'Doble Carta (Tabloid)', width_mm: 432,  height_mm: 279 },
  { id: 'pliego_sra3', name: 'SRA3 (320×450mm)',      width_mm: 320,  height_mm: 450 },
  { id: 'pliego_70x100', name: 'Pliego 70×100cm',     width_mm: 700,  height_mm: 1000 },
  { id: 'pliego_77x110', name: 'Pliego 77×110cm',     width_mm: 770,  height_mm: 1100 },
];

// ─── Substrate Library ───────────────────────────────────────────────────
// Datos reales de calibre (grosor por hoja en micras) según gramaje

export const SUBSTRATES: Substrate[] = [
  {
    id: 'bond',
    name: 'Bond',
    type: 'bond',
    description: 'Papel de escritura/impresión estándar. Económico y versátil.',
    options: [
      { grammage: 75,  caliper: 95 },
      { grammage: 90,  caliper: 115 },
      { grammage: 120, caliper: 150 },
    ],
  },
  {
    id: 'couche_matte',
    name: 'Couché Mate',
    type: 'couche_matte',
    description: 'Papel estucado mate. Ideal para fotografía e ilustración sin reflejos.',
    options: [
      { grammage: 90,  caliper: 75 },
      { grammage: 115, caliper: 90 },
      { grammage: 150, caliper: 120 },
      { grammage: 200, caliper: 160 },
      { grammage: 300, caliper: 250 },
    ],
  },
  {
    id: 'couche_gloss',
    name: 'Couché Brillo',
    type: 'couche_gloss',
    description: 'Papel estucado brillante. Colores vibrantes y alto contraste.',
    options: [
      { grammage: 90,  caliper: 70 },
      { grammage: 115, caliper: 85 },
      { grammage: 150, caliper: 110 },
      { grammage: 200, caliper: 150 },
      { grammage: 300, caliper: 240 },
    ],
  },
  {
    id: 'opalina',
    name: 'Opalina',
    type: 'opalina',
    description: 'Papel texturado premium. Tacto suave y elegante.',
    options: [
      { grammage: 120, caliper: 155 },
      { grammage: 180, caliper: 230 },
      { grammage: 225, caliper: 290 },
    ],
  },
  {
    id: 'cardboard_sulfate',
    name: 'Cartulina Sulfato',
    type: 'cardboard_sulfate',
    description: 'Cartulina rígida para tapas duras y carpetas.',
    options: [
      { grammage: 250, caliper: 350 },
      { grammage: 300, caliper: 420 },
      { grammage: 350, caliper: 490 },
    ],
  },
  {
    id: 'cardboard_c1s',
    name: 'Cartulina C1S',
    type: 'cardboard_c1s',
    description: 'Cartulina estucada una cara. Ideal para portadas.',
    options: [
      { grammage: 250, caliper: 330 },
      { grammage: 300, caliper: 400 },
    ],
  },
  {
    id: 'cardboard_c2s',
    name: 'Cartulina C2S',
    type: 'cardboard_c2s',
    description: 'Cartulina estucada dos caras. Impresión de alta calidad ambos lados.',
    options: [
      { grammage: 250, caliper: 310 },
      { grammage: 300, caliper: 380 },
    ],
  },
];
