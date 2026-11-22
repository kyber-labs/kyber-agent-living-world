// Tipe tugas — MASTER PROMPT §6 (task management), Phase 4.
// Satu tugas: judul, deskripsi, status Kanban, prioritas, penugasan,
// deadline, dan dependensi (tugas lain yang harus selesai dulu).

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  deadline: string | null; // tanggal ISO (YYYY-MM-DD) atau null
  dependsOn: string[]; // id tugas yang harus 'done' dulu
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface NewTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: string | null;
  deadline: string | null;
  dependsOn: string[];
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To Do',
  doing: 'Doing',
  done: 'Done',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
};
