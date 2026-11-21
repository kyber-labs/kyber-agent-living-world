# Rencana Fase — AI Agent Living World 3D

Sumber: dokumen MASTER PROMPT (Google Doc), 7 fase wajib. Aturan dokumen:
JANGAN versi sederhana, JANGAN lewati fase, JANGAN mockup/placeholder,
JANGAN klaim fitur selesai jika belum diuji. Fitur yang belum selesai
didokumentasikan di sini sebagai backlog dan ditampilkan transparan di UI.

## Phase 1 — Setup proyek ✅ SELESAI (21 Nov 2026)
- Scaffold Vite + React 19 + TypeScript + Three.js 0.187.
- Struktur folder modular: `world/engine` (game world engine),
  `simulation` (simulation engine), `ui` (antarmuka), `agents` (orkestrasi,
  via `config/agents.ts` + `types/agent.ts`), `lib/supabase.ts`
  (persistence layer — wiring saja, null bila env kosong).
- Scene 3D minimal yang benar-benar jalan: langit siang, tanah, plaza,
  cahaya + bayangan, orbit controls (putar/zoom/pan), reset kamera.
- Penanda agent sementara: 10 figur kapsul berwarna + nama, bisa diklik
  (raycast) dan tersinkron dengan daftar di sidebar. BUKAN karakter final —
  karakter 3D lengkap adalah Phase 3.
- UI shell yang berfungsi: daftar 10 agent, panel detail, HUD (jumlah agent,
  status, fase, status database). Tidak ada tombol dekoratif tanpa fungsi.
- `.env.example`, `docs/SETUP.md`, `docs/PHASES.md`, README.
- Verifikasi: `npm run build` (tsc + vite) lulus, dev server HTTP 200.

## Phase 2 — Dunia 3D dasar, gedung kantor, sistem kamera ⏳ BERIKUTNYA
- Kawasan virtual §3: gedung kantor pusat, arena olahraga, plaza & taman,
  hiburan, residensial, transportasi, alam.
- Mode kamera §4: Overview, Top View, First Person, Follow Agent, Cinematic
  + minimap 2D + transisi halus.

## Phase 3 — Karakter agent 3D, animasi, navigasi
- Karakter per agent (bukan kapsul), animasi §8: berjalan, berlari, duduk,
  mengetik, berbicara, berpikir, merayakan; pakaian sesuai peran; nama/peran/
  status di atas kepala.

## Phase 4 — AI Agent Engine, integrasi model AI, task management
- Engine + integrasi LLM (OpenAI/Anthropic/Gemini — BUTUH keputusan API key
  + biaya dari Bos), task manager lengkap (Kanban, kalender, dependensi),
  tabel + migrasi + seed Supabase.

## Phase 5 — Meeting room, kolaborasi, life simulation
- 6 ruang meeting, kolaborasi (whiteboard, catatan bersama), jadwal harian,
  kebutuhan agent (energi/fokus/mood), cuaca dan waktu.

## Phase 6 — Olahraga, hiburan, world builder, analytics
- Sistem olahraga + kompetisi, hiburan, build mode (katalog objek, simpan/
  muat desain), dashboard analytics + export PDF/CSV.

## Phase 7 — Optimasi, pengujian, dokumentasi
- LOD, frustum culling, instancing, pengaturan kualitas grafis, monitoring
  FPS/memori, pengujian perangkat + browser + performa + keamanan, laporan
  pengujian yang jujur.

## Backlog transparan (belum ada — jangan diklaim berfungsi)
- Mode kamera selain orbit, minimap, bangunan/kawasan, karakter final,
  animasi status, AI engine, task management, meeting, life sim, olahraga,
  world builder, analytics, mode gelap, database live, autentikasi.
