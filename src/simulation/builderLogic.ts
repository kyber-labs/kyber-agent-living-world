// Logika murni world builder — tanpa efek samping, mudah diuji.
// Validasi penempatan objek + arah hadap awal (bangku menghadap plaza).
//
// Phase 8.3: validasi memakai FOOTPRINT persegi tiap jenis (bukan titik)
// — ukuran dari WORLD_OBJECT_CATALOG. Footprint gedung TETAP 8.2
// (district.ts) ikut menjadi penghalang dengan margin 1 yang sama.
// Bebek hanya boleh di dalam kolam 8.2. `kind` tetap opsional supaya
// panggilan lama (uji Phase 6, tanpa jenis) berperilaku seperti dulu:
// kandidat diperlakukan sebagai titik.

import type { BuildingFootprint } from '../world/buildings/city';
import { NEW_BUILDINGS } from '../world/buildings/district';
import type { WorldObject, WorldObjectKind } from '../types/worldObject';
import { WORLD_OBJECT_CATALOG } from '../types/worldObject';

/** Batas tanah kota (radius 45, objek dijaga di dalam ±40). */
export const BUILDER_BOUNDS = 40;

/** Jarak minimum antar objek (meter, diukur tepi-ke-tepi) supaya tidak bertumpuk. */
export const MIN_OBJECT_GAP = 1.5;

/** Margin di sekeliling bangunan — objek tidak boleh menempel dinding. */
export const BUILDING_MARGIN = 1;

/** Bebek harus berada di dalam kolam dengan inset ini dari tepi air. */
export const DUCK_POOL_INSET = 0.6;

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function rectOf(b: { x: number; z: number; w: number; d: number }): Rect {
  return { x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 };
}

function expand(r: Rect, m: number): Rect {
  return { x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

function pointInRect(x: number, z: number, r: Rect): boolean {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

/** Ukuran footprint (lebar, dalam) tiap jenis; tanpa jenis = titik (0, 0). */
export function getKindSize(kind?: WorldObjectKind): [number, number] {
  return kind ? WORLD_OBJECT_CATALOG[kind].size : [0, 0];
}

/** Persegi footprint kandidat di (x, z). */
export function objectRect(kind: WorldObjectKind | undefined, x: number, z: number): Rect {
  const [w, d] = getKindSize(kind);
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}

/**
 * Persegi air kolam 8.2 (footprint kolam dari district.ts, dibaca langsung
 * — bukan dihafal) dengan inset supaya bebek tidak menempel tepi.
 * Kolam 8.2: (29, 20), 10×6 → air (24.6–33.4, 17.6–22.4).
 */
export function getPoolRect(): Rect {
  const pool = NEW_BUILDINGS.find((b) => b.id === 'pool');
  if (!pool) return { x0: 0, x1: 0, z0: 0, z1: 0 };
  const r = rectOf(pool);
  return {
    x0: r.x0 + DUCK_POOL_INSET,
    x1: r.x1 - DUCK_POOL_INSET,
    z0: r.z0 + DUCK_POOL_INSET,
    z1: r.z1 - DUCK_POOL_INSET,
  };
}

/**
 * Validasi penempatan objek di (x, z). Mengembalikan pesan error
 * (Bahasa Indonesia) atau null bila valid. `ignoreId` dipakai saat
 * memindah objek (objek itu sendiri tidak dihitung sebagai tetangga).
 * `kind` dipakai untuk ukuran footprint + aturan khusus bebek.
 */
export function validatePlacement(
  x: number,
  z: number,
  objects: WorldObject[],
  buildings: BuildingFootprint[],
  ignoreId?: string,
  kind?: WorldObjectKind,
): string | null {
  const rect = objectRect(kind, x, z);
  if (rect.x0 < -BUILDER_BOUNDS || rect.x1 > BUILDER_BOUNDS || rect.z0 < -BUILDER_BOUNDS || rect.z1 > BUILDER_BOUNDS) {
    return 'Di luar batas kota (maks ±40).';
  }
  // 8.3: bebek HANYA di kolam. Kolam sendiri dikecualikan dari cek gedung
  // di bawah (kalau tidak, bebek di kolam justru ditolak sebagai "di dalam
  // gedung" — footprint kolam adalah penghalang bagi jenis lain).
  if (kind === 'duck') {
    if (!pointInRect(x, z, getPoolRect())) {
      return 'Bebek hanya bisa ditempatkan di kolam.';
    }
  }
  for (const b of buildings) {
    if (kind === 'duck' && b.id === 'pool') continue;
    if (rectsOverlap(rect, expand(rectOf(b), BUILDING_MARGIN))) {
      return `Terlalu dekat dengan ${b.name}.`;
    }
  }
  // Jarak antar objek diukur tepi-ke-tepi: kedua persegi diperluas
  // setengah celah minimum (0,75 + 0,75 = 1,5).
  const gap = MIN_OBJECT_GAP / 2;
  for (const o of objects) {
    if (o.id === ignoreId) continue;
    if (rectsOverlap(expand(rect, gap), expand(objectRect(o.kind, o.x, o.z), gap))) {
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
