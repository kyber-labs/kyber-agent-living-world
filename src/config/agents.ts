// Daftar 10 AI agent — MASTER PROMPT §5.
// Nama + peran persis dari dokumen. Warna adalah penetapan Phase 1 (dokumen
// hanya menyebut tiap agent punya warna, tanpa nilai spesifik) dan bisa diubah.
// Semua agent berstatus 'idle' di Phase 1: belum ada engine tugas (Phase 4),
// jadi tidak ada status kerja yang diklaim.

import type { Agent } from '../types/agent';

export const AGENTS: Agent[] = [
  { id: 'aria', name: 'Aria', role: 'Project Manager', color: '#6366F1', status: 'idle', description: 'Mengelola proyek, membagi tugas, dan menjaga jadwal tim.' },
  { id: 'kai', name: 'Kai', role: 'Software Developer', color: '#0EA5E9', status: 'idle', description: 'Menulis dan memperbaiki kode aplikasi.' },
  { id: 'luna', name: 'Luna', role: 'UI/UX Designer', color: '#EC4899', status: 'idle', description: 'Merancang antarmuka dan pengalaman pengguna.' },
  { id: 'max', name: 'Max', role: 'Data Analyst', color: '#F59E0B', status: 'idle', description: 'Menganalisis data dan menyusun laporan.' },
  { id: 'nova', name: 'Nova', role: 'Marketing Specialist', color: '#10B981', status: 'idle', description: 'Menyusun strategi pemasaran dan konten promosi.' },
  { id: 'leo', name: 'Leo', role: 'DevOps Engineer', color: '#8B5CF6', status: 'idle', description: 'Mengelola infrastruktur, deployment, dan keandalan sistem.' },
  { id: 'zoe', name: 'Zoe', role: 'Content Writer', color: '#F97316', status: 'idle', description: 'Menulis dokumen, artikel, dan materi konten.' },
  { id: 'rex', name: 'Rex', role: 'QA Engineer', color: '#EF4444', status: 'idle', description: 'Menguji aplikasi dan memastikan kualitas.' },
  { id: 'mia', name: 'Mia', role: 'HR Manager', color: '#14B8A6', status: 'idle', description: 'Mengelola tim, jadwal, dan kebutuhan anggota.' },
  { id: 'finn', name: 'Finn', role: 'Customer Support', color: '#64748B', status: 'idle', description: 'Membantu pengguna dan menjawab pertanyaan.' },
];
