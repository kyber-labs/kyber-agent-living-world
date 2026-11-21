// Persistence layer — koneksi database (Phase 1: wiring saja).
// Klien Supabase (PostgreSQL) dibuat hanya bila env VITE_SUPABASE_URL dan
// VITE_SUPABASE_ANON_KEY diisi; bila tidak, bernilai null dan UI menampilkan
// status "belum dikonfigurasi" secara transparan. Tabel, migrasi, dan seed
// adalah lingkup Phase 4 (AI Agent Engine + task management) — belum ada di
// Phase 1, dan tidak ada data yang diklaim tersimpan.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export function isPersistenceConfigured(): boolean {
  return supabase !== null;
}
