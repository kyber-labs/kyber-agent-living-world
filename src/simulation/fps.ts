// Pelacak FPS murni — Phase 7 (optimasi).
// Tidak bergantung DOM/renderer: diberi deret waktu frame (ms, gaya
// performance.now()), mengembalikan FPS dari rata-rata delta. Dipakai
// createWorld untuk menampilkan FPS nyata di HUD (bukan angka karangan).
// Delta <= 0 (dua push di milidetik yang sama) dan >= 1000 ms (tab
// disembunyikan / jeda panjang) diabaikan supaya tidak merusak rata-rata.

/** Jumlah sampel delta terakhir yang disimpan (~2 detik pada 60 FPS). */
export const FPS_WINDOW = 120;

export class FpsTracker {
  private deltas: number[] = [];
  private lastNow: number | null = null;

  /** Catat satu frame pada waktu nowMs. */
  push(nowMs: number): void {
    if (this.lastNow !== null) {
      const dt = nowMs - this.lastNow;
      if (dt > 0 && dt < 1000) this.deltas.push(dt);
    }
    this.lastNow = nowMs;
    if (this.deltas.length > FPS_WINDOW) {
      this.deltas.splice(0, this.deltas.length - FPS_WINDOW);
    }
  }

  /** FPS dari rata-rata delta dalam jendela; 0 bila belum ada sampel. */
  getFps(): number {
    return averageFps(this.deltas);
  }

  /** Jumlah sampel delta yang sedang disimpan. */
  get sampleCount(): number {
    return this.deltas.length;
  }
}

/** FPS dari daftar delta (ms): 1000 / rata-rata delta, dibulatkan. 0 bila kosong. */
export function averageFps(deltas: number[]): number {
  const valid = deltas.filter((d) => d > 0 && d < 1000);
  if (valid.length === 0) return 0;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return Math.round(1000 / avg);
}
