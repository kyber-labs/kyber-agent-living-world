// WorldObjectStore — Phase 6. Penyimpanan objek world builder: state
// dalam memori + localStorage (selalu), mengikuti pola MeetingStore
// (Phase 5). Tidak ada sync Supabase — tabel world_objects belum ada;
// dicatat sebagai backlog di docs/PHASES.md. Bila localStorage kosong,
// diisi dua objek contoh (jejak demo, sama seperti seed meeting/event).

import type { NewWorldObjectInput, WorldObject } from '../types/worldObject';
import { defaultRotation } from './builderLogic';

const STORAGE_KEY = 'living-world-objects-v1';

const nowIso = (): string => new Date().toISOString();

function seedObjects(): WorldObject[] {
  return [
    {
      id: 'object-seed-1',
      kind: 'bench',
      x: 8,
      z: 8,
      rotY: defaultRotation('bench', 8, 8),
      createdAt: '2026-11-23T00:00:00.000Z',
    },
    {
      id: 'object-seed-2',
      kind: 'lamp',
      x: -8,
      z: 8,
      rotY: 0,
      createdAt: '2026-11-23T00:00:00.000Z',
    },
  ];
}

export class WorldObjectStore {
  private objects: WorldObject[] = [];
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.loadLocal();
  }

  getObjects(): WorldObject[] {
    return this.objects;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  addObject(input: NewWorldObjectInput): WorldObject {
    const object: WorldObject = {
      id: `object-${Date.now().toString(36)}`,
      ...input,
      rotY: defaultRotation(input.kind, input.x, input.z),
      createdAt: nowIso(),
    };
    this.objects = [...this.objects, object];
    this.emit();
    return object;
  }

  moveObject(id: string, x: number, z: number): void {
    this.objects = this.objects.map((o) =>
      o.id === id ? { ...o, x, z, rotY: defaultRotation(o.kind, x, z) } : o,
    );
    this.emit();
  }

  deleteObject(id: string): void {
    this.objects = this.objects.filter((o) => o.id !== id);
    this.emit();
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorldObject[];
        if (Array.isArray(parsed)) {
          this.objects = parsed;
          return;
        }
      }
    } catch {
      // localStorage rusak / tidak tersedia — pakai seed.
    }
    this.objects = seedObjects();
  }

  private emit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.objects));
    } catch {
      // Penyimpanan lokal penuh / diblokir — state memori tetap jalan.
    }
    this.listeners.forEach((fn) => fn());
  }
}
