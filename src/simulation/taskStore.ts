// TaskStore — Phase 4. Penyimpanan tugas: state dalam memori +
// localStorage (selalu), sinkronisasi Supabase bila dikonfigurasi
// (tabel 'tasks' dari migrasi Phase 4). Bila Supabase belum ada,
// aplikasi tetap berfungsi penuh secara lokal — tidak ada data yang
// diklaim tersimpan di database.

import { supabase } from '../lib/supabase';
import type { NewTaskInput, Task, TaskStatus } from '../types/task';

const STORAGE_KEY = 'living-world-tasks-v1';

const nowIso = (): string => new Date().toISOString();

function seedTasks(): Task[] {
  const base = '2026-11-23T00:00:00.000Z';
  return [
    {
      id: 'task-1',
      title: 'Rancang ulang dashboard analytics',
      description: 'Perbarui tampilan grafik dan filter periode.',
      status: 'doing',
      priority: 'high',
      assigneeId: 'luna',
      deadline: '2026-11-28',
      dependsOn: [],
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 'task-2',
      title: 'Perbaiki bug sinkronisasi minimap',
      description: 'Posisi agent di minimap kadang tertinggal satu frame.',
      status: 'doing',
      priority: 'high',
      assigneeId: 'kai',
      deadline: '2026-11-25',
      dependsOn: [],
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 'task-3',
      title: 'Tulis dokumentasi API engine',
      description: 'Dokumen cara memanggil engine dan format tugas.',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'zoe',
      deadline: null,
      dependsOn: ['task-2'],
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 'task-4',
      title: 'Siapkan kampanye peluncuran',
      description: 'Materi promosi untuk pengumuman Phase 4.',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'nova',
      deadline: '2026-12-01',
      dependsOn: [],
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 'task-5',
      title: 'Audit keamanan endpoint',
      description: 'Periksa kunci API tidak bocor ke bundle.',
      status: 'todo',
      priority: 'high',
      assigneeId: 'rex',
      deadline: null,
      dependsOn: [],
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 'task-6',
      title: 'Rapat tinjauan sprint',
      description: 'Bahas progres dan hambatan minggu ini.',
      status: 'todo',
      priority: 'low',
      assigneeId: 'aria',
      deadline: null,
      dependsOn: ['task-1'],
      createdAt: base,
      updatedAt: base,
    },
    {
      id: 'task-7',
      title: 'Setup repositori proyek',
      description: 'Scaffold awal dan struktur folder.',
      status: 'done',
      priority: 'low',
      assigneeId: 'kai',
      deadline: null,
      dependsOn: [],
      createdAt: base,
      updatedAt: base,
    },
  ];
}

export class TaskStore {
  private tasks: Task[] = [];
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.loadLocal();
    // Muat dari Supabase di latar bila dikonfigurasi (tanpa memblokir).
    void this.loadFromSupabase();
  }

  getTasks(): Task[] {
    return this.tasks;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  addTask(input: NewTaskInput): Task {
    const task: Task = {
      id: `task-${Date.now().toString(36)}`,
      ...input,
      status: 'todo',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.tasks = [...this.tasks, task];
    this.emit();
    return task;
  }

  updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    this.tasks = this.tasks.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t,
    );
    this.emit();
  }

  moveTask(id: string, status: TaskStatus): void {
    this.updateTask(id, { status });
  }

  deleteTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.emit();
  }

  private loadLocal(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Task[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tasks = parsed;
          return;
        }
      }
    } catch {
      // localStorage rusak / tidak tersedia — pakai seed.
    }
    this.tasks = seedTasks();
  }

  private persistLocal(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
    } catch {
      // Penyimpanan lokal penuh / diblokir — state memori tetap jalan.
    }
  }

  private notify(): void {
    this.persistLocal();
    this.listeners.forEach((fn) => fn());
  }

  private emit(): void {
    this.notify();
    void this.syncSupabase();
  }

  private async loadFromSupabase(): Promise<void> {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    if (error || !data || data.length === 0) return;
    // Baris DB memakai snake_case — petakan ke tipe Task (camelCase).
    this.tasks = (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: String(r.title),
      description: String(r.description ?? ''),
      status: r.status as Task['status'],
      priority: r.priority as Task['priority'],
      assigneeId: (r.assignee_id as string | null) ?? null,
      deadline: (r.deadline as string | null) ?? null,
      dependsOn: (r.depends_on as string[] | null) ?? [],
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
    this.notify();
  }

  private async syncSupabase(): Promise<void> {
    if (!supabase) return;
    const rows = this.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee_id: t.assigneeId,
      deadline: t.deadline,
      depends_on: t.dependsOn,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    }));
    await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
  }
}
