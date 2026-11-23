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
- Perbaikan 22 Nov (3.1): klik figur 3D gagal 4/4 di verifikasi live —
  target klik diperbesar (label di atas kepala ikut jadi target raycast +
  silinder klik tak terlihat r 0,6 di sekeliling tubuh); kamera follow
  dinaikkan (offset 5,5/5,0/5,5) supaya tidak terhalang atap rumah;
  pose working/resting/meeting dibuat lebih terbaca dari jauh.
- Perbaikan 22 Nov (3.2): label sprite ternyata TIDAK membawa agentId
  (traverse hanya memberi ke Mesh) sehingga klik label membatalkan pilihan
  — diperbaiki; ambang drag klik dilonggarkan 6→10px; Overview DILEBARKAN
  (posisi awal (14,10,14)→(0,40,75) dari sisi selatan + kabut 55–120→
  90–180) supaya seluruh kota termasuk deret rumah selatan terlihat;
  trade-off: agent terlihat lebih kecil dari tampilan Overview.

## Phase 4 — AI Agent Engine, integrasi model AI, task management
- Engine + integrasi LLM (OpenAI/Anthropic/Gemini — BUTUH keputusan API key
  + biaya dari Bos), task manager lengkap (Kanban, kalender, dependensi),
  tabel + migrasi + seed Supabase.
- Keputusan Bos 23 Nov 04:02: **Gemini (tier gratis Google AI Studio)**.
  Engine provider-agnostic (`src/ai/llm.ts`); adaptor Gemini memanggil
  `generativelanguage.googleapis.com` model `gemini-3.5-flash-lite` (bisa diubah
  via `VITE_GEMINI_MODEL`). Key lewat `VITE_GEMINI_API_KEY` — ikut ke
  bundle publik, WAJIB dibatasi ke referrer Vercel di AI Studio.
- Perbaikan 24 Nov (4.1): model default `gemini-2.5-flash` tidak lagi
  dilayani untuk project AI Studio baru (404 sejak 12 Nov 2026) — default
  diganti `gemini-3.5-flash-lite`; pesan fallback chat/penugasan kini
  menampilkan detail error asli (status HTTP + pesan Google) agar tidak
  lagi menebak-nebak penyebab gagalnya.
- LLM hanya dipanggil atas aksi pengguna (chat / penugasan otomatis) —
  hemat kuota free tier (~15 req/menit). Bila key kosong/gagal: mode
  simulasi lokal yang diberi label jelas, tidak diklaim sebagai AI.
- TaskStore: localStorage selalu + sync Supabase bila dikonfigurasi;
  seed 7 tugas demo (2 doing, 4 todo, 1 done; dependensi task-3→task-2,
  task-6→task-1). Agent dengan tugas 'doing' fokus bekerja di dunia 3D
  (behavior.taskFocus), bukan aktivitas acak.
- UI: TaskBoard Kanban (buat/pindah/hapus/tugaskan otomatis), AgentChat
  per agent (lencana Gemini live / Simulasi lokal), HUD menampilkan mode AI
  + jumlah tugas terbuka. Migrasi `supabase/migrations/20261123_create_tasks.sql`
  (tasks + chat_messages, RLS demo-terbuka; auth/RBAC fase lanjut).
- Belum: kalender tugas (baru deadline di kartu), sinkronisasi chat ke
  Supabase (tabel ada, wiring menyusul), proksi server-side untuk key.

### 4.1 — Detail error asli di fallback + default model 3.5-flash-lite ✅ SELESAI (24 Nov 2026)
- Latar: penyelidikan kegagalan chat Gemini 23 Nov ~22:02 (Tono) —
  balasan SIMULASI setelah ~90 dtk, penyebab tak bisa ditentukan karena
  `src/ai/engine.ts` memakai `catch {` telanjang yang membuang detail
  error. Chat pulih sendiri (gangguan sementara, uji ulang 22:30–22:31
  live ~1 dtk); patch ini BUKAN perbaikan atas insiden itu, melainkan
  agar kegagalan BERIKUTNYA terbaca. Penyebab insiden paling mungkin:
  overload sisi Google (lihat penyelidikan Tono).
- Perubahan (5 file, 2 baru): BARU `src/ai/errorDetail.ts`
  (`formatLlmErrorDetail`, murni — potong 160 karakter, pesan kosong /
  non-Error tetap aman); BARU `scripts/phase41-test.ts` (21 assertion);
  `src/ai/engine.ts` — kedua `catch {` telanjang (chat + penugasan
  otomatis) jadi `catch (err)` dan menyisipkan detail asli ke teks
  fallback; `src/ai/llm.ts` — default model `gemini-2.5-flash` →
  `gemini-3.5-flash-lite`; `docs/PHASES.md` (§4.1).
- Perilaku fallback TIDAK berubah — hanya pesannya: chat tetap berawalan
  `SIMULASI:` + `live: false`; penugasan tetap memakai aturan +
  `live: false`. Yang baru: detail error asli termuat, mis.
  `(Panggilan LLM gagal: Gemini HTTP 429: ...)`.
- Cara membaca kegagalan berikutnya: 429 → kuota free tier habis;
  400/403 → key salah/dicabut; 404 → model tidak tersedia;
  503/timeout → Google/jaringan. Lencana "Gemini live" BUKAN
  pemeriksaan kesehatan — ia hanya berarti key terpasang.
- Catatan jujur: bagian 2 (default model) hanya hygiene/backstop untuk
  deploy tanpa env var — live memakai env var `VITE_GEMINI_MODEL`, jadi
  bagian 2 TIDAK relevan dengan insiden 23 Nov. Timeout/AbortController/
  retry TIDAK masuk patch ini (keputusan desain terpisah). Jalur gagal
  TIDAK bisa diuji live tanpa merusak key/env — verifikasi live hanya
  jalur sukses (chat + penugasan otomatis tetap live).

## Phase 5 — Meeting room, kolaborasi, life simulation ✅ SELESAI (23 Nov 2026)
- 6 ruang meeting (`src/types/meeting.ts` MEETING_ROOMS, dipetakan ke
  kawasan yang sudah ada): Ruang Rapat Utama (Gedung Kantor, kap 10),
  Ruang Sprint (Plaza, kap 8), Ruang Desain (Taman, kap 6), Ruang Data
  (Arena, kap 6), Ruang Kreatif (Panggung, kap 6), Ruang Santai
  (Perumahan Timur, kap 6). Visual 3D (`src/world/buildings/meetingRooms.ts`):
  alas lingkaran + cincin + tiang penanda berlabel nama; alas room yang
  dipakai meeting tampak lebih tegas; penanda room juga tampil di minimap.
- Kolaborasi (`src/ui/MeetingPanel.tsx` + `src/simulation/meetingStore.ts`
  + `src/simulation/meetingLogic.ts`): mulai meeting (pilih room, topik,
  agenda, peserta — validasi murni: topik wajib, min 2 peserta, maks
  kapasitas, room belum dipakai, peserta belum ikut meeting lain),
  whiteboard = catatan bersama per meeting (penulis: Bos atau peserta),
  akhiri meeting, riwayat meeting selesai + hapus riwayat. Tersimpan di
  localStorage (`living-world-meetings-v1`); satu meeting contoh yang sudah
  selesai di-seed (jejak demo, sama seperti seed tugas Phase 4).
- Perilaku meeting (`src/simulation/behavior.ts`): peserta berjalan ke
  room via graf BFS yang sudah ada, lalu jalan lurus ke slotnya di
  lingkaran room (jari-jari 1,3) dan berstatus 'meeting' menghadap pusat
  selama penugasan ada; meeting berakhir → peserta bubar dan kembali ke
  aktivitas ambient. Meeting ambient Phase 3 tidak menarik peserta
  terjadwal (dilewati di findPartner) dan peserta terjadwal tidak memicu
  aktivitas acak. Bila meeting berakhir saat peserta masih berjalan ke
  room, ia kembali ke kedatangan biasa.
- Life simulation (`src/simulation/lifeSim.ts`): vital per agent —
  energi/fokus/mood (0–100, mulai 85/80/78) — drift per jam simulasi
  mengikuti status (bekerja/meeting menguras, istirahat memulihkan,
  celebrating menaikkan mood, energi < 25 menekan mood) + pengaruh cuaca
  (hujan −0,5 mood/jam). Jam harian: 1 hari simulasi = 10 menit nyata,
  mulai 08:00; periode Pagi (05–11), Siang (11–15), Sore (15–18), Malam
  (18–05). Cuaca bergilir (cerah 60% / berawan 25% / hujan 15%), berganti
  tiap 2–6 jam simulasi. Vital + jam + cuaca tersimpan di localStorage
  (`living-world-life-v1`) dan dipulihkan saat muat ulang.
- Suasana 3D (`src/world/engine/createWorld.ts`): warna langit/kabut,
  intensitas + warna matahari dan cahaya ambient merapat halus ke target
  tiap periode hari + cuaca (malam gelap, sore hangat, hujan kelabu +
  kabut rapat); hujan divisualkan 500 titik jatuh yang berputar di atas
  kota (murah, tanpa tekstur). HUD menampilkan jam + periode + cuaca;
  panel detail agent menampilkan bar vital (diberi label "Vital simulasi").
  Semua angka vital/jam/cuaca adalah ATURAN SIMULASI dunia, bukan jawaban
  model AI — tidak ada klaim AI di fitur ini.
- Catatan jujur: posisi berdiri peserta dihitung dari urutan peserta
  (bukan kursi tetap); bila meeting dimulai saat peserta sudah berada di
  simpul room, ia langsung jalan lurus ke slot. Animasi duduk khusus
  meeting belum ada (pose meeting = gestur bicara Phase 3).
- Belum: sync meeting ke Supabase (tabel belum ada — butuh migrasi baru
  bila diputuskan), jadwal meeting ke depan (baru mulai langsung),
  pengingat/undangan meeting, pengaruh vital ke kecepatan/kinerja agent
  (saat ini vital hanya tampil + memengaruhi mood), siklus musim.

## Phase 6 — Olahraga, hiburan, world builder, analytics ✅ SELESAI (23 Nov 2026)
- Olahraga & hiburan (`src/types/event.ts`, `src/simulation/eventStore.ts`,
  `src/simulation/eventLogic.ts`, `src/ui/EventsPanel.tsx`): dua jenis
  acara yang dipicu Bos dari panel "Acara" — "Pertandingan persahabatan"
  (Arena, maks 8 peserta, status `sports`) dan "Pertunjukan" (depan
  Panggung, maks 10 peserta, status `entertainment`). Durasi dipilih
  60/180/300 detik nyata; acara berakhir otomatis saat durasi habis
  (dicek tiap 5 detik) atau manual lewat "Akhiri acara"; riwayat selesai +
  hapus riwayat. Validasi murni: judul wajib, min 2 peserta, maks
  kapasitas, lokasi belum dipakai acara lain, peserta belum ikut meeting
  atau acara lain — meeting dan acara saling mengunci peserta
  (`validateStartMeeting` menerima daftar acara aktif sebagai param
  opsional ke-6). Tersimpan di localStorage (`living-world-events-v1`);
  satu acara contoh yang sudah selesai di-seed (jejak demo, sama seperti
  seed meeting). Lokasi acara aktif ditandai cincin berwarna di tanah
  (hijau Arena, pink Panggung).
- Perilaku acara (`src/simulation/behavior.ts`): peserta berjalan ke
  lokasi via graf BFS yang sudah ada, lalu jalan lurus ke slotnya
  (pertandingan: lingkaran r 3,5 di pusat Arena; pertunjukan: busur r 3
  di depan Panggung) dan berstatus 'sports'/'entertainment' menghadap
  pusat selama penugasan ada; acara berakhir → peserta bubar. Meeting
  ambient Phase 3 tidak menarik peserta acara terjadwal. Aktivitas
  ambient: agent yang tujuan acaknya Arena/Panggung berkesempatan 30%
  berolahraga / menikmati hiburan saat tiba (8–14 detik), lalu kembali
  ke aktivitas ambient. Status baru di `src/types/agent.ts`: `sports`
  ("Olahraga", #16a34a) dan `entertainment` ("Hiburan", #db2777);
  tampil di sidebar + HUD sama seperti status lain.
- Animasi (`src/world/characters/AgentCharacter.ts`): pose olahraga =
  jumping-jack prosedural (lengan/kaki bergantian + lompatan kecil,
  t*6); pose hiburan = goyangan dansa lembut (badan/kepala bergoyang,
  t*2,5). Keduanya variasi dari pose prosedural Phase 3, tanpa aset baru.
- Vital (`src/simulation/lifeSim.ts`): olahraga menguras energi (−2/jam)
  dan sedikit fokus (−1/jam) tapi menaikkan mood (+2/jam); hiburan
  menguras sedikit energi/fokus (−1/jam) dan menaikkan mood lebih besar
  (+2,5/jam). Aturan simulasi, bukan jawaban model AI.
- World builder (`src/types/worldObject.ts`,
  `src/simulation/worldObjectStore.ts`, `src/simulation/builderLogic.ts`,
  `src/world/buildings/props.ts`, `src/ui/BuilderPanel.tsx`): katalog 4
  objek dari primitif Three.js — pohon, bangku taman, lampu taman
  (tiang + bola cahaya hangat + kap), air mancur (kolam + cakram air +
  kolom + bola atas). Penempatan = klik tanah di kanvas 3D saat mode
  bangun aktif (panel "Builder" → pilih jenis → klik tanah; mode bangun
  mencegat klik agar tidak memilih agent; ambang drag 10px yang sama
  dipakai). Validasi murni: batas ±40, tidak di dalam gedung (margin 1),
  jarak antar objek min 1,5. Bangku otomatis menghadap pusat plaza.
  Pindah = tombol "Pindah" lalu klik tanah tujuan; hapus per baris.
  Objek tersimpan di localStorage (`living-world-objects-v1`; seed:
  bangku di (8,8) + lampu di (−8,8)) dan tampil di dunia 3D + minimap
  (titik warna katalog).
- Analytics (`src/simulation/analytics.ts`, `src/ui/AnalyticsPanel.tsx`):
  panel "Analitik" menghitung statistik NYATA dari state aplikasi
  (bukan angka karangan): tugas per status + % selesai + terlambat +
  pemegang terbanyak, meeting (jumlah, total + rata-rata durasi, peserta
  tersering, catatan), acara (jumlah, pertandingan/pertunjukan,
  aktif/selesai), distribusi aktivitas agent saat ini + lokasi tersering,
  rata-rata vital + energi terendah, jam/periode/cuaca, objek builder per
  jenis. Tampil sebagai angka + bar CSS (tanpa library chart).
  Export CSV = unduh `living-world-analytics.csv` (header
  `Bagian,Metrik,Nilai`). Export PDF = tombol "Cetak / Simpan PDF" yang
  memanggil `window.print()` dengan CSS print yang hanya menampilkan
  panel analytics — ini JALUR PRINT BROWSER, bukan generator PDF, dan
  didokumentasikan apa adanya di sini.
- Catatan jujur: posisi berdiri peserta acara dihitung dari urutan
  peserta (bukan tempat tetap); acara hanya mulai langsung (belum ada
  jadwal ke depan); vital memengaruhi mood saja, belum kecepatan/kinerja
  agent; animasi olahraga/hiburan prosedural sederhana; PDF hanya via
  print browser.
- Belum: sync acara + objek builder ke Supabase (tabel belum ada — butuh
  migrasi baru bila diputuskan), jadwal acara ke depan, generator PDF
  sesungguhnya, pengaruh vital ke kecepatan/kinerja agent.

## Perbaikan 6.1 — durasi acara, gelembung chat, status lokasi ✅ SELESAI (23 Nov 2026)
Perbaikan kecil atas temuan verifikasi live Phase 6 (23 Nov 10:39, deploy
a073ea5). Tiga butir:
1. **Durasi acara vs kecepatan jalan (cacat nyata, diperbaiki).** Live:
   acara "Pertunjukan" 3 menit — Kai dan Leo baru mencapai status
   "Hiburan" sekitar menit ke-2:45, Luna tidak pernah tiba sebelum acara
   berakhir otomatis. Penyebab: hitung mundur durasi berjalan sejak acara
   dimulai, sementara peserta berjalan 2,2 unit/dtk dari posisi mana pun
   di kota. Perbaikan: hitung mundur dimulai saat SEMUA peserta tiba di
   slot (`CityEvent.gatheredAt`, diisi `EventStore.markGathered` saat App
   mendeteksi status live semua peserta = status acara), jadi peserta
   mendapat durasi PENUH untuk beraktivitas. Bila ada peserta yang tak
   kunjung tiba, hitung mundur tetap dimulai setelah masa tenggang
   90 detik (`EVENT_ARRIVAL_GRACE_SECONDS`) supaya acara tidak menggantung
   selamanya — 90 dtk dipilih dari batas atas waktu tempuh: rute BFS
   terjauh antar simpul ~48 unit (~22 dtk) ditambah sisa perjalanan yang
   sedang ditempuh saat acara dimulai (~20 dtk), total terburuk ~45 dtk,
   jadi 90 dtk memberi margin 2× (diuji di `scripts/phase61-test.ts`).
   Kecepatan jalan global TIDAK diubah. UI panel Acara menampilkan
   "Menunggu peserta tiba (n/total)" selama berkumpul dan waktu berakhir
   setelah berkumpul penuh. Acara lama (sebelum 6.1) tanpa `gatheredAt`
   diperlakukan sebagai belum berkumpul.
2. **Gelembung chat memotong balasan panjang (cacat nyata, diperbaiki).**
   Dua penyebab: (a) `AgentChat` memanggil `scrollTo` langsung setelah
   `setMessages` — DOM belum dirender sehingga tingginya masih tinggi
   lama dan balasan panjang terpotong di bawah lipatan; kini gulir
   dilakukan lewat `useEffect` setelah daftar pesan dirender. (b) CSS:
   `.chat-messages` kini `min-height: 0` supaya area pesan bisa mengecil
   di dalam panel yang dibatasi `max-height: 70%` dan `overflow-y: auto`
   benar-benar bekerja; `.chat-msg p` memakai `overflow-wrap: break-word`
   (token panjang dibungkus di dalam gelembung) + `white-space: pre-wrap`
   (jeda baris balasan dipertahankan); `.chat-panel` memakai
   `overflow: hidden` supaya isi terpotong rapi di sudut panel.
3. **Status lokasi vs peserta (diselidiki — TIDAK ada cacat, tidak diubah).**
   Live: agent BUKAN peserta menampilkan "Olahraga" saat lewat dekat
   Arena, "Hiburan" dekat Panggung, "Meeting" di ruang meeting, dan status
   itu bertahan setelah acara berakhir. Hasil penyelidikan kode: (a)
   status peserta acara DIBERSIHKAN dengan benar — `setEvent(null)`
   menyetel `dwellUntil = 0` bila statusnya sports/entertainment sehingga
   agent bubar pada tick berikut; bila masih berjalan ke slot, kedatangan
   jatuh ke `arrive()` biasa; penugasan dicabut App saat state acara
   berubah (termasuk `endExpired` tiap 5 detik). (b) Status non-peserta
   berasal dari jalur ambient yang MEMANG dirancang: 30% tujuan acak ke
   Arena/Panggung menjadi olahraga/hiburan 8–14 detik (`behavior.ts`
   pendingActivity), dan meeting ambient Phase 3 (dua agent diam yang
   berdekatan menjadi meeting 6–10 detik). Jadi temuan live itu perilaku
   yang dirancang, BUKAN cacat — didokumentasikan di sini supaya tidak
   dilaporkan lagi sebagai cacat.
- Di luar lingkup (tidak disentuh): export CSV dan Cetak/PDF — keduanya
  tidak terverifikasi di live 6.0 karena keterbatasan alat pemeriksa,
  tanpa bukti cacat aplikasi; kode CSV tercakup uji logika Phase 6.
- Verifikasi: `npm run build` lulus (dist `index-BgqxJ4fW.js`, 891,92 kB),
  dev + preview HTTP 200, uji logika baru `scripts/phase61-test.ts`
  25/25 lulus, regresi Phase 6 49/49 lulus (satu assertion lama diubah
  mengikuti semantik baru + satu ditambah), regresi Phase 5 33/33 lulus.

## Penyelidikan 6.2 — status "Meeting" yang menetap ✅ SELESAI (23 Nov 2026)
- Temuan live 6.1 (23 Nov 13.33–13.42, deploy eaa19c0): Kai dan Zoe
  (kadang juga Nova/Leo/Finn) berstatus "Meeting" di sidebar selama
  ~9 menit, padahal panel Meeting menunjukkan "0 berlangsung" dan
  keenam ruang "Kosong". Status muncul setelah acara "Pertunjukan"
  berakhir. Meeting uji pemeriksa sendiri (Aria+Kai, Ruang Sprint,
  13.34) menjelaskan status Kai selama meeting itu, tapi bukan status
  Zoe — dan status sudah muncul sejak 13.33, sebelum meeting uji
  dimulai.
- KESIMPULAN: BUKAN cacat — tidak ada perubahan perilaku aplikasi.
  Status yang tertinggal (stale) TIDAK terbukti; yang terbukti adalah
  meeting ambient yang berulang. Bukti:
  1. Simulasi ambient murni (10 agent, 600 dtk simulasi, 5 seed):
     fraksi waktu 'meeting' per agent 9–24%, run 'meeting' kontinu
     terpanjang yang terlihat di UI 18–26 dtk, re-pair langsung
     (berpasangan lagi tanpa status 'moving' di antaranya) 4–10x per
     simulasi. Pada cuplikan tiap 30 dtk, 0–6 agent berstatus Meeting —
     jadi pemeriksa yang melirik sidebar beberapa kali dalam 9 menit
     sangat mungkin melihat Kai/Zoe (dan kadang Nova/Leo/Finn)
     berstatus Meeting di tiap lirikan, padahal tiap meeting
     individual hanya 6–10 dtk. Rantai re-pair tidak bisa mencapai
     9 menit: tiap tautan butuh tujuan acak = simpul sendiri (1/11)
     dan run terpanjang di 8 simulasi tidak pernah melewati ~26 dtk.
  2. Replay rangkaian live (acara Pertunjukan -> bubar -> meeting
     terjadwal Aria+Kai -> bubar -> ambient 420 dtk, seed 7): run
     'meeting' terpanjang 39,8 dtk (Kai — termasuk masa duduk di
     meeting terjadwal), fraksi meeting 12–20% per agent.
  3. Ambient + taskFocus (tiruan sesi live: 3 agent memegang tugas
     'doing', diam 8–12 dtk di simpul sehingga lebih sering jadi
     pasangan): run terpanjang 24,1 dtk, fraksi meeting 9–20%.
  4. Skenario pembersihan status (semua lulus di
     `scripts/phase62-test.ts`): B1 meeting berakhir saat peserta
     berjalan; B2 meeting berakhir saat peserta di slot (bubar <=2
     dtk); B3 acara berakhir saat peserta di slot; B4 pasangan ambient
     ditarik sepihak (pasangan langsung 'idle'); B5 meeting berakhir
     saat peserta dekat room. Tidak ada jalur yang membuat status
     'meeting' tertinggal — `setMeeting(null)`/`setEvent(null)`
     menyetel `dwellUntil = 0`, penugasan dicabut App saat state
     berubah, dan `releasePartner` membebaskan pasangan secara sinkron.
- Wart yang didokumentasikan (bukan cacat, perilaku tidak diubah):
  setelah acara berakhir, peserta bisa LANGSUNG kembali berstatus sama
  secara ambient tanpa transisi terlihat. Mekanisme yang terbukti
  (debug seed 23, Rex): peserta berangkat (depart) lalu tujuan acaknya
  sama dengan simpulnya sendiri (1/11) sehingga langsung "tiba" lagi
  dan 30% mendapat pendingActivity — tanpa pernah mengemisikan
  'moving'. Rex: 'entertainment' sejak t=47,6; acara dicabut t=55,6;
  t=55,7 kembali 'entertainment' (ambient); baru t=67,7 berangkat.
  Status yang tampil tetap jujur (agent memang menghibur secara
  ambient) dan dwell ambient dibatasi 8–14 dtk, tapi berakhirnya acara
  tidak terlihat di sidebar pada kasus ini (~2,7% per peserta per
  akhir acara). Analog untuk meeting: re-pair langsung dengan
  ex-pasangan (diukur 4–10x per 600 dtk simulasi). Bila Bos ingin
  transisi akhir acara/meeting SELALU terlihat, itu keputusan UX
  terpisah (mis. label terjadwal vs spontan di sidebar) — bukan
  perbaikan cacat.
- Tidak ada perubahan kode aplikasi pada 6.2 — hanya uji baru
  `scripts/phase62-test.ts` (20 assertion) + dokumentasi ini. Uji ini
  mengunci temuan sebagai regresi: run 'meeting' kontinu tidak boleh
  melewati 60 dtk.
- Verifikasi: `npm run build` lulus (dist `index-BgqxJ4fW.js` — identik
  dengan 6.1 karena tidak ada perubahan `src/`), dev + preview HTTP
  200, uji logika baru `scripts/phase62-test.ts` 20/20 lulus, regresi
  Phase 6.1 25/25, Phase 6 49/49, Phase 5 33/33 lulus.

## Phase 7 — Optimasi, pengujian, dokumentasi ✅ SELESAI (23 Nov 2026)
Fase terakhir. Tidak ada fitur baru — hanya membuat aplikasi yang sudah
ada lebih cepat, teruji, dan terdokumentasi. Tampilan, warna, dan perilaku
agent TIDAK berubah.

### Optimasi performa (nyata, terukur dari kode)
- **Monitor FPS nyata di HUD** (`src/simulation/fps.ts` + `createWorld.ts`
  + `Hud.tsx`): `FpsTracker` menghitung FPS dari rata-rata delta
  `requestAnimationFrame` (jendela 120 frame terakhir, delta 0 / >=1000 ms
  diabaikan supaya jeda tab tidak merusak rata-rata) dan melaporkannya ke
  React maksimal 1x/detik bersama `renderer.info.render.calls` (jumlah
  draw call frame terakhir). HUD menampilkan mis. "60 FPS · 291 draw"
  (koreksi 7.1: angka draw = main pass 192 + shadow pass 99;
  contoh "182" di versi awal dokumen ini SALAH — itu hitungan main-pass
  saja dan kurang hitung; lihat §7.1).
  Angka FPS-nya nyata dari perangkat yang membuka aplikasi — bukan
  karangan. FPS live di perangkat Bos/penguji TIDAK bisa diukur dari
  lingkungan pengembangan (tanpa GPU/browser) — menjadi bagian verifikasi
  live setelah deploy.
- **Instancing** (`src/world/buildings/city.ts`): pohon (19), marka jalan
  (~36), dan rumah (10) yang tadinya puluhan `Mesh` individual kini
  `InstancedMesh` — satu draw call per geometri/material. Matriks instansi
  dihitung helper murni yang diuji elemen per elemen di
  `scripts/phase7-test.ts` (posisi/rotasi/skala sama persis seperti Mesh
  aslinya); `computeBoundingSphere()` dipanggil eksplisit supaya mesh
  tidak ter-cull keliru. Hitungan draw call (dihitung dari kode, bukan
  diukur live — KOREKSI 7.1: angka di versi awal dokumen ini SALAH):
  main pass 192 (bukan 182 — menara kantor 1 Mesh × 6 grup material =
  6 draw call, agent 106 bukan ~100) + shadow pass 99 = total 291
  (live: 289, selisih 2 = variasi keadaan live). Pra-instancing total
  415 (main 285 + shadow 130) → 291 (−124, −30%). Detail + bukti
  lengkap di §7.1 di bawah. Angka live (HUD "draw") menjadi bagian
  verifikasi live setelah deploy.
- **Sudah ada sejak dulu, diverifikasi tetap berlaku (tidak diubah)**:
  pixel ratio dibatasi maks 2 (`createWorld.ts` — layar rapat 3x tidak
  memaksa renderer bekerja 3x lipat); frustum culling bawaan three.js
  tidak dimatikan di mana pun (tidak ada `frustumCulled = false` di
  `src/`); hanya satu sumber bayangan (matahari, shadow map 2048) —
  tidak ada lampu bayangan baru.
- **Sengaja TIDAK di-instance** (didokumentasikan alasannya): karakter
  agent (beranimasi individual — kaki/lengan/kepala bergerak sendiri);
  bangku taman (hanya 2 buah, hematnya 6 draw call tidak sebanding
  dengan kerumitan matriks); objek world builder (dibangun ulang tiap
  berubah, jumlah kecil); ruang meeting (6 × 4 mesh).
- **Bundle**: `index-BL8yDAkx.js` 896,28 kB (sebelumnya `index-BgqxJ4fW.js`
  891,92 kB — naik 4,36 kB / +0,49%, dari kode FpsTracker + instancing +
  HUD; CSS identik `index-CoVDNUU5.css` 12,21 kB).

### Pengujian (konsolidasi)
- **Satu perintah uji gabungan**: `npm test` (= `bash
  scripts/run-all-tests.sh`) menjalankan SEMUA suite logika lewat bundle
  rolldown dan melaporkan total — **161 lulus, 0 gagal** (Phase 5: 33,
  Phase 6: 49, Phase 6.1: 25, Phase 6.2: 20, Phase 7: 18, 7.1: 16).
  Semua suite lama lulus TANPA mengubah assertion lama.
- **Uji baru** `scripts/phase7-test.ts` (18 assertion): FpsTracker
  (tanpa data → 0; delta tetap 16,67 ms → 60 FPS; 33,33 ms → 30;
  campuran → 40; jeda panjang + delta 0 diabaikan; jendela dibatasi 120
  sampel) + matriks instancing (batang/tajuk pohon, marka jalan, badan/
  atap/pintu rumah — posisi, rotasi, skala).
- Catatan yang tetap berlaku: `node scripts/*-test.ts` langsung gagal
  (`ERR_MODULE_NOT_FOUND`) karena import tanpa ekstensi gaya Vite tidak
  bisa di-resolve Node ESM — bukan cacat; jalankan lewat bundle rolldown
  (lihat `docs/SETUP.md`).

### Dokumentasi (lengkap)
- `README.md` ditulis ulang sebagai dokumen final: fitur per fase,
  stack, cara menjalankan, struktur proyek, tabel env, deploy.
- `docs/SETUP.md` diperbarui: langkah Gemini (buat key, pasang di
  Vercel, batasi referrer — butuh 2SV) + Supabase opsional (migrasi
  tasks) + troubleshooting yang sudah diketahui (model 2.5 tidak
  tersedia untuk project baru; format key `AQ.`; Cloud Console diblokir
  tanpa 2SV; dev bind IPv6; klik figur yang berjalan).
- `docs/ARCHITECTURE.md` (baru): lapisan (UI → simulation engine →
  world engine → AI engine → persistence), alur data (store + subscribe,
  satu sumber status agent, jembatan React–Three.js), pola (fungsi murni
  + uji, seed demo, label jujur), dan catatan performa.
- `.env.example`: nilai `VITE_GEMINI_MODEL` diubah ke
  `gemini-3.5-flash-lite` + komentar peringatan model 2.5. Semua env
  yang dipakai kode (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`) ada di sana.
- Verifikasi: `npm run build` lulus, dev + preview HTTP 200, `npm test`
  161/161 lulus (145 saat Phase 7 + 16 dari 7.1), `npm run lint` 0 error.

## Penyelidikan 7.1 — angka draw call live 289 vs hitungan "182" ✅ SELESAI (23 Nov 2026)
- Temuan live Phase 7 (~15:55, deploy 1c1598f): HUD "3 FPS · 289 draw"
  (lalu "4 FPS · 289 draw") vs ekspektasi "60 FPS · 182 draw". FPS 3–4
  artefak browser pemeriksa (software rendering tanpa GPU; Antigravity
  60 FPS di mesinnya) — BUKAN objek penyelidikan.
- KESIMPULAN: angka HUD BENAR; yang salah adalah hitungan "182" Phase 7.
  Tidak ada perubahan kode aplikasi (instancing bekerja) — hanya koreksi
  klaim + uji baru yang mengunci hitungan yang benar.
- Akar masalah — dua kesalahan hitung yang menumpuk:
  1. **Shadow pass dilupakan.** `renderer.info.render.calls` (three.js
     0.187) menghitung SEMUA draw call dalam satu `render()`: `info.reset()`
     berjalan SEBELUM `shadowMap.render()`, dan tiap `renderBufferDirect`
     — termasuk tiap grup material di shadow pass — menaikkan
     `render.calls`. Jadi HUD = main pass + shadow pass. Shadow pass =
     99 draw call (kota 30, ruang meeting 6, builder 3, agent 60).
     Bukti: sumber three.js (`WebGLRenderer.render`,
     `WebGLShadowMap.renderObject`, `WebGLInfo.update`) + hitung ulang
     scene graph di `scripts/phase71-test.ts`.
  2. **Main pass kurang hitung.** Main pass yang benar = 192, bukan 182:
     menara kantor dihitung 1 padahal 1 Mesh × 6 grup material = 6 draw
     call; agent ~100 padahal 106 (4 agent gaya rambut 1 mesh = 10 draw
     call/agent, 6 agent gaya 2 mesh = 11). Hitungan "74" direproduksi
     persis (kota naive 47 + room 24 + tanah/grid/plaza 3) — sumber
     kesalahannya terlacak.
- Hitung ulang yang benar (Overview (0,40,75), aspek 16:9, agent di
  posisi awal, cerah, tanpa seleksi/acara):
  - Main 192 = tanah/grid/plaza 3 + kota 52 + ruang meeting 24 +
    builder 7 + agent 106. Sudut kamera hampir tidak berpengaruh (0
    ter-cull pada aspek ≥1,2; 1 ter-cull pada aspek 1,0).
  - Shadow 99 = kota 30 + meeting 6 + builder 3 + agent 60 (hanya 4
    caster kota di luar frustum bayangan: 4 batu tepi).
  - Total 291 vs live 289 — selisih 2 (0,7%) = variasi keadaan live
    (aspek jendela pemeriksa, posisi agent saat itu; Monte Carlo
    20 seed posisi agent acak: 261–291).
- Penghematan instancing yang BENAR: main 285 → 192 (−93, −33%);
  shadow 130 → 99 (−31, −24% — lebih kecil karena bounding sphere
  InstancedMesh mencakup semua instansi, sehingga pohon tepi yang dulu
  ter-cull sendiri di shadow pass kini ikut ter-render); TOTAL 415 →
  291 (−124, −30%). Klaim lama "−34%" dikoreksi menjadi "−30%".
- Instancing TERBUKTI bekerja: kota main pass 52 vs 145 pra-instancing;
  bundle live mengandung "InstancedMesh".
- Tidak ada perubahan `src/` pada 7.1 — hanya `docs/PHASES.md`,
  `docs/ARCHITECTURE.md`, `scripts/phase71-test.ts` (16 assertion) +
  `scripts/run-all-tests.sh` (tambah suite 7.1). Bundle tetap
  `index-BL8yDAkx.js` (identik Phase 7).
- Verifikasi: `npm run build` lulus (dist identik Phase 7), dev +
  preview HTTP 200, `scripts/phase71-test.ts` 16/16 lulus, `npm test`
  161/161 lulus.

## Penyelidikan 7.2 — toast "Kyber Agent — Bekerja…" menutupi tombol Meeting ✅ SELESAI (23 Nov 2026)
- Temuan live Phase 7 (16:11, deploy 1c1598f): toast bertuliskan
  "Kyber Agent — Bekerja…" muncul di tengah atas layar dan menutupi
  tombol Meeting di header; tombol X-nya tidak menghilangkannya —
  toast tetap tampil sampai akhir sesi verifikasi.
- KESIMPULAN: toast itu BUKAN dari aplikasi ini. Tidak ada cacat UI
  di kode aplikasi — tidak ada yang perlu (dan tidak ada yang bisa)
  diperbaiki di repo ini.
- Bukti (diperiksa dari source, bukan asumsi):
  1. String "Kyber Agent" TIDAK ADA di mana pun di `src/`,
     `index.html`, maupun `dist/` sebagai teks UI — yang ada hanya
     URL/repo (`kyber-agent-living-world…`, `kyber-labs/…`) di dokumen.
     Satu-satunya "Bekerja" di `src/` adalah label status agent
     (`src/types/agent.ts`: `working: 'Bekerja'`), bukan toast.
  2. Aplikasi TIDAK PUNYA komponen toast/notifikasi sama sekali
     (grep `toast|banner|notif|popup` di `src/` hanya menemukan
     `.build-banner` — lihat poin 3).
  3. Satu-satunya overlay tengah-atas di aplikasi adalah `.build-banner`
     (`src/App.tsx`, `src/index.css`): teksnya "Mode bangun — klik tanah
     untuk menempatkan", HANYA tampil saat mode bangun aktif, dan
     TIDAK PUNYA tombol X. Bukan toast yang dilaporkan.
  4. "Kyber Agent" adalah nama asisten itu sendiri, dan "Bekerja…"
     adalah status kerja — persis indikator status tugas browser
     (Chrome extension) yang sedang menjalankan sesi verifikasi live.
     Indikator itu tampil selama tugas browser berjalan ("sampai
     akhir" sesi) dan tombol X-nya milik harness, bukan halaman —
     karena itu klik X tidak menghilangkannya dan tidak ada kode
     aplikasi yang mengendalikannya.
- Akibatnya: tidak ada perubahan `src/` pada 7.2 — hanya bagian ini
  di `docs/PHASES.md`. Mengubah posisi header/z-index aplikasi tidak
  akan menggerakkan overlay harness dan hanya merusak layout untuk
  semua pengguna demi artefak yang hanya muncul saat sesi verifikasi
  live oleh agent — karena itu sengaja TIDAK dilakukan.
- Panduan untuk verifikasi live berikutnya: abaikan overlay status
  agent ("Kyber Agent — Bekerja…") saat menilai UI — ia bukan bagian
  dari aplikasi dan tidak akan pernah terlihat oleh Bos saat membuka
  situs sendiri di browser biasa. Bila overlay itu menutupi tombol
  yang sedang diuji, geser/zoom tampilan atau uji tombol itu dari
  sudut lain; JANGAN dilaporkan lagi sebagai cacat aplikasi kecuali
  teks/komponen yang sama terbukti berasal dari `src/`.
- Uji logika: TIDAK ADA — tidak ada logika murni yang bisa diuji
  (elemennya tidak ada di aplikasi; ketiadaannya dibuktikan lewat
  grep source, bukan lewat uji unit — uji palsu tidak dibuat).
- Verifikasi: `npm run build` lulus (dist identik Phase 7), dev +
  preview HTTP 200, `npm test` 161/161 lulus (tidak berubah).

## Phase 8.1 — Layout baru + feed aktivitas ✅ SELESAI (23 Nov 2026)
- Latar: proyek 7 fase + 7.1 + 7.2 tuntas live (commit 9a6d2a6). Bos
  ingin tampilan seperti artifact "Kampus Nailong" yang ia lihat di
  screenshot — tetapi artifact itu TIDAK bisa diakses dari sisi Muse
  (browser perangkat: muse.ai diblokir ekstensi, ERR_BLOCKED_BY_CLIENT;
  cloud browser: diblokir kebijakan organisasi; Bos sendiri mendapat
  "Ruang belum tersedia"). Keputusan Bos 23 Nov 16:42: lanjut dari
  screenshot saja. Keputusan Bos 23 Nov 16:43: mulai 8.1 dulu (layout
  + feed); 8.2 (dunia lebih kaya) dan 8.3 (Builder 21 item) menyusul.
- Isi 8.1 (hanya ini):
  - Sidebar navigasi baru (`src/ui/Sidebar.tsx`): rel sempit 72px di
    kiri dengan 9 item — Dunia, Agent, Tugas, Rapat, Acara, Bangun,
    Analitik, Aktivitas, Atur. Acara adalah item ke-9 TAMBAHAN (tidak
    ada di screenshot acuan yang hanya punya 8) supaya fitur Phase 6
    tetap bisa dibuka — tanpanya Acara tidak punya jalan masuk dan
    fitur lama hilang. Bagian aktif ditandai indigo tema aplikasi
    (#6366F1), bukan hijau (hijau itu tema artifact lain). Ikon inline
    SVG, tanpa emoji. Item Tugas membawa lencana jumlah tugas terbuka.
    Setiap item membuka sesuatu yang berfungsi — tanpa tombol dekoratif.
  - Header baru: judul + lencana "LIVE" (titik hijau) + hitungan
    "X aktif · Y berjalan" + jam dinding WIB nyata (HH:MM:SS, berdetak
    tiap detik via `Intl.DateTimeFormat` zona Asia/Jakarta) + tombol
    Reset kamera (dipertahankan). "LIVE" di sini berarti aplikasi
    berjalan live — BUKAN berarti agent mengeksekusi pekerjaan nyata
    (agent tetap simulasi; lihat definisi di bawah).
  - Feed aktivitas (`src/simulation/activityStore.ts`,
    `src/ui/ActivityPanel.tsx`, `src/ui/ActivityToast.tsx`): store
    pola TaskStore (localStorage `living-world-activity-v1`, maks 50
    entri, terbaru di atas). Yang dicatat HANYA kejadian bermakna:
    tugas dibuat/ditugaskan otomatis/selesai, meeting dimulai/diakhiri,
    acara dimulai/diakhiri (termasuk berakhir otomatis), objek builder
    ditempatkan/dihapus. Perubahan status ambient SENGAJA tidak
    dicatat — status berubah tiap detik dan feed akan banjir (pelajaran
    dari noise meeting ambient 6.2). Toast aktivitas terbaru tampil di
    KIRI BAWAH (bukan tengah atas — pelajaran 7.2), hilang sendiri
    ~5 detik, tombol X benar-benar menutupnya, dan toast yang ditutup
    tidak muncul lagi tanpa aktivitas baru. Toast tidak tampil saat
    panel chat terbuka (keduanya di kiri bawah — supaya tidak saling
    menutupi).
  - Panel Atur (`src/ui/SettingsPanel.tsx`): toggle label nama agent
    di 3D (via `WorldHandle.setLabelsVisible` → `AgentCharacter.
    setLabelVisible`) dan toggle minimap — keduanya benar-benar
    berfungsi; blok "Tentang" (versi, nama provider/model LLM aktif
    dari engine, status database).
  - Badge header "Phase 8.1 — Layout & Feed", HUD "Fase 8.1/7 —
    Layout & Feed" (tetap "/7": ini redesain pasca-7-fase, bukan fase
    8 dari 7). Semua isi HUD lama dipertahankan (FPS/draw call nyata,
    jam simulasi + cuaca, AI: Gemini live, Database).
  - Dunia 3D, kamera, minimap, logika behavior/task/meeting/event,
    dan `src/ai/*` TIDAK diubah (kecuali penambahan API
    `setLabelsVisible` yang tidak mengubah perilaku default).
- Definisi hitungan header (`countAgentActivity`): "aktif" = status
  agent BUKAN idle (bekerja, meeting, berpindah, berpikir, olahraga,
  hiburan, dsb.); "berjalan" = status moving. Agent tanpa status live
  dihitung menganggur.
- Definisi label "LIVE": aplikasi berjalan live di browser (bukan
  simulasi statis). BUKAN klaim eksekusi pekerjaan nyata — agent
  Living World tidak punya akses alat/file/layanan di luar aplikasi,
  dan tidak menghasilkan artefak nyata. "Mode eksekusi nyata" di
  screenshot acuan tidak terverifikasi dan TIDAK dibangun di sini.
- Uji logika baru `scripts/phase81-test.ts`: ActivityStore (mulai
  kosong, urutan terbaru di atas, batas 50, persist, hapus, langganan,
  storage rusak, id unik saat tambah cepat), formatWib (16:43:25,
  tengah malam 00:00:00 — bukan 24:00:00, nol di depan), definisi
  hitungan aktif/berjalan. Toast/sidebar/toggle TIDAK diuji di level
  logika (perilaku DOM) — verifikasi live oleh parent setelah deploy.
- Verifikasi: `npm run build` lulus (dist `index-D5lFiOLC.js`, 905.207
  byte; CSS `index-4NrvJihf.css`, 15.119 byte — naik dari Phase 7 karena
  kode + gaya baru), dev (5199) + preview (5198) HTTP 200 termasuk aset
  JS, `npm test` TOTAL 185 lulus, 0 gagal (Phase 5: 33, Phase 6: 49,
  Phase 6.1: 25, Phase 6.2: 20, Phase 7: 18, 7.1: 16, 8.1: 24), lint 0
  error (5 warning pola lama: akses ref saat render di App.tsx — pola
  lazy-init store sejak Phase 4, ditambah 1 yang sama untuk
  ActivityStore). Catatan jujur: 3 kegagalan uji awal ternyata ekspektasi
  UJI yang salah (locale id-ID memisahkan jam dengan titik "16.43.25";
  formatWib diperbaiki memakai formatToParts supaya "16:43:25" sesuai
  spesifikasi) — bukan cacat aplikasi.

### 8.1.1 — Perbaikan tampilan (tombol "Mulai meeting" + panel menutupi pill kamera)
- Asal: verifikasi live Phase 8.1 (23 Nov 17:08, deploy fa8496f) menemukan
  dua cacat tampilan kecil. Dieksekusi 23 Nov 17:11 atas ketukan Bos.
- Cacat (a) — label tombol submit form meeting tak terlihat: tombol
  "Mulai meeting" tampil sebagai kotak putih kosong di samping tombol
  "Batal" yang normal; fungsinya tetap bekerja (cacat tampilan, bukan
  fungsi). Penyebab (dari pembacaan kode, bukan tebakan): aturan
  `.form-actions button` (index.css:719) — latar putih, tanpa `color` —
  memiliki spesifisitas sama (0,1,1) dengan `button.primary` (index.css:
  303) tetapi posisinya lebih akhir di file, sehingga menimpa
  `background` tombol primer menjadi putih sementara `color: #ffffff`
  dari `.primary` tetap berlaku: teks putih di atas latar putih.
  Cacat yang sama juga menimpa tombol "Mulai acara" di EventsPanel
  (sama-sama di dalam `.form-actions`); tombol "Simpan tugas"
  (TaskBoard) dan "Kirim" (chat) tidak terdampak karena tidak berada
  di dalam `.form-actions`. Perbaikan: aturan baru
  `.form-actions button.primary` (spesifisitas 0,2,1) tepat setelah
  `.form-actions button`, mengembalikan border/latar/teks primer.
- Cacat (b) — panel samping menutupi pill mode kamera + bilah petunjuk:
  saat panel overlay terbuka, pill kamera (tengah, z-index 5) dan
  bilah petunjuk bawah (lebar penuh) tertutup sebagian oleh
  `.board-overlay` (kanan, lebar min(780px, 94%), z-index 8).
  Perbaikan: App.tsx menghitung `hasPanel` (bagian Tugas/Rapat/Acara/
  Bangun/Analitik/Aktivitas/Atur — bagian Dunia/Agent tidak memakai
  overlay) dan memberi kelas `has-panel` pada `.world-wrap`; CSS baru
  (hanya layar lebar >900px) menggeser pill kamera ke kiri dalam strip
  dunia yang masih terlihat (`max-width: calc(100% - min(780px, 94%)
  - 24px)`, `overflow-x: auto`, tombol `flex-shrink: 0`) dan memberi
  bilah petunjuk `padding-right` selebar panel supaya teksnya tetap
  terbaca penuh. Pada layar sempit (≤900px, tata letak kolom) perilaku
  tetap seperti sekarang.
- TIDAK diubah: label agent bertumpuk saat bergerombol (dikenal sejak
  3.2), panel chat yang menutupi sebagian minimap, tombol X toast
  (keterbatasan alat verifikasi, bukan cacat kode), dunia 3D, kamera,
  logika behavior/task/meeting/event, `src/ai/*`, warna tema.
- Uji logika baru: TIDAK ADA — perbaikan murni tampilan (CSS + kelas
  layout); uji palsu untuk tampilan tidak dibuat. `npm test` harus
  tetap 185 lulus.
- Verifikasi: `npm run build` lulus (dist `index-DUVYFGRa.js`, 905.339
  byte — naik 132 byte dari 8.1; CSS `index-BLCfmURm.css`, 15.495
  byte), dev (5199) + preview (5198) HTTP 200 termasuk aset JS + CSS,
  `npm test` TOTAL 185 lulus, 0 gagal (tidak ada uji baru — perbaikan
  murni tampilan), lint 0 error (5 warning pola lama).

## Phase 8.2 — Dunia lebih kaya ✅ SELESAI (23 Nov 2026)
- Latar: lanjutan redesain dari screenshot "Kampus Nailong" (8.1 =
  layout + feed). Keputusan Bos 23 Nov 17:24: "Lanjut ke 8.2 (dunia
  lebih kaya)". Percobaan pertama TERPUTUS 23 Nov 17:34 oleh galat
  runtime ("database error: compaction summary cannot be empty") —
  galat infrastruktur, BUKAN vonis atas kode; pekerjaan dilanjutkan
  dari keadaan yang sudah ada (file baru + perubahan sudah di tempat,
  satu `npm run build` sudah exit 0) — tidak mulai dari nol.
- Isi 8.2 (hanya ini): gedung baru + kolam + taman bermain + halte +
  mobil + hewan ambient + suasana senja. Semua primitif low-poly gaya
  kota Phase 2 (bukan file model eksternal); elemen berulang memakai
  InstancedMesh (pelajaran 7.1).
  - Gedung baru (12 footprint di `src/world/buildings/district.ts`,
    dibangun ke grup kota yang sama via `buildCity`; masuk CityInfo
    sehingga minimap + validasi builder ikut mengenalinya):
    masjid (-36,33) 8×8 — badan krem + kubah hijau + menara; sekolah
    (-24,-34) 12×8 — badan kuning + tiang bendera; klinik (20,-34)
    10×7 — badan putih + salib merah; toko (8,34) 8×6 — badan ungu +
    awning merah muda; lapak pasar (-14,36) 13×3 — 5 kios
    warna-warni (meja/atap/tiang/peti = 4 InstancedMesh); menara kaca
    (36,-34) 8×8 — badan transparan 20 tinggi + antena (tanpa
    bayangan — kaca tidak melempar bayangan padat); kolam renang
    (29,20) 10×6 — tepi + air biru transparan (tanpa bayangan); taman
    bermain (20,35) 8×7 — perosotan + ayunan (dudukan/tali =
    InstancedMesh) + bak pasir; halte bus (20,4.5) 3×1,5 — atap +
    tiang (InstancedMesh) + bangku; 3 mobil parkir statis (12/26/-12,
    4.5) — badan/kabin/roda = 3 InstancedMesh.
  - Peta penempatan (semua di lahan kosong, dalam batas ±45; dibuktikan
    uji, bukan klaim): tidak menabrak gedung lama (kantor (0,-22),
    arena (25,-12), panggung (-25,-12), 10 rumah z 18 & 27, taman
    (-23,13)), tidak menabrak jalan salib (lebar 6), tidak saling
    menabrak; jarak terdekat ke pohon 1,58 (lapak vs pohon (-6,38)) —
    di atas ambang 1,5; jarak >2,6 dari alas ruang meeting (tidak
    menutup room). Halte + mobil di tepi jalan timur (z 4,5, di luar
    badan jalan x ±3).
  - Hewan ambient (`src/world/animals/Animals.ts`) — dekorasi yang
    berkeliaran, BUKAN agent: tidak ada di sidebar, tidak bisa
    di-chat, tidak memegang tugas, tidak memengaruhi status/HUD.
    2 kucing (jelajah lingkaran (-20,10) r 5, 0,7 unit/dtk) + 2 anjing
    ((14,8) r 4, 0,9 unit/dtk) + 3 bebek (persegi kolam x 25–33,
    z 18–22, 0,4 unit/dtk, bobbing di air). Tiap spesies dirakit dari
    InstancedMesh per bagian tubuh: kucing 4 + anjing 4 + bebek 3 =
    11 draw call, tanpa bayangan. Gerak prosedural: pilih target acak
    dalam area, berjalan pelan ke sana, berhenti 2–6 dtk, ulangi;
    posisi selalu di dalam area (dijamin konstruksi). Bounding sphere
    manual per spesies supaya frustum culling tetap benar.
  - Suasana senja: periode Sore kini SENJA — `environmentTargets`
    dipindah dari `createWorld.ts` ke modul murni baru
    `src/simulation/environment.ts` (supaya nilainya bisa diuji tanpa
    DOM/renderer): langit jingga 0xe8894f, matahari hangat 0xff9e4a
    intensitas 1,1 (dari 1,25), hemi 0,65, kabut 78–165, posisi
    matahari (30,10,15) — rendah di barat; `createWorld` menggeser
    posisi matahari mengikuti target (lerp). Pagi/Siang/Malam TIDAK
    berubah; hujan tetap menimpa langit senja (0x7d8ea3). Jam/cuaca
    tidak berubah (1 hari simulasi = 10 menit nyata tetap berlaku).
    Ini pendekatan senja lewat parameter suasana yang sudah ada —
    bukan skybox baru.
  - Navigasi: 9 simpul baru (total 20) — mosque (-36,26), school
    (-24,-26), roadNE (12,-12, persimpangan baru), clinic (20,-26),
    tower (36,-34), shop (6,30), market (-14,30), playground
    (20,30), pool (26,12) — + 9 sisi baru; graf tetap terhubung
    (BFS dari plaza mencapai semua simpul). Catatan uji: sisi
    roadW→park "menembus" persegi taman — BUKAN cacat: taman adalah
    ruang terbuka yang memang dimasuki agent (simpul 'park' di tengah
    footprint taman sejak Phase 3); uji mengecualikan taman dari
    daftar gedung padat dan mendokumentasikannya.
  - Minimap: tempat baru tampil otomatis — Minimap menggambar semua
    `city.buildings` dari CityInfo dengan warna footprint-nya
    (masjid hijau, sekolah kuning, dst.); tidak ada perubahan
    `Minimap.tsx`.
  - Draw call (dihitung ulang dengan cara yang sama persis seperti
    7.1 — replika scene graph + matematika frustum, `scripts/
    sceneCount.ts` dipakai bersama phase71-test):
    tanpa hewan main 236 (tanah/grid/plaza 3, kota 96, ruang meeting
    24, builder 7, agent 106) + shadow 116 (kota 47, ruang meeting 6,
    builder 3, agent 60) = 352; dengan hewan main 247 (+11 hewan) +
    shadow 116 (hewan 0) = **363 total live**. Dibanding 7.1 (291):
    main 192→236 (+44 mesh baru), shadow 99→116 (+17), total
    291→352 (+61) tanpa hewan, 291→363 (+72) dengan hewan. Ekspektasi
    `phase71-test.ts` diperbarui ke angka baru ini (naive 47→91) —
    dengan menghitung ulang, BUKAN menghapus asersi. Kenaikan ini
    wajar: 44 mesh baru + 11 hewan; instancing menahan kenaikan
    (kios/mobil/ayunan/hewan sudah InstancedMesh — tanpa instancing
    kenaikannya jauh lebih besar).
  - Uji logika baru `scripts/phase82-test.ts` — **31 lulus, 0 gagal**:
    penempatan (12 footprint, batas, tidak menabrak gedung lama/
    jalan/sesama, jarak pohon ≥1,5, jarak room >2,6), graf (11 simpul
    lama tetap, 9 baru, terhubung, tidak ada sisi menembus gedung
    padat, simpul baru di luar footprint-nya), hewan (jumlah, tetap
    dalam area setelah 600 dtk simulasi, 11 InstancedMesh, 0 shadow
    caster), draw call (main 236/247, shadow 116, total 363),
    senja (nilai Sore + Pagi/Siang/Malam tidak berubah + hujan
    menimpa). Catatan jujur: satu asersi awal GAGAL — sisi roadW→park
    vs persegi taman (lihat catatan di atas); penyebabnya premis uji
    yang salah (taman diperlakukan sebagai gedung padat), BUKAN cacat
    aplikasi — diperbaiki di UJI (taman dikecualikan + didokumentasi),
    bukan dengan mengubah perilaku navigasi Phase 3.
  - Dampak susulan pada suite lama (ditemukan saat larian gabungan —
    BUKAN flaky acak, keduanya deterministik dan dijelaskan di sini):
    (1) phase61: rute BFS terjauh membesar karena graf membesar —
    mosque→tower = 50,0 dtk (dulu < 30 dtk); batas asersi diperbarui
    30 → 55 dtk (margin ~10% di atas nilai terukur yang deterministik),
    pembenaran tenggang 90 dtk tetap berlaku (50,0 + 25 = 75,0 < 90).
    (2) phase62: dunia membesar → agent lebih tersebar → pairing
    ambient lebih jarang per satuan waktu — fraksi agent yang paling
    jarang pairing jatuh tepat di bawah ambang 0,02 pada jendela 420
    dtk; jendela observasi seksi replay diperpanjang 420 → 900 dtk
    (bar yang sama, >2% per agent — terukur 0,027–0,096; run
    terpanjang tidak membesar, tetap 51,9 dtk aria, masih < 60 dtk).
    Tidak ada asersi yang dihapus di kedua suite; yang diubah hanya
    batas/jendela yang memang bergantung pada ukuran graf, dengan
    alasan + angka terukur yang ditulis di komentar uji.
  - TIDAK diubah: 8.3 (Builder 21 item), "Mode eksekusi nyata",
    nama/tema "Kampus Nailong", logika behavior/task/meeting/event,
    `src/ai/*`, warna tema utama, file Mission Control.
  - File: BARU (5): `src/world/buildings/district.ts`,
    `src/world/animals/Animals.ts`, `src/simulation/environment.ts`,
    `scripts/sceneCount.ts`, `scripts/phase82-test.ts`. DIUBAH (8):
    `src/world/buildings/city.ts` (import district + jenis footprint
    baru + `buildDistrict` + export `composeMatrix`/`buildInstanced`),
    `src/world/engine/createWorld.ts` (environmentTargets pindah ke
    modul + `new Animals(scene)` + `animals.update(dt, t)` + lerp
    posisi matahari), `src/world/navigation/navGraph.ts` (9 simpul +
    9 sisi), `scripts/phase71-test.ts` (memakai sceneCount + angka
    baru 236/116/352), `scripts/phase61-test.ts` (batas rute terjauh
    30 → 55 dtk), `scripts/phase62-test.ts` (jendela replay 420 →
    900 dtk), `scripts/run-all-tests.sh` (suite phase82),
    `docs/PHASES.md` (§8.2 ini).
  - Verifikasi: `npm run build` lulus (dist `index-CKD6To-b.js`,
    915.459 byte — naik 10.120 byte dari 8.1.1; CSS
    `index-BLCfmURm.css`, 15.495 byte, identik 8.1.1), dev (5199) +
    preview (5198) HTTP 200 termasuk aset JS + CSS, `npm test` TOTAL
    216 lulus, 0 gagal (33+49+25+20+18+16+24+31), lint 0 error
    (5 warning pola lama).

### 8.2.1 — Perbaikan tampilan (teks fase 8.2 + pill kamera tertutup panel Builder)

- Temuan live 8.2 (23 Nov 18:12): (1) teks fase MASIH 8.1 — badge
  header "Phase 8.1 — Layout & Feed" dan footer HUD "Fase 8.1/7 —
  Layout & Feed", padahal isi dunia sudah 8.2 (subagent 8.2 tidak
  menyentuh teks badge/HUD); (2) panel World Builder menutupi
  sebagian pill mode kamera — pill "Ikuti Agent" terpotong dan
  muncul scrollbar horizontal.
- Diagnosis pill (dibaca langsung dari kode, bukan ditebak):
  BuilderPanel memakai `.board-overlay` yang SAMA dengan semua panel
  lain (lebar `min(780px, 94%)`, z-index 8) dan `has-panel` di App.tsx
  SUDAH diterapkan saat section 'builder' — jadi ini BUKAN khusus
  Builder dan BUKAN kelas overlay yang salah. Penyebab sebenarnya:
  aturan 8.1.1 menggeser pill ke strip kiri dengan
  `max-width: calc(100% − min(780px, 94%) − 24px)` + `overflow-x:
  auto`. Lebar pill ~460–500px (5 tombol), sedangkan strip =
  viewport − 876px (rel nav 72px + panel 780px + margin 24px).
  Di viewport 1280px strip hanya ~404px < pill, jadi pill tetap
  bergulir horizontal dan tombol "Ikuti Agent" terpotong — persis
  seperti yang terlihat live. Verifikasi live 8.1.1 lulus karena
  jendela pemeriksa saat itu lebih lebar (≥ ~1350px, strip ≥ pill).
  Dengan kata lain: 8.1.1 bekerja hanya bila strip lebih lebar dari
  pill; di bawah itu ia merosot jadi pill yang bisa digulir.
- Perbaikan: pill kini membungkus (`flex-wrap: wrap`) ke 2 baris
  dalam strip, `overflow-x: auto` dihapus — kelima tombol terlihat
  penuh tanpa scrollbar. Aturan `.has-panel` yang sama berlaku untuk
  SEMUA panel overlay, jadi panel Tugas/Rapat/Acara/Analitik/
  Aktivitas/Atur ikut membaik; perilaku saat panel ditutup tidak
  berubah (pill kembali ke tengah). Bilah petunjuk tidak diubah.
- Teks fase diperbarui ke 8.2 di tiga label: badge header
  ("Phase 8.2 — Dunia Lebih Kaya"), footer HUD ("Fase 8.2/7 — Dunia
  Lebih Kaya", tetap "/7" mengikuti pola fase 8.x), dan baris "Versi"
  di panel Atur. Komentar yang menyebut "Phase 8.1" sebagai riwayat
  (kapan suatu fitur diperkenalkan) TIDAK diubah — hanya label fase
  yang diperbarui.
- Batas jujur: di bawah ~1000px viewport, strip lebih sempit dari
  tombol terlebar ("Orang Pertama", ~125px) sehingga sebagian tombol
  bisa terselip di balik panel — secara geometri tak bisa dihindari
  tanpa menutupi panel. Di viewport ≥ ~1000px (termasuk 1280×720 yang
  umum) kelima tombol terlihat penuh dalam 2 baris. Perbaikan ini
  murni tampilan; verifikasi visual dilakukan parent lewat live
  setelah deploy (browser pemeriksa tak menjangkau server VM).
- TIDAK diubah: label nama 3D yang bertumpuk (3.2), label raksasa di
  Orang Pertama, label nama gedung, dunia 3D, `src/ai/*`, logika
  behavior/task/meeting/event, file Mission Control, 8.3.
- File: DIUBAH (5): `src/App.tsx` (badge), `src/ui/Hud.tsx`
  (footer), `src/ui/SettingsPanel.tsx` (baris Versi),
  `src/index.css` (aturan `.has-panel` pill: `flex-wrap: wrap`,
  hapus `overflow-x: auto`, komentar diagnosis), `docs/PHASES.md`
  (§8.2.1 ini). TIDAK ada uji logika baru — perbaikan murni
  tampilan, uji palsu tidak dibuat.

## Phase 8.3 — Builder diperluas: 21 item ✅ SELESAI (23 Nov 2026)

- Katalog 4 → 21 item (nama persis acuan "Kampus Nailong"):
  Pohon, Lampu taman, Bangku, Air mancur, Menara kaca, Gedung kantor,
  Toko, Rumah, Sekolah, Klinik, Masjid, Taman bermain, Lapak pasar,
  Halte bus, Kolam, Mobil parkir, Taman bunga, Meja kafe, Kucing
  (berkeliaran), Anjing (berkeliaran), Bebek (berenang). Semua dari
  primitif Three.js gaya low-poly yang sama. Pembangun district.ts
  TIDAK dipakai ulang langsung — pembangun di sana menaruh grup di
  koordinat tetap, sedangkan objek Builder harus berpusat di titik
  asal supaya bisa ditempatkan di mana saja; pola bentuknya yang
  dipakai ulang. Menara kaca memakai material transparan mengilap
  (opacity 0,55, tanpa bayangan); Gedung kantor lebih kecil dari
  kantor pusat (4,5×5,5×4,5); Rumah seperti rumah residensial.
- Posisi: tiap objek di daftar panel menampilkan "Posisi: (x, z)"
  (format acuan, satu desimal) + putarannya ("Putaran: N°"). Saat
  mode bangun/pindah aktif, panel juga menampilkan posisi kursor di
  tanah ("Posisi kursor: (x, z)") — dihitung lewat raycast
  pointermove ke tanah di createWorld, diteruskan sebagai
  onGroundHover (diperbarui hanya bila berubah 0,1 supaya tidak
  me-render ulang React tiap piksel).
- Label opsional: input "Label (opsional)" saat menempatkan (maks 40
  karakter, di-trim); tersimpan per objek, tampil di daftar panel
  (nama label menggantikan nama jenis; nama jenis tetap ditampilkan
  kecil di sampingnya). Label HANYA di panel — KEPUTUSAN: bukan label
  3D mengambang, karena tiap label 3D adalah sprite + draw call
  tambahan tanpa nilai (nama objek hanya relevan saat mengelola
  daftar); didokumentasikan di sini, bukan disembunyikan.
- Putaran: slider "Putaran: 0°" (0–360°, langkah 1°) saat
  menempatkan; tersimpan per objek (rotY radian) dan diterapkan pada
  mesh 3D. Saat memindah objek yang sudah ada, form diisi dari objek
  itu (label + putaran lama) dan putaran baru tersimpan bersama
  posisi baru. Tanpa putaran, arah kembali ke default (bangku
  menghadap plaza).
- Validasi diperbarui (footprint, bukan titik): tiap jenis punya
  ukuran footprint di katalog; kandidat harus muat dalam ±40,
  tidak menabrak gedung (persegi diperluas margin 1 — termasuk 12
  footprint tetap 8.2 dari district.ts), dan jarak tepi-ke-tepi
  antar objek ≥ 1,5. Pesan penolakan sama seperti sebelumnya
  ("Terlalu dekat dengan {nama}.", "Terlalu dekat dengan objek
  lain.", "Di luar batas kota (maks ±40)."). Panggilan lama tanpa
  jenis (uji Phase 6) tetap berperilaku seperti dulu (kandidat =
  titik) — kompatibilitas dijaga, bukan dilanggar diam-diam.
- Bebek: HANYA bisa ditempatkan di dalam kolam 8.2 (persegi air
  24.6–33.4, 17.6–22.4 — dibaca langsung dari NEW_BUILDINGS di
  district.ts, bukan dihafal). Di luar kolam ditolak dengan pesan
  "Bebek hanya bisa ditempatkan di kolam." Kolam dikecualikan dari
  cek gedung untuk bebek (kalau tidak, bebek di kolam justru
  ditolak sebagai "di dalam gedung"); jenis lain tetap ditolak bila
  masuk kolam. Bebek dari Builder berenang di kolam yang sama
  dengan bebek ambient 8.2.
- Hewan Builder: kucing/anjing yang ditempatkan berkeliaran pelan
  dalam radius 4,5 unit di sekitar titik penempatannya (pola yang
  sama dengan Animals 8.2). Definisi bagian tubuh + helper gerak
  diekstrak ke modul bersama `src/world/animals/animalParts.ts`
  (dipakai Animals 8.2 dan BuilderAnimals 8.3 — refactor tanpa
  mengubah API/perilaku Animals; uji 8.2 tetap lulus). Tiap spesies
  tetap satu InstancedMesh per bagian tubuh; daftar dinamis
  (setAnimals membangun ulang mesh tiap objek berubah). Hewan
  Builder tetap BUKAN agent (tidak ada di sidebar/chat/tugas).
- Kompatibilitas simpanan lama: objek sebelum 8.3 (tanpa label,
  bisa tanpa rotY) termuat dengan default (label '', rotY = arah
  default); jenis tak dikenal dibuang. Seed lama (bangku + lampu)
  tetap. Key localStorage sama (`living-world-objects-v1`).
- Minimap: tidak ada perubahan kode — objek Builder sudah tampil
  sebagai titik warna katalog, dan ke-21 jenis punya warna heks
  valid (diuji). Gedung tetap 8.2 tampil sebagai blok seperti
  sebelumnya.
- Instancing + draw call: bagian berulang DALAM satu objek memakai
  InstancedMesh (lapak pasar 4, mobil 3, taman bunga 3, taman
  bermain 2, halte 1, meja kafe 2, hewan Builder 11 untuk 2 kucing
  + 1 anjing + 1 bebek). Katalog saja TIDAK menambah draw call
  dasar — objek Builder dinamis, scene dasar tetap 2 seed
  (bangku + lampu): main 236 + shadow 116 = **363 live (TETAP,
  sama seperti 8.2)**, dihitung ulang dengan sceneCount.ts + metode
  7.1 dan dikunci uji. Objek yang ditempatkan Bos menambah draw
  call sesuai mesh-nya (terlihat di HUD) — itu wajar, bukan cacat.
- Perbaikan susulan yang jujur (ditemukan tsc saat build): (1) type
  guard `isAnimalKind` tidak mempersempit elemen array lewat
  `.filter` biasa — diperbaiki dengan predikat tipe eksplisit di
  createWorld; (2) `analytics.ts` membangun `Record<WorldObjectKind,
  number>` hanya dengan 4 jenis lama — kini diinisialisasi dari
  katalog (21 jenis), dan export CSV + ringkasan panel Analitik
  ikut memakai katalog (satu baris per jenis yang ada). Kedua file
  ikut masuk zip + backup (bukan perubahan sembunyi).
- Verifikasi lokal: build LULUS (dist `index-NqboHGE2.js`,
  929.704 byte; CSS `index-CmFqVcoq.css`, 16.023 byte), dev +
  preview HTTP 200, uji logika 8.3 **60/60** + TOTAL **276 lulus**
  (33+49+25+20+18+16+24+31+60), lint 0 error (5 warning pola lama).
- File: BARU (3): `src/world/animals/animalParts.ts`,
  `src/world/animals/BuilderAnimals.ts`, `scripts/phase83-test.ts`.
  DIUBAH (13): `src/types/worldObject.ts` (21 jenis + footprint +
  label), `src/simulation/builderLogic.ts` (validasi footprint +
  bebek), `src/simulation/worldObjectStore.ts` (label/putaran +
  normalisasi simpanan lama), `src/world/buildings/props.ts` (14
  pembangun baru + hewan → grup kosong), `src/world/animals/
  Animals.ts` (refactor ke animalParts, API sama),
  `src/world/engine/createWorld.ts` (BuilderAnimals + hover),
  `src/components/WorldView.tsx` (onGroundHover),
  `src/App.tsx` (state label/putaran/hover + wiring),
  `src/ui/BuilderPanel.tsx` (katalog 21 + form + posisi),
  `src/index.css` (gaya `.builder-form`),
  `src/simulation/analytics.ts` (byKind 21 jenis + CSV),
  `src/ui/AnalyticsPanel.tsx` (ringkasan dari katalog),
  `scripts/run-all-tests.sh` (suite phase83), `docs/PHASES.md`
  (§8.3 ini + status akhir). TIDAK diubah: gedung tetap 8.2,
  `src/ai/*`, logika behavior/task/meeting/event, file Mission
  Control, sync Supabase objek Builder (tetap localStorage).

### 8.3.1 — Perbaikan kosmetik (label bertumpuk + pil Mode bangun) ✅ SELESAI (23 Nov 2026)

Tiga temuan live 8.2–8.3, semuanya tampilan (bukan logika):

**1. Pil biru "Mode bangun" tertutup pill kamera saat panel Builder terbuka.**
Diagnosis (dari kode): `.build-banner` diposisikan `top: 60px; left: 50%`
(tengah-atas), sementara pill kamera saat panel terbuka bergeser ke strip
kiri dan membungkus 2 baris (8.1.1/8.2.1). Strip kiri melebar seiring
viewport (panel tetap 780px), jadi pada viewport lebar tepi kanan strip
melewati tepi kiri banner — dan secara vertikal baris ke-2 pill (y ~48–84)
memang bersinggungan dengan banner (y 60–88). Bukan khusus Builder:
semua panel overlay + mode bangun/pindah kena.
Perbaikan: toolbar + banner kini dalam satu wadah `.top-overlays`
(kolom flex, gap 8px) — banner selalu tepat di bawah pill, jadi
keduanya tak bisa bertumpuk, baik saat panel tertutup (tengah) maupun
terbuka (strip kiri). Tanpa panel, posisi visual sama seperti sebelumnya
(pill y 12, banner y ~56 — dulu 60). `pointer-events: none` pada wadah
supaya klik di celahnya tembus ke kanvas; anak-anaknya tetap bisa diklik.
Teks mode pindah ("Mode pindah — klik tanah tujuan") memakai elemen yang
sama, ikut tertangani.

**2. Label besar ruangan menutupi kartu nama agent di mode Ikuti Agent.**
Diagnosis: label nama ruangan adalah sprite 3,4 × 0,85 unit di y 2,7
(`meetingRooms.ts`); dari jarak kamera Ikuti Agent (~7,8 unit) ia tampak
raksasa dan menumpuk label agent (2,2 × 0,83 di y 2,05).
Perbaikan: `RoomVisuals.setLabelsVisible()` baru + `WorldHandle`
`setRoomLabelsVisible()` — label ruangan disembunyikan saat mode Ikuti
Agent / Orang Pertama aktif (konteks ruangan sudah ada di HUD/panel),
ditampilkan lagi di Overview/Atas/Sinematik. Alas + cincin ruangan tetap
terlihat, jadi identifikasi ruangan di Overview tak berubah.

**3. Label nama agent bertumpuk saat bergerombol + membesar saat kamera dekat.**
Diagnosis: label sprite berukuran dunia tetap (2,2 × 0,83 di y 2,05) —
dari jarak dekat ia memenuhi layar, dan agent yang berdekatan punya label
di ketinggian yang sama sehingga saling menutupi.
Perbaikan (fungsi murni baru `src/simulation/labelLayout.ts`, diterapkan
tiap frame di loop `createWorld`, via `AgentCharacter.setLabelLayout`):
(a) skala label mengikuti jarak kamera — `clamp(jarak/12, 0,3, 1)`:
di bawah 3,6 unit skala 0,3 (tetap terbaca, tak memenuhi layar), di atas
12 unit skala penuh 1 (Overview/Atas/Sinematik tak berubah); di antaranya
ukuran TAMPAK label konstan. Label di mode Ikuti Agent (~7,8 unit)
tampil 0,65×. (b) offset vertikal gerombolan — pewarnaan graf greedy
dalam urutan roster tetap (deterministik, tak berkedip): tiap agent
mengambil tingkat terendah yang belum dipakai tetangga sebelumnya dalam
jarak 2,2 unit; langkah = tinggi label penuh (0,85), jadi label dalam
satu gerombolan tak pernah saling menutupi menurut proksi jarak dunia.
Visibilitas label tetap milik pengaturan "Atur" (`setLabelVisible`);
perbaikan ini hanya mengubah skala/posisi y.
Batas jujur: proksi memakai jarak dunia horizontal, bukan proyeksi layar
— dari sudut tertentu dua agent yang berjarak > 2,2 unit bisa saja
labelnya bersinggungan di layar (mis. segaris dengan kamera). Dalam
kerumunan sangat padat (≥ 4 agent dalam 2,2 unit) tumpukan teratas
melayang cukup tinggi di atas kelompoknya. Bila Bos menginginkan
jaminan "tak pernah bertumpuk" penuh, perlu proyeksi layar per frame —
di luar lingkup perbaikan ini.

**Yang TIDAK diubah:** tumpukan bar petunjuk WASD dengan bar petunjuk
umum di mode Orang Pertama (item kosmetik terpisah); minimap objek
Builder; draw call 345 vs 363 (variasi live yang dikenal); dunia 3D,
`src/ai/*`, logika behavior/task/meeting/event, katalog Builder 8.3,
teks fase. Uji logika baru `scripts/phase831-test.ts` (28 assertion:
skala jarak + offset gerombolan + konstanta); total uji 276 → 304.

### 8.3.2 — Perbaikan kosmetik (bar petunjuk WASD bertumpuk dengan bar petunjuk umum) ✅ SELESAI (23 Nov 2026)

Satu temuan live 8.2.1: di mode Orang Pertama, bar petunjuk WASD
bertumpuk dengan bar petunjuk umum (`.world-hint`).

Diagnosis (dari kode): `.world-wrap` adalah kolom flex
(`display: flex; flex-direction: column; position: relative`) dengan
kanvas (`.world-canvas`, `flex: 1`) di atas dan `.world-hint` sebagai
strip in-flow di dasar kolom (padding 8px, huruf 13px — tinggi total
~35px). Pil petunjuk WASD (`.camera-hint`, hanya dirender saat
`cameraMode === 'first-person'`) diposisikan `absolute; left: 12px;
bottom: 12px` terhadap `.world-wrap` — jadi ia duduk 12px di atas
tepi bawah wadah, tepat di atas strip `.world-hint`, dan keduanya
bertumpuk ~23px secara vertikal (pil ~31px tinggi di atas strip ~35px)
serta horizontal (pil di kiri menutupi teks strip yang membentang
penuh). Pil itu HANYA tampil di mode Orang Pertama (JSX kondisional
di `App.tsx`); mode lain tidak pernah punya dua bar.
Perbaikan (cara yang dipilih: gabung ke satu bar — bukan geser pil ke
atas, karena tinggi strip `.world-hint` tidak tetap: ia membungkus
ke 2 baris di layar sempit / saat panel overlay terbuka memberi
`padding-right`, jadi offset `bottom` tetap akan bertumpuk di sebagian
viewport): pil `.camera-hint` dihapus dari `App.tsx` dan aturan CSS-nya
dihapus dari `index.css` (termasuk dari daftar print); `.world-hint`
kini menampilkan teks gabungan saat mode Orang Pertama aktif —
"WASD / tombol panah untuk bergerak · seret untuk melihat sekeliling ·
scroll untuk zoom · klik figur agent untuk memilih" — dan teks lama
("Seret untuk memutar kamera · …") di mode lain. Kini hanya ada SATU
bar petunjuk di semua mode, jadi tumpukan tidak mungkin terjadi di
viewport mana pun, panel overlay terbuka maupun tertutup (aturan
`padding-right` `.has-panel` 8.1.1 tetap berlaku pada bar ini).
Perubahan tampilan di mode Orang Pertama: petunjuk WASD pindah dari pil
gelap di atas kanvas ke teks di strip bawah — tidak ada lagi yang
menutupi pandangan 3D.

**Yang TIDAK diubah:** label agent/ruangan (8.3.1), pil Mode bangun /
`.top-overlays` (8.3.1), mode bangun bertahan saat panel ditutup (itu
perubahan perilaku, bukan kosmetik ini), Supabase, dunia 3D,
`src/ai/*`, logika behavior/task/meeting/event, katalog Builder 8.3,
teks fase. Perbaikan murni tampilan — tidak ada logika murni yang bisa
diuji, jadi tidak ada uji baru (total uji tetap 304).

### Status akhir semua fase
Phase 1 ✅ · Phase 2 ✅ (+2.1) · Phase 3 ✅ (+3.1, +3.2) · Phase 4 ✅
(Gemini live) · Phase 4.1 ✅ (detail error asli di fallback + default
model 3.5-flash-lite; uji 21 assertion) · Phase 5 ✅ · Phase 6 ✅ (+6.1, +6.2 — 6.2 penyelidikan,
bukan cacat) · Phase 7 ✅ (+7.1 — draw call live 289 dijelaskan, klaim
"182"/"−34%" dikoreksi jadi 291/−30%; bukan cacat · +7.2 — toast
"Kyber Agent — Bekerja…" terbukti overlay harness browser, bukan
komponen aplikasi; bukan cacat) · Phase 8.1 ✅ (layout sidebar + header
live + feed aktivitas; Acara jadi item sidebar ke-9 supaya fitur Phase 6
tetap bisa dibuka) · Phase 8.1.1 ✅ (perbaikan tampilan: label tombol
"Mulai meeting"/"Mulai acara" + pill kamera/bilah petunjuk saat panel
terbuka) · Phase 8.2 ✅ (dunia lebih kaya: 12 footprint baru + hewan
ambient + senja; draw call live 291→363, dihitung ulang cara 7.1) ·
Phase 8.2.1 ✅ (teks fase → 8.2 + pill kamera membungkus ke 2 baris
saat panel overlay terbuka, tanpa scrollbar) · Phase 8.3 ✅ (Builder
21 item + label/putaran/posisi kursor + bebek hanya di kolam + hewan
Builder berkeliaran; draw call dasar TETAP 363 — katalog saja tidak
menambah mesh dasar) · Phase 8.3.1 ✅ (banner bangun di bawah pill
kamera via `.top-overlays`; label ruangan sembunyi di Ikuti Agent /
Orang Pertama; label agent mengecil saat kamera dekat + menumpuk
vertikal saat bergerombolan — uji 28 assertion) · Phase 8.3.2 ✅
(petunjuk WASD digabung ke `.world-hint` di mode Orang Pertama —
pil `.camera-hint` terpisah yang bertumpuk dihapus).
Live Phase 7
~15:55: badge/HUD/kota identik lulus; FPS 3–4 artefak browser pemeriksa
tanpa GPU.

## Backlog akhir (transparan — belum ada, jangan diklaim berfungsi)
- Sinkronisasi meeting ke Supabase (tabel belum ada — butuh migrasi baru
  bila diputuskan); sinkronisasi acara + objek builder ke Supabase (tabel
  belum ada); sinkronisasi chat ke Supabase (tabel `chat_messages` ada,
  wiring menyusul).
- Proksi server-side untuk key LLM (saat ini key ikut ke bundle publik;
  mitigasi saat ini = batasi referrer + API di Cloud Console — masih
  menunggu Bos mengaktifkan 2SV).
- Jadwal meeting/acara ke depan (baru mulai langsung); pengingat/
  undangan meeting; kalender tugas (baru deadline di kartu).
- Generator PDF sesungguhnya (saat ini hanya print browser via
  `window.print()`); export CSV + cetak/PDF belum terverifikasi live
  (unduhan terpicu, berkas tak terbaca alat pemeriksa).
- Label terjadwal vs spontan di sidebar (supaya akhir acara/meeting
  selalu terlihat — wart 6.2: peserta bisa langsung kembali berstatus
  sama secara ambient tanpa transisi terlihat, ~2,7% per peserta per
  akhir acara).
- Mode gelap; autentikasi + RBAC (migrasi tasks memakai RLS
  demo-terbuka); animasi berlari dan berbicara yang terpisah; pengaruh
  vital ke kecepatan/kinerja agent (saat ini vital hanya tampil +
  memengaruhi mood); siklus musim.
- Database live: sinkronisasi tugas aktif bila Supabase dikonfigurasi;
  sampai saat itu tugas + meeting + acara + objek builder tersimpan lokal
  (localStorage).
