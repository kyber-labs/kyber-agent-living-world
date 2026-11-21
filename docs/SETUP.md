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

## Variabel environment (opsional di Phase 1)
Salin `.env.example` ke `.env` dan isi bila sudah ada:
- `VITE_SUPABASE_URL` — URL project Supabase (PostgreSQL)
- `VITE_SUPABASE_ANON_KEY` — anon key Supabase

Bila kosong, aplikasi tetap jalan; status database tampil "belum dikonfigurasi".
Database dipakai mulai Phase 4.

## Deploy (Vercel)
Pola yang sama dengan Mission Control: push repo ke GitHub, lalu Vercel Import.
Tidak ada variabel environment wajib di Phase 1.
