// Logika murni acara — tanpa efek samping, mudah diuji.
// Validasi mulai acara + posisi berdiri peserta + kedaluwarsa acara.

import type { Agent } from '../types/agent';
import type { CityEvent, EventKind } from '../types/event';
import { EVENT_KINDS } from '../types/event';
import type { Meeting } from '../types/meeting';

/**
 * Validasi mulai acara. Mengembalikan pesan error (Bahasa Indonesia)
 * atau null bila valid. Urutan cek: judul, jumlah peserta, kapasitas
 * lokasi, lokasi sedang dipakai acara lain, peserta sedang meeting,
 * peserta sudah ikut acara lain.
 */
export function validateStartEvent(
  kind: EventKind,
  title: string,
  participantIds: string[],
  events: CityEvent[],
  meetings: Meeting[],
  agents: Agent[],
): string | null {
  const def = EVENT_KINDS[kind];
  if (!title.trim()) return 'Judul acara wajib diisi.';
  if (participantIds.length < 2) return 'Pilih minimal 2 peserta.';
  const capacity = kind === 'match' ? 8 : 10;
  if (participantIds.length > capacity) {
    return `Kapasitas ${def.locationName} hanya ${capacity} orang untuk acara.`;
  }
  const activeEvents = events.filter((e) => e.status === 'active');
  if (activeEvents.some((e) => e.locationId === def.locationId)) {
    return `${def.locationName} sedang dipakai acara lain.`;
  }
  const inMeeting = new Set(
    meetings.filter((m) => m.status === 'active').flatMap((m) => m.participantIds),
  );
  const meetingClash = participantIds.find((id) => inMeeting.has(id));
  if (meetingClash) {
    const name = agents.find((a) => a.id === meetingClash)?.name ?? meetingClash;
    return `${name} sedang mengikuti meeting.`;
  }
  const busy = new Set(activeEvents.flatMap((e) => e.participantIds));
  const clash = participantIds.find((id) => busy.has(id));
  if (clash) {
    const name = agents.find((a) => a.id === clash)?.name ?? clash;
    return `${name} sedang mengikuti acara lain.`;
  }
  return null;
}

/** Jari-jari lingkaran tempat peserta pertandingan berdiri di lapangan. */
export const MATCH_SLOT_RADIUS = 3.5;

/** Jari-jari busur penonton di depan panggung. */
export const SHOW_SLOT_RADIUS = 3;

/**
 * Posisi berdiri peserta acara.
 * - Pertandingan: melingkar di tengah lapangan Arena (25,-12).
 * - Pertunjukan: busur di depan panggung (pusat busur (-25,-6), menghadap
 *   panggung di (-25,-12)) supaya tidak menabrak platform panggung.
 */
export function eventSlotPositions(kind: EventKind, count: number): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  if (kind === 'match') {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (i / Math.max(count, 1)) * Math.PI * 2;
      out.push({
        x: 25 + Math.cos(angle) * MATCH_SLOT_RADIUS,
        z: -12 + Math.sin(angle) * MATCH_SLOT_RADIUS,
      });
    }
    return out;
  }
  for (let i = 0; i < count; i++) {
    // Busur setengah lingkaran menghadap panggung (arah -z).
    const angle = -Math.PI + ((i + 0.5) / Math.max(count, 1)) * Math.PI;
    out.push({
      x: -25 + Math.cos(angle) * SHOW_SLOT_RADIUS,
      z: -6 + Math.sin(angle) * SHOW_SLOT_RADIUS,
    });
  }
  return out;
}

/**
 * Perbaikan 6.1 — masa tenggang kedatangan (detik nyata). Hitung mundur
 * durasi acara dimulai saat SEMUA peserta tiba di slot (gatheredAt);
 * bila ada peserta yang tak kunjung tiba, hitung mundur tetap dimulai
 * setelah masa tenggang ini sejak acara dimulai, supaya acara tidak
 * menggantung selamanya. 90 detik dipilih dari batas atas waktu tempuh:
 * rute BFS terjauh antar simpul ~48 unit (~22 dtk pada 2,2 unit/dtk)
 * ditambah sisa perjalanan yang sedang ditempuh saat acara dimulai
 * (~20 dtk) — total terburuk ~45 dtk, jadi 90 dtk memberi margin 2×.
 * Kecepatan jalan global TIDAK diubah (memengaruhi seluruh simulasi).
 */
export const EVENT_ARRIVAL_GRACE_SECONDS = 90;

/**
 * Waktu berakhir acara (ms epoch).
 * - Bila semua peserta sudah berkumpul: gatheredAt + durasi — peserta
 *   mendapat durasi PENUH untuk beraktivitas, berapa pun lama perjalanannya.
 * - Bila belum berkumpul: startedAt + masa tenggang + durasi.
 * Acara lama (sebelum 6.1) tanpa gatheredAt diperlakukan sebagai belum
 * berkumpul (gatheredAt undefined → null).
 */
export function eventEndMs(event: CityEvent): number {
  const gatheredAt = event.gatheredAt ?? null;
  const baseMs = gatheredAt
    ? new Date(gatheredAt).getTime()
    : new Date(event.startedAt).getTime() + EVENT_ARRIVAL_GRACE_SECONDS * 1000;
  return baseMs + event.durationSeconds * 1000;
}

/** True bila acara aktif sudah melewati durasinya pada `nowMs`. */
export function isEventExpired(event: CityEvent, nowMs: number): boolean {
  if (event.status !== 'active') return false;
  return nowMs >= eventEndMs(event);
}

/**
 * Peserta yang sudah tiba di slot acara: status live-nya sama dengan
 * status acara (sports/entertainment). Status itu hanya didapat lewat
 * beginEvent (tiba di slot) atau aktivitas ambient Arena/Panggung — dan
 * peserta terjadwal tidak bisa mendapat status ambient selama penugasan
 * ada (behavior.ts: depart dengan penugasan tidak menyetel
 * pendingActivity), jadi cocok untuk mendeteksi kedatangan.
 */
export function arrivedParticipantIds(
  event: CityEvent,
  liveStates: Record<string, { status: string }>,
): string[] {
  const def = EVENT_KINDS[event.kind];
  return event.participantIds.filter((id) => liveStates[id]?.status === def.status);
}

/** True bila semua peserta sudah tiba di slot acara. */
export function isEventGathered(
  event: CityEvent,
  liveStates: Record<string, { status: string }>,
): boolean {
  return (
    event.participantIds.length > 0 &&
    arrivedParticipantIds(event, liveStates).length === event.participantIds.length
  );
}
