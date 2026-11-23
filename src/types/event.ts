// Tipe acara olahraga & hiburan — MASTER PROMPT §7 (olahraga & hiburan),
// Phase 6. Acara = kegiatan kelompok terjadwal di Arena (pertandingan)
// atau Panggung (pertunjukan): peserta berkumpul di lokasi selama durasi
// tertentu, lalu bubar. Status 'active' = sedang berlangsung;
// 'ended' = riwayat. Mirip meeting (Phase 5) tapi lokasinya Arena/Panggung
// dan status agent-nya 'sports' / 'entertainment', bukan 'meeting'.

import type { AgentStatus } from './agent';

export type EventKind = 'match' | 'show';

export interface CityEvent {
  id: string;
  kind: EventKind;
  title: string;
  /** 'arena' = Arena Olahraga, 'stage' = Panggung Hiburan. */
  locationId: 'arena' | 'stage';
  participantIds: string[];
  status: 'active' | 'ended';
  startedAt: string; // ISO
  endedAt: string | null; // ISO
  /** Durasi dalam detik nyata; acara berakhir otomatis bila lewat. */
  durationSeconds: number;
  /**
   * Perbaikan 6.1: saat semua peserta tiba di slot (ISO) atau null bila
   * masih ada yang dalam perjalanan. Hitung mundur durasi dimulai dari
   * sini; bila null, berakhirnya dihitung dari startedAt + masa tenggang
   * (lihat EVENT_ARRIVAL_GRACE_SECONDS di eventLogic).
   */
  gatheredAt: string | null;
}

export interface NewEventInput {
  kind: EventKind;
  title: string;
  participantIds: string[];
  durationSeconds: number;
}

/** Penugasan acara untuk satu agent (dipakai behavior agar berjalan ke lokasi). */
export interface EventAssignment {
  /** 'arena' | 'stage' — juga dipakai sebagai kunci visual ring acara. */
  locationId: 'arena' | 'stage';
  locationName: string;
  /** Simpul graf navigasi terdekat — agent berjalan ke sini via BFS. */
  nodeId: string;
  /** Pusat lokasi acara (tempat peserta berkumpul). */
  x: number;
  z: number;
  /** Posisi berdiri agent di sekitar pusat. */
  slotX: number;
  slotZ: number;
  /** Status agent selama acara berlangsung. */
  status: Extract<AgentStatus, 'sports' | 'entertainment'>;
}

/** Definisi tiap jenis acara: lokasi, simpul jalan, pusat kumpul, status. */
export const EVENT_KINDS: Record<
  EventKind,
  {
    label: string;
    locationId: 'arena' | 'stage';
    locationName: string;
    nodeId: string;
    /** Pusat lokasi (dipakai peserta untuk menghadap). */
    centerX: number;
    centerZ: number;
    status: Extract<AgentStatus, 'sports' | 'entertainment'>;
    color: string;
    defaultTitle: string;
  }
> = {
  match: {
    label: 'Pertandingan persahabatan',
    locationId: 'arena',
    locationName: 'Arena Olahraga',
    nodeId: 'arena',
    centerX: 25,
    centerZ: -12,
    status: 'sports',
    color: '#16a34a',
    defaultTitle: 'Pertandingan persahabatan',
  },
  show: {
    label: 'Pertunjukan',
    locationId: 'stage',
    locationName: 'Panggung Hiburan',
    nodeId: 'stage',
    centerX: -25,
    centerZ: -12,
    status: 'entertainment',
    color: '#db2777',
    defaultTitle: 'Pertunjukan',
  },
};

/** Durasi acara yang bisa dipilih Bos (detik nyata). */
export const EVENT_DURATIONS: { seconds: number; label: string }[] = [
  { seconds: 60, label: '1 menit' },
  { seconds: 180, label: '3 menit' },
  { seconds: 300, label: '5 menit' },
];
