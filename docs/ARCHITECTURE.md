# Arsitektur — AI Agent Living World 3D

Aplikasi React + TypeScript + Three.js (plain, tanpa react-three-fiber),
sesuai aturan modular dokumen MASTER PROMPT: game world engine, simulation
engine, UI, agent orchestrator, dan persistence layer terpisah — tidak ada
satu file besar.

## Lapisan

```
React (App.tsx)
  │  state via useState/useMemo, sinkronisasi via useEffect
  ▼
┌──────────────────────────── UI (src/ui, src/components) ────────────────────────────┐
│ AgentList · AgentDetail · AgentChat · TaskBoard · MeetingPanel · EventsPanel       │
│ BuilderPanel · AnalyticsPanel · Hud · WorldView · Minimap                           │
└─────────────────────────────────────────────────────────────────────────────────────┘
  │  callback + store.subscribe()
  ▼
┌─────────────── Simulation engine (src/simulation) ───────────────┐
│ clock.ts        jam dunia (elapsed)                              │
│ behavior.ts     AgentBehavior: graf + BFS, ambient, meeting,     │
│                 acara, taskFocus — SATU sumber status agent      │
│ lifeSim.ts      LifeSim: vital, jam harian, cuaca                │
│ taskLogic / meetingLogic / eventLogic / builderLogic             │
│                 fungsi murni: validasi, slot, drift, agregasi   │
│ taskStore / meetingStore / eventStore / worldObjectStore         │
│                 state + subscribe + localStorage (+ Supabase    │
│                 bila dikonfigurasi, hanya TaskStore)             │
│ analytics.ts    agregasi statistik nyata dari state              │
│ fps.ts          FpsTracker: FPS dari delta frame (Phase 7)       │
└───────────────────────────────────────────────────────────────────┘
  │  callback onMove/onStatus/onLifeTick/onPerf
  ▼
┌─────────────── Game world engine (src/world) ────────────────────┐
│ engine/createWorld.ts   scene, renderer, loop, raycast klik,     │
│                         suasana (langit/cahaya/kabut/hujan)      │
│ camera/CameraDirector   5 mode kamera + transisi                 │
│ characters/AgentCharacter  humanoid low-poly + animasi prosedural│
│ buildings/city.ts       kota (InstancedMesh sejak Phase 7)       │
│ buildings/meetingRooms  visual 6 ruang meeting                  │
│ buildings/props.ts      objek world builder                      │
│ navigation/navGraph.ts  graf 11 simpul + BFS                     │
└───────────────────────────────────────────────────────────────────┘
  │  AgentEngine (src/ai) memanggil LLM atas aksi pengguna saja
  ▼
┌─────────────── AI Agent Engine (src/ai) ─────────────────────────┐
│ llm.ts    LlmClient provider-agnostic + adaptor Gemini (REST) +  │
│           SimulationClient (label jelas, bukan AI)               │
│ engine.ts AgentEngine: chat + penugasan otomatis (LLM dulu,      │
│           aturan bila gagal) — error LLM tidak ditelan diam-diam │
│           (pesan fallback menyebut kegagalan)                    │
└───────────────────────────────────────────────────────────────────┘
  │  persistence layer (src/lib/supabase.ts)
  ▼
Supabase (opsional) / localStorage (selalu)
```

## Alur data

- **Store + subscribe** (pola yang sama di keempat store): store memegang
  state, menyimpan ke localStorage di tiap mutasi, dan memberi tahu
  subscriber (React `useEffect` → `setState`). TaskStore juga upsert ke
  Supabase bila env dikonfigurasi. Tidak ada fetch/polling berkala —
  kecuali `endExpired` acara tiap 5 detik dan `onLifeTick` maksimal
  1x/detik.
- **Satu sumber status agent**: `AgentBehavior` memutuskan status +
  lokasi tiap agent (ambient, meeting terjadwal, acara, taskFocus) dan
  mengemisikannya lewat `onStatus` → `liveState` di engine → React
  (`liveStates`) → sidebar, panel detail, HUD, dan analitik. Panel
  Meeting/Acara membaca store-nya sendiri untuk "berlangsung" — jadi
  status "Meeting" spontan di sidebar (meeting ambient) memang TIDAK
  muncul di panel (lihat PHASES.md §6.2).
- **React ↔ Three.js**: `WorldView` membuat engine sekali saat mount dan
  menyimpannya di `worldHandle` (ref). Semua callback engine → React
  melewati ref (supaya tidak dibuat ulang), dan React → engine lewat
  `worldHandle.current` (setTaskFocus, setMeetingAssignment,
  setEventAssignment, setWorldObjects, setCameraMode, selectAgent).
- **LLM**: hanya dipanggil atas aksi pengguna (kirim chat / "Tugaskan
  otomatis"). Engine menentukan mode (`live`/`simulation`) dari ada
  tidaknya key + hasil panggilan; UI menampilkan mode itu apa adanya.

## Pola yang dipakai di mana-mana

- **Fungsi murni + uji logika**: validasi, slot, drift vital, agregasi
  analytics, dan FPS ditulis sebagai fungsi murni dan diuji di
  `scripts/phase*-test.ts` (dijalankan lewat bundle rolldown —
  `npm test` menjalankan semuanya, 145 assertion).
- **Seed demo**: tiap store me-seed satu contoh (7 tugas, 1 meeting
  selesai, 1 acara selesai, 2 objek builder) supaya aplikasi langsung
  hidup saat pertama dibuka; seed hanya muncul bila localStorage kosong
  untuk key itu.
- **Label jujur**: semua yang simulasi (vital, cuaca, mode engine tanpa
  key, PDF via print) diberi label di UI dan didokumentasikan di
  `docs/PHASES.md` — tidak ada yang diklaim sebagai AI atau generator
  bila bukan.

## Performa (Phase 7)

- **Instancing**: pohon (19), marka jalan (~36), dan rumah (10) digambar
  sebagai `InstancedMesh` — 93 draw call lebih sedikit per frame
  (dihitung dari kode; kota statis 167 → 74 draw call). Matriks instansi
  dihitung helper murni yang diuji (`scripts/phase7-test.ts`); bounding
  sphere dihitung eksplisit supaya tidak ter-cull keliru.
- **Pixel ratio** dibatasi maks 2 (`createWorld.ts`); **frustum culling**
  bawaan three.js tidak dimatikan di mana pun; **satu** sumber bayangan
  (matahari, shadow map 2048) — tidak ada lampu bayangan tambahan.
- **Monitor FPS nyata** di HUD: `FpsTracker` (rata-rata delta
  requestAnimationFrame, jendela 120 frame) + `renderer.info.render.calls`,
  dilaporkan ke React maksimal 1x/detik. FPS live tidak diukur di
  lingkungan pengembangan (tanpa GPU/browser) — angka live menjadi
  bagian verifikasi live setelah deploy.
- **Yang sengaja TIDAK di-instance**: karakter agent (beranimasi
  individual, ~10 mesh/agent), bangku taman (hanya 2), objek builder
  (dibangun ulang tiap berubah, jumlah kecil), ruang meeting (6 × 4 mesh).
