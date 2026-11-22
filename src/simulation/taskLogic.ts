// Logika murni task management — tanpa efek samping, mudah diuji.
// Dipakai engine (penugasan otomatis) dan UI (penanda tugas terblokir).

import type { Agent } from '../types/agent';
import type { Task } from '../types/task';

/** True bila ada dependensi yang belum 'done'. */
export function isBlocked(task: Task, tasks: Task[]): boolean {
  if (task.dependsOn.length === 0) return false;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return task.dependsOn.some((depId) => byId.get(depId)?.status !== 'done');
}

/** Tugas yang belum selesai. */
export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'done');
}

/** Jumlah tugas 'doing' yang dipegang satu agent (beban kerja). */
export function doingCount(agentId: string, tasks: Task[]): number {
  return tasks.filter((t) => t.assigneeId === agentId && t.status === 'doing').length;
}

// Kata kunci peran -> agent yang cocok. Dipakai penugasan otomatis
// berbasis aturan (dipakai engine bila LLM tidak tersedia/gagal).
const ROLE_KEYWORDS: { keywords: string[]; agentId: string }[] = [
  { keywords: ['desain', 'ui', 'ux', 'antarmuka', 'tampilan'], agentId: 'luna' },
  { keywords: ['kode', 'bug', 'api', 'aplikasi', 'program', 'fitur'], agentId: 'kai' },
  { keywords: ['data', 'analisis', 'laporan', 'statistik'], agentId: 'max' },
  { keywords: ['pemasaran', 'promosi', 'kampanye', 'sosial media'], agentId: 'nova' },
  { keywords: ['konten', 'tulis', 'dokumen', 'artikel', 'materi'], agentId: 'zoe' },
  { keywords: ['tes', 'qa', 'uji', 'kualitas', 'keamanan', 'audit'], agentId: 'rex' },
  { keywords: ['rekrut', 'sdm', 'karyawan', 'tim', 'jadwal'], agentId: 'mia' },
  { keywords: ['pelanggan', 'dukungan', 'support', 'pengguna'], agentId: 'finn' },
  { keywords: ['server', 'deploy', 'infra', 'sistem', 'devops'], agentId: 'leo' },
  { keywords: ['proyek', 'koordinasi', 'sprint', 'rapat'], agentId: 'aria' },
];

/**
 * Pilih agent terbaik untuk sebuah tugas (aturan, tanpa LLM):
 * +3 bila peran cocok kata kunci judul/deskripsi, -1 per tugas 'doing'
 * yang sedang dipegang. Seri dimenangkan agent yang lebih dulu di daftar.
 */
export function pickBestAgentRule(task: Task, agents: Agent[], tasks: Task[]): string | null {
  if (agents.length === 0) return null;
  const haystack = `${task.title} ${task.description}`.toLowerCase();
  let bestId: string | null = null;
  let bestScore = -Infinity;
  for (const agent of agents) {
    let score = -doingCount(agent.id, tasks);
    for (const rule of ROLE_KEYWORDS) {
      if (rule.agentId === agent.id && rule.keywords.some((k) => haystack.includes(k))) {
        score += 3;
        break;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = agent.id;
    }
  }
  return bestId;
}
