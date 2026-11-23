// Tipe meeting room + kolaborasi — MASTER PROMPT §7 (meeting room),
// Phase 5. Meeting punya room, topik/agenda, peserta, waktu mulai/selesai,
// dan catatan bersama (whiteboard). Status 'active' = sedang berlangsung
// (peserta berkumpul di room, status 'meeting'); 'ended' = riwayat.

export interface MeetingRoom {
  id: string;
  name: string;
  /** Simpul graf navigasi terdekat — agent berjalan ke sini via BFS. */
  nodeId: string;
  /** Pusat zona room (tempat peserta berkumpul melingkar). */
  x: number;
  z: number;
  capacity: number;
  color: string;
}

/** 6 ruang meeting — dipetakan ke kawasan kota yang sudah ada (Phase 2). */
export const MEETING_ROOMS: MeetingRoom[] = [
  { id: 'room-1', name: 'Ruang Rapat Utama', nodeId: 'office', x: 0, z: -15, capacity: 10, color: '#6366f1' },
  { id: 'room-2', name: 'Ruang Sprint', nodeId: 'plaza', x: 0, z: 0, capacity: 8, color: '#0ea5e9' },
  { id: 'room-3', name: 'Ruang Desain', nodeId: 'park', x: -23, z: 13, capacity: 6, color: '#ec4899' },
  { id: 'room-4', name: 'Ruang Data', nodeId: 'arena', x: 15, z: -12, capacity: 6, color: '#f59e0b' },
  { id: 'room-5', name: 'Ruang Kreatif', nodeId: 'stage', x: -15, z: -12, capacity: 6, color: '#8b5cf6' },
  { id: 'room-6', name: 'Ruang Santai', nodeId: 'resE', x: 6, z: 22, capacity: 6, color: '#14b8a6' },
];

export function getMeetingRoom(id: string): MeetingRoom | undefined {
  return MEETING_ROOMS.find((r) => r.id === id);
}

export interface MeetingNote {
  id: string;
  /** null = ditulis Bos (pengguna); selain itu id agent penulis. */
  authorId: string | null;
  text: string;
  createdAt: string; // ISO
}

export interface Meeting {
  id: string;
  roomId: string;
  topic: string;
  agenda: string;
  participantIds: string[];
  status: 'active' | 'ended';
  startedAt: string; // ISO
  endedAt: string | null; // ISO
  notes: MeetingNote[];
}

export interface NewMeetingInput {
  roomId: string;
  topic: string;
  agenda: string;
  participantIds: string[];
}

/** Penugasan meeting untuk satu agent (dipakai behavior agar berjalan ke room). */
export interface MeetingAssignment {
  roomId: string;
  roomName: string;
  nodeId: string;
  /** Pusat room. */
  x: number;
  z: number;
  /** Posisi berdiri agent di lingkaran room. */
  slotX: number;
  slotZ: number;
}
