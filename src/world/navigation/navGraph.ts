// Graf navigasi — MASTER PROMPT §3 + §8 (navigasi agent).
// Phase 3: simpul di plaza, jalan, dan depan tiap kawasan; sisi antar simpul
// yang jalurnya lurus dan tidak menembus bangunan. Pathfinding BFS tanpa
// bobot (graf kecil, ~11 simpul). Agent berjalan menyusuri simpul, bukan
// memotong lurus lewat gedung/rumah.

export interface NavNode {
  id: string;
  /** Nama kawasan untuk UI (panel detail). */
  name: string;
  x: number;
  z: number;
}

export const NAV_NODES: NavNode[] = [
  { id: 'plaza', name: 'Plaza', x: 0, z: 0 },
  { id: 'roadN', name: 'Jalan Utara', x: 0, z: 12 },
  { id: 'roadS', name: 'Jalan Selatan', x: 0, z: -12 },
  { id: 'roadE', name: 'Jalan Timur', x: 12, z: 0 },
  { id: 'roadW', name: 'Jalan Barat', x: -12, z: 0 },
  { id: 'office', name: 'Gedung Kantor', x: 0, z: -15 },
  { id: 'arena', name: 'Arena Olahraga', x: 15, z: -12 },
  { id: 'stage', name: 'Panggung Hiburan', x: -15, z: -12 },
  { id: 'park', name: 'Taman', x: -23, z: 13 },
  { id: 'resE', name: 'Perumahan Timur', x: 6, z: 22 },
  { id: 'resW', name: 'Perumahan Barat', x: -6, z: 22 },
  // Phase 8.2: simpul tempat-tempat baru. Tiap sisi di bawah diperiksa
  // tidak menembus gedung (lihat scripts/phase82-test.ts): 'mosque'
  // dicapai dari resW (melewati celah antar baris rumah), 'school' dari
  // stage (melewati timur panggung), 'clinic'/'tower' lewat 'roadNE'
  // (simpul persimpangan baru), 'shop'/'market'/'playground' lewat
  // koridor z=30 di selatan baris rumah, 'pool' dari roadE.
  { id: 'mosque', name: 'Masjid', x: -36, z: 26 },
  { id: 'school', name: 'Sekolah', x: -24, z: -26 },
  { id: 'roadNE', name: 'Jalan Timur Laut', x: 12, z: -12 },
  { id: 'clinic', name: 'Klinik', x: 20, z: -26 },
  { id: 'tower', name: 'Menara Kaca', x: 36, z: -26 },
  { id: 'shop', name: 'Toko', x: 6, z: 30 },
  { id: 'market', name: 'Lapak Pasar', x: -14, z: 30 },
  { id: 'playground', name: 'Taman Bermain', x: 20, z: 30 },
  { id: 'pool', name: 'Kolam Renang', x: 26, z: 12 },
];

const EDGES: [string, string][] = [
  ['plaza', 'roadN'],
  ['plaza', 'roadS'],
  ['plaza', 'roadE'],
  ['plaza', 'roadW'],
  ['roadS', 'office'],
  ['roadS', 'arena'],
  ['roadS', 'stage'],
  ['roadE', 'arena'],
  ['roadW', 'stage'],
  ['roadW', 'park'],
  ['roadN', 'resE'],
  ['roadN', 'resW'],
  // Phase 8.2: sisi ke tempat-tempat baru (lihat komentar simpul di atas).
  ['resW', 'mosque'],
  ['stage', 'school'],
  ['roadS', 'roadNE'],
  ['roadNE', 'clinic'],
  ['clinic', 'tower'],
  ['resE', 'shop'],
  ['shop', 'market'],
  ['shop', 'playground'],
  ['roadE', 'pool'],
];

const ADJACENCY = new Map<string, string[]>();
NAV_NODES.forEach((n) => ADJACENCY.set(n.id, []));
EDGES.forEach(([a, b]) => {
  ADJACENCY.get(a)?.push(b);
  ADJACENCY.get(b)?.push(a);
});

export function getNode(id: string): NavNode | undefined {
  return NAV_NODES.find((n) => n.id === id);
}

export function nearestNode(x: number, z: number): NavNode {
  let best = NAV_NODES[0];
  let bestD = Infinity;
  NAV_NODES.forEach((n) => {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  });
  return best;
}

/** Rute simpul dari `from` ke `to` (BFS). Termasuk simpul awal dan akhir. */
export function findPath(from: string, to: string): string[] {
  if (from === to) return [from];
  const prev = new Map<string, string>();
  const queue: string[] = [from];
  const seen = new Set<string>([from]);
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const next of ADJACENCY.get(cur) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, cur);
      if (next === to) {
        const path: string[] = [to];
        let node = to;
        while (node !== from) {
          node = prev.get(node) as string;
          path.unshift(node);
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [from, to];
}
