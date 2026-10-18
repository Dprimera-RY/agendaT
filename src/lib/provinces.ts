// Provincias de Cuba + municipio especial Isla de la Juventud
export const CUBA_PROVINCES = [
  'Pinar del Río',
  'Artemisa',
  'La Habana',
  'Mayabeque',
  'Matanzas',
  'Cienfuegos',
  'Villa Clara',
  'Sancti Spíritus',
  'Ciego de Ávila',
  'Camagüey',
  'Las Tunas',
  'Holguín',
  'Granma',
  'Santiago de Cuba',
  'Guantánamo',
  'Isla de la Juventud',
] as const

export type CubaProvince = (typeof CUBA_PROVINCES)[number]

export function isValidProvince(value: unknown): value is CubaProvince {
  return typeof value === 'string' && (CUBA_PROVINCES as readonly string[]).includes(value)
}
