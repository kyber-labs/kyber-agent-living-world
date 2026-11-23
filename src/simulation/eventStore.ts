// EventStore — Phase 6. Penyimpanan acara olahraga & hiburan: state
// dalam memori + localStorage (selalu), mengikuti pola MeetingStore
// (Phase 5). Tidak ada sync Supabase — tabel event belum ada; dicatat
// sebagai backlog di docs/PHASES.md. Bila localStorage kosong, diisi satu
// acara contoh yang sudah selesai (jejak demo, sama seperti seed meeting).

import { EVENT_KINDS, type CityEvent, type NewEventInput } from '../types/event';
import { isEventExpired } from './eventLogic';

const STORAGE_KEY = 'living-world-events-v1';

const nowIso = (): string => new Date().toISOString();

function seedEvents(): CityEvent[] {
  return [
    {
      id: 'event-seed-1',
      kind: 'match',
      title: 'Pertandingan persahabatan perdana',
      locationId: 'arena',
      participantIds: ['aria', 'kai', 'leo', 'max'],
      status: 'ended',
      startedAt: '2026-11-22T08:00:00.000Z',
      endedAt: '2026-11-22T08:03:00.000Z',
      durationSeconds: 180,
    },
  ];
}

export class EventStore {
  private events: CityEvent[] = [];
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.loadLocal();
  }

  getEvents(): CityEvent[] {
    return this.events;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  startEvent(input: NewEventInput): CityEvent {
    const event: CityEvent = {
      id: `event-${Date.now().toString(36)}`,
      ...input,
      locationId: EVENT_KINDS[input.kind].locationId,
      status: 'active',
      startedAt: nowIso(),
      endedAt: null,
    };
    this.events = [...this.events, event];
    this.emit();
    return event;
  }

  endEvent(id: string): void {
    this.events = this.events.map((e) =>
      e.id === id && e.status === 'active' ? { ...e, status: 'ended', endedAt: nowIso() } : e,
    );
    this.emit();
  }

  /** Akhiri semua acara aktif yang sudah melewati durasinya. */
  endExpired(nowMs: number): void {
    const expired = this.events.filter((e) => isEventExpired(e, nowMs));
    if (expired.length === 0) return;
    const ids = new Set(expired.map((e) => e.id));
    const endedAt = new Date(nowMs).toISOString();
    this.events = this.events.map((e) =>
      ids.has(e.id) ? { ...e, status: 'ended', endedAt } : e,
    );
    this.emit();
  }

  deleteEvent(id: string): void {
    this.events = this.events.filter((e) => e.id !== id);
    this.emit();
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CityEvent[];
        if (Array.isArray(parsed)) {
          this.events = parsed;
          return;
        }
      }
    } catch {
      // localStorage rusak / tidak tersedia — pakai seed.
    }
    this.events = seedEvents();
  }

  private emit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // Penyimpanan lokal penuh / diblokir — state memori tetap jalan.
    }
    this.listeners.forEach((fn) => fn());
  }
}
