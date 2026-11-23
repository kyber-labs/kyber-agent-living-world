// WorldObjectStore — Phase 6. Penyimpanan objek world builder: state
// dalam memori + localStorage (selalu), mengikuti pola MeetingStore
// (Phase 5). Tidak ada sync Supabase — tabel world_objects belum ada;
// dicatat sebagai backlog di docs/PHASES.md. Bila localStorage kosong,
// diisi dua objek contoh (jejak demo, sama seperti seed meeting/event).
//
// Phase 8.3: label + putaran per objek; simpanan lama (tanpa label /
// tanpa rotY) dinormalisasi saat muat (label '' , rotY = arah default).

import type { NewWorldObjectInput, WorldObject } from '../types/worldObject';
import { WORLD_OBJECT_CATALOG } from '../types/worldObject';
import { defaultRotation } from './builderLogic';

/** Label maksimal 40 karakter — cukup untuk nama pendek di panel. */
export const MAX_LABEL_LENGTH = 40;

/** Normalisasi label: pangkas spasi + batasi panjang. */
export function normalizeLabel(label: string | undefined): string {
  return (label ?? '').trim().slice(0, MAX_LABEL_LENGTH);
}

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
      label: '',
      createdAt: '2026-11-23T00:00:00.000Z',
    },
    {
      id: 'object-seed-2',
      kind: 'lamp',
      x: -8,
      z: 8,
      rotY: 0,
      label: '',
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
      kind: input.kind,
      x: input.x,
      z: input.z,
      // 8.3: putaran dari slider bila diberikan; kalau tidak, arah default.
      rotY: input.rotY ?? defaultRotation(input.kind, input.x, input.z),
      label: normalizeLabel(input.label),
      createdAt: nowIso(),
    };
    this.objects = [...this.objects, object];
    this.emit();
    return object;
  }

  /**
   * Pindah objek + (8.3) ubah putaran/labelnya bila diberikan.
   * Tanpa rotY, arah hadap kembali ke default (bangku menghadap plaza).
   */
  moveObject(id: string, x: number, z: number, rotY?: number, label?: string): void {
    this.objects = this.objects.map((o) =>
      o.id === id
        ? {
            ...o,
            x,
            z,
            rotY: rotY ?? defaultRotation(o.kind, x, z),
            label: label === undefined ? (o.label ?? '') : normalizeLabel(label),
          }
        : o,
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
          // 8.3: normalisasi simpanan lama — objek sebelum 8.3 tidak punya
          // label (→ '') dan bisa jadi tanpa rotY (→ arah default). Jenis
          // yang tidak dikenal dibuang (data rusak / versi lebih baru).
          this.objects = parsed
            .filter(
              (o): o is WorldObject =>
                !!o && typeof o.id === 'string' && typeof o.x === 'number' && typeof o.z === 'number' && o.kind in WORLD_OBJECT_CATALOG,
            )
            .map((o) => ({
              ...o,
              rotY: typeof o.rotY === 'number' ? o.rotY : defaultRotation(o.kind, o.x, o.z),
              label: normalizeLabel(o.label),
            }));
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
