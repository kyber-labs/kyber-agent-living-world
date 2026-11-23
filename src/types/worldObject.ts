// Tipe objek world builder — MASTER PROMPT §7 (world builder), Phase 6.
// Objek dunia yang ditempatkan Bos lewat panel Builder. Disimpan di
// localStorage (pola TaskStore/MeetingStore) dan dibangun ulang di scene
// 3D tiap kali berubah.
//
// Phase 8.3: katalog diperluas 4 → 21 item (ala panel "Mode Bangun"
// screenshot "Kampus Nailong"): gedung, taman bermain, lapak pasar,
// halte, kolam, mobil, taman bunga, meja kafe, dan hewan yang
// berkeliaran/berenang. Tiap jenis punya ukuran footprint (dipakai
// validasi penempatan) dan warna (dipakai minimap).

export type WorldObjectKind =
  | 'tree'
  | 'bench'
  | 'lamp'
  | 'fountain'
  | 'glassTower'
  | 'office'
  | 'shop'
  | 'house'
  | 'school'
  | 'clinic'
  | 'mosque'
  | 'playground'
  | 'market'
  | 'busstop'
  | 'pool'
  | 'car'
  | 'flowerbed'
  | 'cafeTable'
  | 'cat'
  | 'dog'
  | 'duck';

/** Jenis hewan Builder — BUKAN agent (tidak ada di sidebar/chat/tugas). */
export type BuilderAnimalKind = 'cat' | 'dog' | 'duck';

export function isAnimalKind(kind: WorldObjectKind): kind is BuilderAnimalKind {
  return kind === 'cat' || kind === 'dog' || kind === 'duck';
}

export interface WorldObject {
  id: string;
  kind: WorldObjectKind;
  /** Posisi di tanah (meter dunia, batas ±40). */
  x: number;
  z: number;
  /** Arah hadap (radian). Bangku menghadap pusat plaza. */
  rotY: number;
  /** Label opsional dari Bos (8.3) — hanya tampil di panel, bukan label 3D. */
  label?: string;
  createdAt: string; // ISO
}

export interface NewWorldObjectInput {
  kind: WorldObjectKind;
  x: number;
  z: number;
  /** Label opsional (8.3). */
  label?: string;
  /** Putaran awal (radian, 8.3). Bila kosong, dipakai defaultRotation. */
  rotY?: number;
}

/** Katalog builder: label + warna (UI dan minimap) + footprint (validasi). */
export const WORLD_OBJECT_CATALOG: Record<
  WorldObjectKind,
  { label: string; hint: string; color: string; size: [number, number] }
> = {
  tree: { label: 'Pohon', hint: 'Pohon rindang dari primitif', color: '#4d7c4d', size: [1.5, 1.5] },
  bench: { label: 'Bangku', hint: 'Bangku taman, menghadap plaza', color: '#8a5a3b', size: [1.8, 0.7] },
  lamp: { label: 'Lampu taman', hint: 'Tiang lampu bercahaya hangat', color: '#f59e0b', size: [0.5, 0.5] },
  fountain: { label: 'Air mancur', hint: 'Kolam bundar + pancuran', color: '#0ea5e9', size: [3, 3] },
  glassTower: { label: 'Menara kaca', hint: 'Menara tinggi berkaca mengilap', color: '#38bdf8', size: [3.5, 3.5] },
  office: { label: 'Gedung kantor', hint: 'Kantor kecil berjendela', color: '#7d93a8', size: [5, 5] },
  shop: { label: 'Toko', hint: 'Toko dengan awning', color: '#8b5cf6', size: [4, 3.5] },
  house: { label: 'Rumah', hint: 'Rumah dengan atap limas', color: '#e07a5f', size: [4.5, 4] },
  school: { label: 'Sekolah', hint: 'Sekolah dengan tiang bendera', color: '#f59e0b', size: [7, 5] },
  clinic: { label: 'Klinik', hint: 'Klinik dengan salib merah', color: '#ef4444', size: [6, 4.5] },
  mosque: { label: 'Masjid', hint: 'Masjid berkubah hijau', color: '#15803d', size: [6, 5.5] },
  playground: { label: 'Taman bermain', hint: 'Perosotan + ayunan + bak pasir', color: '#ec4899', size: [6, 5] },
  market: { label: 'Lapak pasar', hint: 'Deretan kios warna-warni', color: '#f97316', size: [6, 2.5] },
  busstop: { label: 'Halte bus', hint: 'Shelter + bangku tunggu', color: '#64748b', size: [3.2, 1.8] },
  pool: { label: 'Kolam', hint: 'Kolam air biru', color: '#0ea5e9', size: [6, 4] },
  car: { label: 'Mobil parkir', hint: 'Mobil parkir statis', color: '#2563eb', size: [2.4, 1.3] },
  flowerbed: { label: 'Taman bunga', hint: 'Bedeng + bunga warna-warni', color: '#db2777', size: [2.5, 2.5] },
  cafeTable: { label: 'Meja kafe', hint: 'Meja bundar + dua kursi', color: '#a16207', size: [2.2, 2.2] },
  cat: { label: 'Kucing (berkeliaran)', hint: 'Kucing berkeliaran di sekitar titik ini', color: '#d97706', size: [0.8, 0.8] },
  dog: { label: 'Anjing (berkeliaran)', hint: 'Anjing berkeliaran di sekitar titik ini', color: '#8a5a3b', size: [1, 0.8] },
  duck: { label: 'Bebek (berenang)', hint: 'Bebek berenang — hanya bisa di kolam', color: '#f8fafc', size: [0.6, 0.6] },
};

/** Urutan katalog di panel — sama seperti daftar acuan "Kampus Nailong". */
export const WORLD_OBJECT_KIND_ORDER: WorldObjectKind[] = [
  'tree',
  'lamp',
  'bench',
  'fountain',
  'glassTower',
  'office',
  'shop',
  'house',
  'school',
  'clinic',
  'mosque',
  'playground',
  'market',
  'busstop',
  'pool',
  'car',
  'flowerbed',
  'cafeTable',
  'cat',
  'dog',
  'duck',
];
