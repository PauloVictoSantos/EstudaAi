export const AREAS = { LC: 'Linguagens', CH: 'Humanas', CN: 'Natureza', MT: 'Matemática', GERAL: 'Geral' } as const;
export type Area = keyof typeof AREAS;
export const ENEM_AREAS: Area[] = ['LC', 'CH', 'CN', 'MT'];
export const AREA_HUE: Record<Area, number> = { LC: 250, CH: 60, CN: 150, MT: 25, GERAL: 300 };
export const areaColor = (a: Area) => `oklch(0.6 0.16 ${AREA_HUE[a] ?? 300})`;
