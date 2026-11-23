// Logika murni world builder — tanpa efek samping, mudah diuji.
// Validasi penempatan objek + arah hadap awal (bangku menghadap plaza).

import type { BuildingFootprint } from '../world/buildings/city';
import type { WorldObject, WorldObjectKind } from '../types/worldObject';

/** Batas tanah kota (radius 45, objek dijaga di dalam ±40). */
export const BUILDER_BOUNDS = 40;

/** Jarak minimum antar objek (meter) supaya tidak bertumpuk. */
export const MIN_OBJECT_GAP = 1.5;

/** Margin di sekeliling bangunan — objek tidak boleh menempel dinding. */
export const BUILDING_MARGIN = 1;

/**
 * Validasi penempatan objek di (x, z). Mengembalikan pesan error
 * (Bahasa Indonesia) atau null bila valid. `ignoreId` dipakai saat
 * memindah objek (objek itu sendiri tidak dihitung sebagai tetangga).
 */
export function validatePlacement(
  x: number,
  z: number,
  objects: WorldObject[],
  buildings: BuildingFootprint[],
  ignoreId?: string,
): string | null {
  if (Math.abs(x) > BUILDER_BOUNDS || Math.abs(z) > BUILDER_BOUNDS) {
    return 'Di luar batas kota (maks ±40).';
  }
  for (const b of buildings) {
    const halfW = b.w / 2 + BUILDING_MARGIN;
    const halfD = b.d / 2 + BUILDING_MARGIN;
    if (Math.abs(x - b.x) < halfW && Math.abs(z - b.z) < halfD) {
      return `Terlalu dekat dengan ${b.name}.`;
    }
  }
  for (const o of objects) {
    if (o.id === ignoreId) continue;
    if (Math.hypot(o.x - x, o.z - z) < MIN_OBJECT_GAP) {
      return 'Terlalu dekat dengan objek lain.';
    }
  }
  return null;
}

/** Arah hadap awal: bangku menghadap pusat plaza, sisanya 0. */
export function defaultRotation(kind: WorldObjectKind, x: number, z: number): number {
  if (kind === 'bench') return Math.atan2(-x, -z);
  return 0;
}
