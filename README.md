# AI Agent Living World 3D

Dunia virtual 3D tempat AI Agent hidup, bekerja, dan berkolaborasi — dibangun
sesuai dokumen MASTER PROMPT (Google Doc). Proyek baru, terpisah dari
Mission Control.

## Status
**Phase 1/7 — Setup ✅** — scaffold + engine 3D minimal + UI shell sudah jalan.
Lihat `docs/PHASES.md` untuk rencana lengkap dan backlog transparan.

## Stack
- Vite + React 19 + TypeScript
- Three.js (plain, tanpa react-three-fiber)
- Supabase (PostgreSQL) — wiring di Phase 1, dipakai mulai Phase 4

## Mulai
```bash
npm install
npm run dev
```
Detail: `docs/SETUP.md`.

## Struktur
```
src/
  config/      # tema + daftar 10 agent (dari dokumen §5)
  types/       # tipe Agent + status
  world/
    engine/    # game world engine (scene, kamera, renderer)
  simulation/  # simulation engine (jam dunia)
  ui/          # daftar agent, panel detail, HUD
  lib/         # persistence layer (Supabase)
docs/
  SETUP.md     # cara menjalankan
  PHASES.md    # rencana 7 fase + backlog
```

## Aturan kualitas (dari dokumen)
- Kode modular, tidak ada satu file besar.
- Tidak ada mockup/placeholder yang mengaku fungsi jadi.
- Tidak ada tombol dekoratif tanpa fungsi.
- Jangan klaim fitur selesai jika belum diuji.
