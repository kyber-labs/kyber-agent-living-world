// MeetingStore — Phase 5. Penyimpanan meeting: state dalam memori +
// localStorage (selalu), mengikuti pola TaskStore (Phase 4). Tidak ada
// sync Supabase di Phase 5 — tabel meeting belum ada; dicatat sebagai
// backlog di docs/PHASES.md. Bila localStorage kosong, diisi satu meeting
// contoh yang sudah selesai (jejak demo, sama seperti seed tugas).

import type { Meeting, NewMeetingInput } from '../types/meeting';

const STORAGE_KEY = 'living-world-meetings-v1';

const nowIso = (): string => new Date().toISOString();

function seedMeetings(): Meeting[] {
  return [
    {
      id: 'meeting-seed-1',
      roomId: 'room-1',
      topic: 'Tinjauan sprint mingguan',
      agenda: 'Progres Phase 4, hambatan, rencana Phase 5.',
      participantIds: ['aria', 'kai', 'luna'],
      status: 'ended',
      startedAt: '2026-11-22T02:00:00.000Z',
      endedAt: '2026-11-22T02:45:00.000Z',
      notes: [
        {
          id: 'note-seed-1',
          authorId: 'aria',
          text: 'Keputusan: model Gemini dipakai untuk AI Engine Phase 4.',
          createdAt: '2026-11-22T02:20:00.000Z',
        },
        {
          id: 'note-seed-2',
          authorId: 'kai',
          text: 'Bug sinkronisasi minimap diperbaiki — perlu uji live.',
          createdAt: '2026-11-22T02:35:00.000Z',
        },
      ],
    },
  ];
}

export class MeetingStore {
  private meetings: Meeting[] = [];
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.loadLocal();
  }

  getMeetings(): Meeting[] {
    return this.meetings;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  startMeeting(input: NewMeetingInput): Meeting {
    const meeting: Meeting = {
      id: `meeting-${Date.now().toString(36)}`,
      ...input,
      status: 'active',
      startedAt: nowIso(),
      endedAt: null,
      notes: [],
    };
    this.meetings = [...this.meetings, meeting];
    this.emit();
    return meeting;
  }

  endMeeting(id: string): void {
    this.meetings = this.meetings.map((m) =>
      m.id === id && m.status === 'active' ? { ...m, status: 'ended', endedAt: nowIso() } : m,
    );
    this.emit();
  }

  addNote(meetingId: string, authorId: string | null, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.meetings = this.meetings.map((m) =>
      m.id === meetingId
        ? {
            ...m,
            notes: [
              ...m.notes,
              {
                id: `note-${Date.now().toString(36)}`,
                authorId,
                text: trimmed,
                createdAt: nowIso(),
              },
            ],
          }
        : m,
    );
    this.emit();
  }

  deleteMeeting(id: string): void {
    this.meetings = this.meetings.filter((m) => m.id !== id);
    this.emit();
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Meeting[];
        if (Array.isArray(parsed)) {
          this.meetings = parsed;
          return;
        }
      }
    } catch {
      // localStorage rusak / tidak tersedia — pakai seed.
    }
    this.meetings = seedMeetings();
  }

  private emit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.meetings));
    } catch {
      // Penyimpanan lokal penuh / diblokir — state memori tetap jalan.
    }
    this.listeners.forEach((fn) => fn());
  }
}
