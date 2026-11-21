// Simulation engine — jam dunia (Phase 1).
// Hanya mengukur waktu berjalan sejak dunia dibuat; dipakai engine 3D untuk
// animasi (mis. gerakan idle penanda agent). Siklus siang/malam, jadwal harian,
// dan kebutuhan agent (energi/fokus/mood) adalah Phase 5 (life simulation).

export class WorldClock {
  private readonly start = performance.now();

  /** Detik sejak dunia dibuat. */
  elapsed(): number {
    return (performance.now() - this.start) / 1000;
  }
}

export function createWorldClock(): WorldClock {
  return new WorldClock();
}
