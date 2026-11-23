# Cara Menjalankan — AI Agent Living World 3D

## Syarat
- Node.js 20+ (diuji dengan Node 24) dan npm.

## Jalankan lokal
```bash
npm install
npm run dev
```
Buka alamat yang ditampilkan Vite (umumnya `http://localhost:5173`).

## Build produksi
```bash
npm run build
npm run preview
```
`npm run build` menjalankan `tsc` (type-check) lalu `vite build`. Build gagal
bila ada error TypeScript — itu disengaja, sesuai aturan kualitas dokumen.

## Uji logika
```bash
npm test
```
Menjalankan semua suite logika (Phase 5, 6, 6.1, 6.2, 7 — total 145
assertion) lewat `scripts/run-all-tests.sh`. Satu suite juga bisa
dijalankan sendiri, mis. `bash scripts/run-all-tests.sh` memakai perintah
yang sama untuk tiap suite:
```bash
./node_modules/.bin/rolldown scripts/phase7-test.ts --format esm --file /tmp/phase7-test.mjs
node /tmp/phase7-test.mjs
```
`node scripts/phase7-test.ts` langsung TIDAK bisa dipakai — import tanpa
ekstensi gaya Vite tidak bisa di-resolve Node ESM (bukan cacat aplikasi);
karena itu tiap suite dibundel dulu dengan rolldown (bundler Vite 8).

## Variabel environment
Salin `.env.example` ke `.env` dan isi bila sudah ada:

| Variabel | Keterangan |
|---|---|
| `VITE_SUPABASE_URL` | URL project Supabase (PostgreSQL) — sinkronisasi tugas |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
| `VITE_GEMINI_API_KEY` | Key Google AI Studio (chat + penugasan otomatis) |
| `VITE_GEMINI_MODEL` | Model Gemini (lihat peringatan di bawah) |

Bila env Supabase kosong, aplikasi tetap jalan; status database tampil
"belum dikonfigurasi" dan tugas + meeting + acara + objek builder
tersimpan lokal (localStorage).

## Gemini (AI Engine, Phase 4)
1. Buat key di Google AI Studio (https://aistudio.google.com/app/apikey)
   dengan akun Google Bos — sebaiknya key khusus untuk proyek ini.
2. Pasang di Vercel sebagai `VITE_GEMINI_API_KEY` (tipe Config, bukan
   Secret — Vercel menolak prefix `VITE_` untuk Secret) + centang ketiga
   environment (Production, Preview, Development), lalu redeploy.
3. Pasang `VITE_GEMINI_MODEL=gemini-3.5-flash-lite` di Vercel dengan cara
   yang sama.
4. **Batasi key ke referrer** (penting — key ikut terbungkus ke bundle JS
   publik): aktifkan 2-Step Verification di akun Google, lalu di Google
   Cloud Console → APIs & Services → Credentials → key tersebut →
   Application restrictions: HTTP referrers
   `https://kyber-agent-living-world.vercel.app/*` + API restrictions:
   Generative Language API. Tanpa ini siapa pun bisa memakai key itu.
5. Bila key kosong/gagal, engine jalan dalam mode simulasi lokal yang
   diberi label jelas di UI (bukan diklaim sebagai AI).

## Supabase (opsional, sinkronisasi tugas)
1. Buat project Supabase baru (BUKAN project Mission Control).
2. Jalankan `supabase/migrations/20261123_create_tasks.sql` di SQL Editor
   project itu (membuat tabel `tasks` + `chat_messages`).
3. Pasang `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` di `.env`
   (lokal) / Vercel (deploy), lalu redeploy. HUD berubah menjadi
   "Database: terhubung" dan tugas tersinkron ke Supabase.
4. Meeting, acara, dan objek builder BELUM tersinkron ke Supabase
   (tabel belum ada — lihat backlog di `docs/PHASES.md`).

## Deploy (Vercel)
Pola yang sama dengan Mission Control: push repo ke GitHub
(`kyber-labs/kyber-agent-living-world`), lalu Vercel Import dari repo
tersebut. Deploy otomatis tiap push ke `main`. Perhatian: cara unggah
lewat web GitHub menjatuhkan subfolder bila hanya file root yang
di-drag — folder `src`/`docs`/`scripts` harus diunggah sebagai folder
(atau lewat commit biasa), kalau tidak build gagal (TS18003).

## Troubleshooting (yang sudah diketahui)
- **Balasan chat tetap simulasi padahal key sudah dipasang** — penyebab
  paling umum: model yang dipakai tidak tersedia untuk project AI Studio
  baru. Google membatasi model 2.5 (termasuk `gemini-2.5-flash`, default
  kode di `src/ai/llm.ts`) hanya untuk pengguna lama; project baru
  mendapat error 404/503. Solusi: pasang
  `VITE_GEMINI_MODEL=gemini-3.5-flash-lite` di Vercel + redeploy.
  Perhatian: deploy baru TANPA env var model akan memakai default kode
  (`gemini-2.5-flash`) dan gagal lagi — jangan hapus env var itu.
- **Key benar tapi API tetap gagal** — periksa format key: sejak Mei 2026
  AI Studio menerbitkan key format baru berawalan `AQ.` (bukan `AIza`);
  keduanya valid. Pastikan key dikirim lewat header `x-goog-api-key`
  (sudah benar di `src/ai/llm.ts`) dan project AI Studio-nya tidak
  dibatasi billing.
- **Cloud Console diblokir ("Google Cloud access blocked")** — Google
  mewajibkan 2-Step Verification sejak 14 Feb 2026; aktifkan dulu di
  akun Google, baru buka Cloud Console untuk membatasi key. Pendaftaran
  trial billing Cloud TIDAK perlu diisi (key gratis jalan tanpa billing).
- **Uji logika gagal `ERR_MODULE_NOT_FOUND`** — jangan jalankan
  `node scripts/*-test.ts` langsung; pakai bundle rolldown (lihat
  "Uji logika" di atas).
- **Dev server tidak bisa dibuka di `127.0.0.1`** — Vite dev bind ke
  IPv6; buka `http://localhost:PORT/`, bukan `127.0.0.1`. Preview pakai
  `--host 127.0.0.1` bila perlu IPv4.
- **Klik figur 3D meleset** — klik agent yang sedang DIAM (status
  Bekerja/Istirahat/Berpikir/Meeting) dan pakai screenshot segar sebelum
  klik; figur yang berjalan cepat + label kecil di Overview memang sulit
  dibidik (kerapuhan yang diketahui sejak Phase 3.2).
