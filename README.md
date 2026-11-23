# AI Agent Living World 3D

Dunia virtual 3D tempat 10 AI Agent hidup, bekerja, dan berkolaborasi —
kota lengkap dengan gedung kantor, arena, panggung hiburan, perumahan,
taman, meeting room, tugas, acara, dan simulasi kehidupan. Dibangun sesuai
dokumen MASTER PROMPT (Google Doc, 7 fase wajib), proyek baru yang terpisah
dari Mission Control.

**Status: Phase 7/7 ✅ SELESAI** — semua fase selesai dan terverifikasi
live (lihat `docs/PHASES.md` untuk riwayat tiap fase + backlog transparan).
Live: https://kyber-agent-living-world.vercel.app/

## Fitur

- **Kota 3D** — gedung kantor 6 lantai, arena olahraga, panggung hiburan,
  10 rumah, taman, jalan bermarka, alam; 5 mode kamera (Overview, Atas,
  Orang Pertama, Ikuti Agent, Sinematik) + minimap 2D yang bisa diklik.
- **10 agent fiktif** — Aria (PM), Kai (Developer), Luna (UI/UX), Max (Data
  Analyst), Nova (Marketing), Leo (DevOps), Zoe (Content Writer), Rex (QA),
  Mia (HR), Finn (Customer Support). Karakter humanoid low-poly dengan
  animasi prosedural (jalan, bekerja, berpikir, meeting, olahraga, hiburan,
  istirahat, merayakan) dan navigasi antar kawasan via graf + BFS.
- **AI Agent Engine** — chat per agent + penugasan tugas otomatis lewat
  Gemini (tier gratis Google AI Studio). Bila key kosong/gagal: mode
  simulasi lokal yang diberi label jelas, tidak diklaim sebagai AI.
- **Tugas** — Kanban (buat/pindah/hapus/tugaskan otomatis), prioritas,
  deadline, dependensi; tersimpan di localStorage + sync Supabase bila
  dikonfigurasi.
- **Meeting** — 6 ruang meeting (kapasitas 2–10), whiteboard catatan
  bersama, riwayat; peserta berjalan ke room dan berkumpul melingkar.
- **Life simulation** — vital energi/fokus/mood per agent, jam harian
  (1 hari = 10 menit nyata), cuaca bergilir (cerah/berawan/hujan) yang
  mengubah suasana 3D (langit, cahaya, kabut, hujan).
- **Olahraga & hiburan** — acara "Pertandingan persahabatan" (Arena) dan
  "Pertunjukan" (Panggung); hitung mundur dimulai saat semua peserta
  berkumpul; aktivitas ambient 30% di Arena/Panggung.
- **World builder** — tambah/pindah/hapus pohon, bangku, lampu, air mancur
  dengan klik tanah + validasi; tampil di 3D + minimap.
- **Analytics** — statistik nyata dari state aplikasi (tugas, meeting,
  acara, aktivitas, vital, objek) + export CSV + cetak/simpan PDF via
  print browser.
- **Performa** — monitor FPS nyata + jumlah draw call di HUD; pepohonan,
  marka jalan, dan rumah digambar sebagai InstancedMesh (lihat
  `docs/PHASES.md` §7 untuk angka draw call).

## Stack

- Vite 8 + React 19 + TypeScript (strict, `erasableSyntaxOnly`)
- Three.js 0.187 (plain, tanpa react-three-fiber)
- Supabase (`@supabase/supabase-js`) — wiring persistence, opsional
- Tanpa library chart / PDF — statistik memakai bar CSS, PDF via print

## Mulai

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build
npm run preview    # sajikan hasil build
npm test           # semua suite logika (145 assertion)
```

Detail lengkap (termasuk env Gemini + Supabase dan troubleshooting):
`docs/SETUP.md`. Arsitektur: `docs/ARCHITECTURE.md`.

## Struktur

```
src/
  config/      # tema + daftar 10 agent
  types/       # tipe Agent, Task, Meeting, Event, WorldObject + status
  world/
    engine/    # game world engine (scene, kamera, renderer, loop)
    camera/    # director lima mode kamera
    characters/# karakter agent 3D + animasi prosedural
    buildings/ # kota, ruang meeting, prop world builder
    navigation/# graf navigasi 11 simpul + BFS
  simulation/  # simulation engine (jam dunia, behavior, life sim,
               # store tugas/meeting/acara/objek, analytics, FPS)
  ai/          # AI Agent Engine (LLM provider-agnostic + adaptor Gemini)
  ui/          # daftar agent, panel detail/chat, Kanban, panel
               # meeting/acara/builder/analitik, HUD
  components/  # WorldView (jembatan React–Three.js), Minimap
  lib/         # persistence layer (Supabase, null bila env kosong)
scripts/       # uji logika per fase + run-all-tests.sh (npm test)
docs/
  SETUP.md       # cara menjalankan + troubleshooting
  PHASES.md      # rencana 7 fase + backlog transparan
  ARCHITECTURE.md# struktur modular + alur data
supabase/
  migrations/  # migrasi tabel tasks + chat_messages
```

## Variabel environment

Salin `.env.example` ke `.env`. Yang dipakai kode:

| Variabel | Wajib? | Keterangan |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Tidak (mode simulasi bila kosong) | Key Google AI Studio; **ikut terbungkus ke bundle JS publik** — batasi ke HTTP referrer `https://kyber-agent-living-world.vercel.app/*` di Google Cloud Console (butuh 2-Step Verification di akun Google). |
| `VITE_GEMINI_MODEL` | Tidak | Model Gemini; default kode `gemini-2.5-flash` — **tidak tersedia untuk project AI Studio baru** (dibatasi Google sejak 2026); pakai `gemini-3.5-flash-lite` (sudah terpasang di Vercel). |
| `VITE_SUPABASE_URL` | Tidak | URL project Supabase (sinkronisasi tugas). |
| `VITE_SUPABASE_ANON_KEY` | Tidak | Anon key Supabase. |

Bila env Supabase kosong, aplikasi tetap jalan; status database tampil
"belum dikonfigurasi" dan data tersimpan lokal (localStorage).

## Deploy

Pola yang sama dengan Mission Control: push repo ke GitHub
(`kyber-labs/kyber-agent-living-world`), lalu Vercel Import dari repo
tersebut — deploy otomatis tiap push ke `main`. Pasang variabel
environment di Vercel (Production + Preview + Development). Perhatian:
`VITE_*` adalah variabel publik — Vercel menolak menyimpannya sebagai
Secret; simpan sebagai Config.

## Aturan kualitas (dari dokumen)

- Kode modular, tidak ada satu file besar.
- Tidak ada mockup/placeholder yang mengaku fungsi jadi.
- Tidak ada tombol dekoratif tanpa fungsi.
- Jangan klaim fitur selesai jika belum diuji — yang belum selesai ada di
  backlog transparan (`docs/PHASES.md`).
