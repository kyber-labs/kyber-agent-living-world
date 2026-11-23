// Logika murni meeting — tanpa efek samping, mudah diuji.
// Validasi mulai meeting + posisi berdiri peserta di lingkaran room.

import type { Agent } from '../types/agent';
import type { Meeting, MeetingRoom } from '../types/meeting';
import type { CityEvent } from '../types/event';

/**
 * Validasi mulai meeting. Mengembalikan pesan error (Bahasa Indonesia)
 * atau null bila valid. Urutan cek: topik, jumlah peserta, kapasitas,
 * room sedang dipakai, peserta sudah ikut meeting lain, peserta sedang
 * ikut acara (Phase 6 — meeting dan acara saling mengecualikan).
 */
export function validateStartMeeting(
  room: MeetingRoom,
  topic: string,
  participantIds: string[],
  meetings: Meeting[],
  agents: Agent[],
  events: CityEvent[] = [],
): string | null {
  if (!topic.trim()) return 'Topik meeting wajib diisi.';
  if (participantIds.length < 2) return 'Pilih minimal 2 peserta.';
  if (participantIds.length > room.capacity) {
    return `Kapasitas ${room.name} hanya ${room.capacity} orang.`;
  }
  const active = meetings.filter((m) => m.status === 'active');
  if (active.some((m) => m.roomId === room.id)) {
    return `Ruang ${room.name} sedang dipakai meeting lain.`;
  }
  const busy = new Set(active.flatMap((m) => m.participantIds));
  const clash = participantIds.find((id) => busy.has(id));
  if (clash) {
    const name = agents.find((a) => a.id === clash)?.name ?? clash;
    return `${name} sedang mengikuti meeting lain.`;
  }
  const inEvent = new Set(events.filter((e) => e.status === 'active').flatMap((e) => e.participantIds));
  const eventClash = participantIds.find((id) => inEvent.has(id));
  if (eventClash) {
    const name = agents.find((a) => a.id === eventClash)?.name ?? eventClash;
    return `${name} sedang mengikuti acara.`;
  }
  return null;
}

/** Jari-jari lingkaran tempat peserta berdiri di sekeliling pusat room. */
export const MEETING_SLOT_RADIUS = 1.3;

/**
 * Posisi berdiri peserta: melingkar di sekeliling pusat room, mulai dari
 * arah utara (atas) supaya tidak menabrak bangku taman di sisi barat.
 */
export function roomSlotPositions(room: MeetingRoom, count: number): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i / Math.max(count, 1)) * Math.PI * 2;
    out.push({
      x: room.x + Math.cos(angle) * MEETING_SLOT_RADIUS,
      z: room.z + Math.sin(angle) * MEETING_SLOT_RADIUS,
    });
  }
  return out;
}
