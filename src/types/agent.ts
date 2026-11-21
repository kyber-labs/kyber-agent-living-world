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
  | 'error';

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
};
