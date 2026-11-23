// Tata letak label nama agent — 8.3.1.
// Dua masalah live: (1) label membesar memenuhi layar saat kamera dekat
// (mode Ikuti Agent / Orang Pertama); (2) label bertumpuk saat agent
// bergerombol (dikenal sejak 3.2). Keduanya diatasi di sini dengan fungsi
// murni yang bisa diuji — penerapannya tiap frame ada di
// world/engine/createWorld.ts (loop animasi) + AgentCharacter.setLabelLayout.

/** Ukuran dasar label (sama seperti Phase 3: sprite 2,2 × 0,83 di y 2,05). */
export const LABEL_BASE_WIDTH = 2.2;
export const LABEL_BASE_HEIGHT = 0.83;
export const LABEL_BASE_Y = 2.05;

/** Jarak horizontal di bawah ini = satu gerombolan (lebar label penuh). */
export const LABEL_CLUSTER_DISTANCE = 2.2;
/** Langkah vertikal antar label satu gerombolan = tinggi label penuh,
// sehingga label dalam satu gerombolan TIDAK PERNAH saling menutupi
// (menurut proksi jarak dunia; lihat batas di bawah). */
export const LABEL_STACK_STEP = 0.85;

/**
 * Skala label dari jarak kamera (satuan dunia). Di bawah 3,6 unit skala
 * minimum 0,3 (label tetap terbaca, tak memenuhi layar); di atas 12 unit
 * skala penuh 1 (tampilan Overview/Atas/Sinematik tak berubah). Di antara
 * keduanya skala tumbuh sebanding jarak, jadi ukuran TAMPAK label konstan
 * — label di mode Ikuti Agent (~7,8 unit) tampil 0,65×, dan dari jarak
 * sangat dekat (Orang Pertama) 0,3×.
 */
export function labelScaleForDistance(distance: number): number {
  return Math.min(1, Math.max(0.3, distance / 12));
}

/**
 * Offset vertikal label per agent supaya label dalam satu gerombolan tidak
 * bertumpuk. Urutan roster tetap (deterministik, tak berkedip): tiap agent
 * mengambil tingkat terendah yang belum dipakai agent SEBELUMNYA yang
 * berada dalam jarak gerombolan (pewarnaan graf greedy). Dua agent yang
 * berdekatan selalu beda tingkat ≥ satu tinggi label; agent yang jauh
 * boleh memakai tingkat yang sama (labelnya memang tak bersinggungan).
 *
 * Batas jujur: proksi memakai jarak dunia horizontal, bukan proyeksi layar
 * — dari sudut tertentu dua agent yang berjarak > 2,2 unit di dunia bisa
 * saja labelnya bersinggungan di layar (mis. segaris dengan kamera), dan
 * sebaliknya. Dalam kerumunan sangat padat (≥ 4 agent dalam 2,2 unit)
 * tumpukan teratas melayang cukup tinggi di atas kelompoknya.
 */
export function computeLabelOffsets(positions: Array<{ x: number; z: number }>): number[] {
  const offsets = new Array<number>(positions.length).fill(0);
  for (let i = 0; i < positions.length; i++) {
    const used = new Set<number>();
    for (let j = 0; j < i; j++) {
      const dx = positions[i].x - positions[j].x;
      const dz = positions[i].z - positions[j].z;
      if (Math.hypot(dx, dz) < LABEL_CLUSTER_DISTANCE) used.add(offsets[j]);
    }
    let level = 0;
    while (used.has(level * LABEL_STACK_STEP)) level++;
    offsets[i] = level * LABEL_STACK_STEP;
  }
  return offsets;
}
