// Tipe data agent — sesuai MASTER PROMPT §5 (karakter) dan §8 (status).
// Status di sini adalah status yang dipakai engine; label Indonesianya untuk UI.

export type AgentStatus =
  | 'idle'
  | 'working'
  | 'thinking'
  | 'meeting'
  | 'moving'
  | 'celebrating'
  | 'resting'
  | 'error'
  // Phase 6: aktivitas olahraga & hiburan (acara terjadwal + ambient).
  | 'sports'
  | 'entertainment';

export interface Agent {
  id: string;
  name: string;
  role: string;
  /** Warna khas agent (hex). Dipakai di daftar, penanda 3D, dan panel detail. */
  color: string;
  status: AgentStatus;
  /** Satu kalimat tentang peran agent (dari MASTER PROMPT §5). */
  description: string;
}

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'Menganggur',
  working: 'Bekerja',
  thinking: 'Berpikir',
  meeting: 'Meeting',
  moving: 'Berpindah',
  celebrating: 'Merayakan',
  resting: 'Istirahat',
  error: 'Error',
  sports: 'Olahraga',
  entertainment: 'Hiburan',
};

/** Warna titik status (label 3D + UI). */
export const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: '#94a3b8',
  working: '#10b981',
  thinking: '#8b5cf6',
  meeting: '#f59e0b',
  moving: '#0ea5e9',
  celebrating: '#ec4899',
  resting: '#14b8a6',
  error: '#ef4444',
  sports: '#16a34a',
  entertainment: '#db2777',
};

/** Status + lokasi live per agent, dikirim engine saat berubah (Phase 3). */
export type LiveAgentState = Record<string, { status: AgentStatus; location: string }>;
