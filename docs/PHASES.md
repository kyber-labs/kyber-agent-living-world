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
- Verifikasi: `npm run build` (tsc + vite) lulus, dev server HTTP 200,
  preview build HTTP 200, live terverifikasi 22 Nov 05:58 di
  https://kyber-agent-living-world.vercel.app/ (repo
  `kyber-labs/kyber-agent-living-world`).

## Phase 2 — Dunia 3D dasar, gedung kantor, sistem kamera ✅ SELESAI (22 Nov 2026)
- Kawasan virtual §3 (`src/world/buildings/city.ts`): gedung kantor pusat
  6 lantai (fasad jendela, pintu masuk, antena), arena olahraga (dinding
  melingkar, lapangan, 4 lampu sorot), panggung hiburan (layar + bangku),
  10 rumah dua baris (atap limas, warna beda), taman (pepohonan + bangku),
  jalan salib bermarka, pepohonan + bebatuan alam di tepi kota. Semua
  geometri nyata dengan bayangan.
- Mode kamera §4 (`src/world/camera/CameraDirector.ts`): Overview (orbit),
  Top View (dari atas), First Person (WASD/panah + seret untuk melihat,
  tinggi mata 1,7), Follow Agent (mengikuti agent terpilih), Cinematic
  (orbit otomatis pelan) — semuanya dengan transisi halus (~0,9 dtk).
- Minimap 2D (`src/components/Minimap.tsx`): jalan, plaza, bangunan,
  pepohonan, titik agent + cincin terpilih, panah arah kamera; klik minimap
  menggeser pandangan (mode Overview/Top).
- UI: toolbar 5 mode kamera di atas canvas, tombol Reset kamera kembali ke
  Overview, HUD menampilkan "Fase 2/7 — Dunia & Kamera".
- Verifikasi: `npm run build` (tsc + vite) lulus, dev server HTTP 200,
  preview build HTTP 200.
- Perbaikan 22 Nov (2.1): tombol Reset kamera tidak mengembalikan posisi
  setelah pan via minimap — penyebab `setMode` early-return saat mode sudah
  Overview; diperbaiki dengan menghapus early-return itu.

## Phase 3 — Karakter agent 3D, animasi, navigasi
- Karakter per agent (bukan kapsul), animasi §8: berjalan, berlari, duduk,
  mengetik, berbicara, berpikir, merayakan; pakaian sesuai peran; nama/peran/
  status di atas kepala.
- **SELESAI 22 Nov:** humanoid low-poly dari primitif (kaki/torso/lengan/
  kepala/rambut — gaya rambut + warna kulit bervariasi, prop peran: laptop
  Kai & Max, notebook Aria/Zoe/Mia, perkakas Leo & Rex, palet Luna, headset
  Finn & Nova); label di atas kepala menampilkan nama + peran + titik status
  (diperbarui saat status berubah). Animasi prosedural: idle (napas),
  moving (langkah kaki + ayun lengan, 2,2 unit/dtk), working (mengetik),
  thinking (tangan ke dagu), meeting (gestur bicara + angguk), celebrating
  (lengan ke atas + lompat), resting (duduk), error (geleng kepala).
  Graf navigasi 11 simpul (plaza, jalan, depan tiap kawasan) + BFS; behavior
  ambient: jalan ke kawasan acak, diam dengan aktivitas acak, meeting bila
  bertemu agent lain yang sedang diam. Status + lokasi live masuk sidebar,
  panel detail, dan HUD. `npm run build` lulus, dev + preview HTTP 200.
- Catatan: animasi **berlari** dan **berbicara** belum dipisah (berlari =
  jalan cepat belum ada; berbicara = gestur meeting); status `error` sudah
  ada animasinya tapi TIDAK dipicu simulasi ambient — hanya untuk kegagalan
  engine di Phase 4.

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
- AI engine, task management, meeting room, life sim, olahraga, world
  builder, analytics, mode gelap, database live, autentikasi, animasi
  berlari dan berbicara yang terpisah.
