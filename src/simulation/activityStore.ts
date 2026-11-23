// ActivityStore — Phase 8.1 (feed aktivitas). Mengikuti pola TaskStore /
// MeetingStore (Phase 4/5): state dalam memori + localStorage (selalu),
// subscribe untuk React. TIDAK ada sync Supabase — tabel activity belum
// ada; dicatat sebagai backlog di docs/PHASES.md.
//
// Yang dicatat HANYA kejadian bermakna yang dipicu pengguna/sistem:
// tugas dibuat/ditugaskan/selesai, meeting dimulai/diakhiri, acara
// dimulai/diakhiri (termasuk berakhir otomatis), objek builder
// ditempatkan/dihapus. Perubahan status ambient (agent berjalan,
// berpikir, meeting spontan) SENGAJA tidak dicatat — status berubah
// tiap detik dan feed akan banjir (pelajaran dari noise meeting
// ambient 6.2).

import type { LiveAgentState } from '../types/agent';

export interface ActivityEntry {
  id: string;
  /** Epoch ms (waktu nyata saat kejadian) — ditampilkan sebagai jam WIB. */
  time: number;
  text: string;
}

/** Maksimal entri yang disimpan; yang lebih lama dibuang (terbaru di atas). */
export const MAX_ACTIVITY_ENTRIES = 50;

const STORAGE_KEY = 'living-world-activity-v1';

// Penambah urutan supaya dua entri dalam milidetik yang sama tidak
// bertabrakan id-nya (pola flaky Date.now() yang dikenal sejak 6.1).
let seq = 0;

export class ActivityStore {
  private entries: ActivityEntry[] = [];
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.loadLocal();
  }

  /** Entri terbaru dulu (index 0 = kejadian paling baru). */
  getEntries(): ActivityEntry[] {
    return this.entries;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  add(text: string): ActivityEntry {
    const entry: ActivityEntry = {
      id: `act-${Date.now().toString(36)}-${seq++}`,
      time: Date.now(),
      text,
    };
    this.entries = [entry, ...this.entries].slice(0, MAX_ACTIVITY_ENTRIES);
    this.emit();
    return entry;
  }

  clear(): void {
    this.entries = [];
    this.emit();
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this.entries = parsed
            .filter(
              (e): e is ActivityEntry =>
                typeof e === 'object' &&
                e !== null &&
                typeof (e as ActivityEntry).id === 'string' &&
                typeof (e as ActivityEntry).time === 'number' &&
                typeof (e as ActivityEntry).text === 'string',
            )
            .slice(0, MAX_ACTIVITY_ENTRIES);
          return;
        }
      }
    } catch {
      // localStorage rusak / tidak tersedia — mulai kosong.
    }
    this.entries = [];
  }

  private emit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Penyimpanan lokal penuh / diblokir — state memori tetap jalan.
    }
    this.listeners.forEach((fn) => fn());
  }
}

/**
 * Hitungan header 8.1 — "aktif" = agent yang statusnya BUKAN idle
 * (bekerja, meeting, berpindah, berpikir, olahraga, dsb.);
 * "berjalan" = agent yang statusnya moving. Agent tanpa status live
 * (belum ada emisi engine) dihitung menganggur.
 */
export function countAgentActivity(liveStates: LiveAgentState): {
  active: number;
  moving: number;
} {
  let active = 0;
  let moving = 0;
  for (const id of Object.keys(liveStates)) {
    const status = liveStates[id]?.status;
    if (!status || status === 'idle') continue;
    active += 1;
    if (status === 'moving') moving += 1;
  }
  return { active, moving };
}
