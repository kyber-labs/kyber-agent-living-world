// Tipe objek world builder — MASTER PROMPT §7 (world builder), Phase 6.
// Objek dunia yang ditempatkan Bos lewat panel Builder: pohon, bangku,
// lampu taman, dan air mancur. Disimpan di localStorage (pola
// TaskStore/MeetingStore) dan dibangun ulang di scene 3D tiap kali berubah.

export type WorldObjectKind = 'tree' | 'bench' | 'lamp' | 'fountain';

export interface WorldObject {
  id: string;
  kind: WorldObjectKind;
  /** Posisi di tanah (meter dunia, batas ±40). */
  x: number;
  z: number;
  /** Arah hadap (radian). Bangku menghadap pusat plaza. */
  rotY: number;
  createdAt: string; // ISO
}

export interface NewWorldObjectInput {
  kind: WorldObjectKind;
  x: number;
  z: number;
}

/** Katalog builder: label + warna untuk UI dan minimap. */
export const WORLD_OBJECT_CATALOG: Record<
  WorldObjectKind,
  { label: string; hint: string; color: string }
> = {
  tree: { label: 'Pohon', hint: 'Pohon rindang dari primitif', color: '#4d7c4d' },
  bench: { label: 'Bangku', hint: 'Bangku taman, menghadap plaza', color: '#8a5a3b' },
  lamp: { label: 'Lampu taman', hint: 'Tiang lampu bercahaya hangat', color: '#f59e0b' },
  fountain: { label: 'Air mancur', hint: 'Kolam bundar + pancuran', color: '#0ea5e9' },
};
