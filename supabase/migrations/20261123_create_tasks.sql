-- Migrasi Phase 4: tabel tugas + pesan chat (MASTER PROMPT §15).
-- Jalankan di SQL Editor project Supabase Living World (project BARU —
-- BUKAN project Mission Control ldsgcevtnctnwtdfimxh).
-- RLS dibuka longgar untuk demo (tanpa autentikasi di Phase 4);
-- autentikasi + RBAC adalah fase lanjut, bukan Phase 4.

create table if not exists tasks (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assignee_id text,
  deadline date,
  depends_on text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  role text not null check (role in ('user', 'agent')),
  content text not null,
  live boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "tasks_all" on tasks;
create policy "tasks_all" on tasks for all using (true) with check (true);

drop policy if exists "chat_messages_all" on chat_messages;
create policy "chat_messages_all" on chat_messages for all using (true) with check (true);

-- Seed demo (sama dengan seed lokal TaskStore).
insert into tasks (id, title, description, status, priority, assignee_id, deadline, depends_on, created_at, updated_at) values
  ('task-1', 'Rancang ulang dashboard analytics', 'Perbarui tampilan grafik dan filter periode.', 'doing', 'high', 'luna', '2026-11-28', '{}', '2026-11-23', '2026-11-23'),
  ('task-2', 'Perbaiki bug sinkronisasi minimap', 'Posisi agent di minimap kadang tertinggal satu frame.', 'doing', 'high', 'kai', '2026-11-25', '{}', '2026-11-23', '2026-11-23'),
  ('task-3', 'Tulis dokumentasi API engine', 'Dokumen cara memanggil engine dan format tugas.', 'todo', 'medium', 'zoe', null, '{task-2}', '2026-11-23', '2026-11-23'),
  ('task-4', 'Siapkan kampanye peluncuran', 'Materi promosi untuk pengumuman Phase 4.', 'todo', 'medium', 'nova', '2026-12-01', '{}', '2026-11-23', '2026-11-23'),
  ('task-5', 'Audit keamanan endpoint', 'Periksa kunci API tidak bocor ke bundle.', 'todo', 'high', 'rex', null, '{}', '2026-11-23', '2026-11-23'),
  ('task-6', 'Rapat tinjauan sprint', 'Bahas progres dan hambatan minggu ini.', 'todo', 'low', 'aria', null, '{task-1}', '2026-11-23', '2026-11-23'),
  ('task-7', 'Setup repositori proyek', 'Scaffold awal dan struktur folder.', 'done', 'low', 'kai', null, '{}', '2026-11-23', '2026-11-23')
on conflict (id) do nothing;
