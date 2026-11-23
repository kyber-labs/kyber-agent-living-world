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
  `generativelanguage.googleapis.com` model `gemini-2.5-flash` (bisa diubah
  via `VITE_GEMINI_MODEL`). Key lewat `VITE_GEMINI_API_KEY` — ikut ke
  bundle publik, WAJIB dibatasi ke referrer Vercel di AI Studio.
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

## Phase 7 — Optimasi, pengujian, dokumentasi
- LOD, frustum culling, instancing, pengaturan kualitas grafis, monitoring
  FPS/memori, pengujian perangkat + browser + performa + keamanan, laporan
  pengujian yang jujur.

## Backlog transparan (belum ada — jangan diklaim berfungsi)
- Kalender tugas (baru deadline di kartu), sinkronisasi chat ke Supabase,
  sinkronisasi meeting ke Supabase (tabel belum ada), sinkronisasi acara +
  objek builder ke Supabase (tabel belum ada), jadwal meeting/acara ke
  depan (baru mulai langsung), generator PDF sesungguhnya (saat ini hanya
  print browser), mode gelap, autentikasi, animasi berlari dan berbicara
  yang terpisah.
- Database live: sinkronisasi tugas aktif bila Supabase dikonfigurasi;
  sampai saat itu tugas + meeting + acara + objek builder tersimpan lokal
  (localStorage).
