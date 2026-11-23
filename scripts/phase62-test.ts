// Uji logika 6.2 — penyelidikan status 'Meeting' yang menetap.
// Temuan live 6.1 (23 Nov 13.33–13.42): Kai dan Zoe (kadang Nova/Leo/Finn)
// berstatus 'Meeting' selama ~9 menit padahal panel menunjukkan
// "0 berlangsung" dan semua ruang Kosong. Hipotesis yang diuji:
//   (a) meeting ambient berulang — agent berpasangan 6–10 dtk, bubar,
//       lalu langsung berpasangan lagi, sehingga di sidebar tampak
//       'Meeting' terus-menerus;
//   (b) status tertinggal — ada jalur di mana status 'meeting' disetel
//       tapi tidak pernah dibersihkan (meeting/acara berakhir saat
//       peserta masih berjalan / di slot, pasangan ditarik sepihak).
// Uji ini mereproduksi rangkaian kejadian live (acara -> meeting
// terjadwal -> ambient) dan memeriksa run 'meeting' kontinu terpanjang
// yang TERLIHAT DI UI. Model UI: emisi status dalam satu tick yang sama
// digabung (React membatch setState dalam satu frame), jadi yang diukur
// adalah status akhir tiap tick — persis seperti yang tampil di sidebar.
// HASIL PENYELIDIKAN (lihat docs/PHASES.md §6.2): bukan cacat —
// (a) terbukti: meeting ambient memang berulang dan run terpanjang yang
// terukur hanya ~26 dtk di 8 simulasi acak; (b) tidak terbukti: semua
// jalur pembersihan status bekerja. Uji ini mengunci temuan itu sebagai
// regresi: run 'meeting' kontinu tidak boleh melewati 60 dtk.
// Catatan wart yang didokumentasikan (bukan cacat): setelah acara
// berakhir, peserta bisa langsung kembali berstatus sama secara ambient
// tanpa transisi terlihat (depart -> tujuan = simpul sendiri -> tiba
// langsung -> pendingActivity 30%) — statusnya tetap jujur, dwell
// ambient dibatasi 8–14 dtk.
// Bukan uji UI/browser.
import { AgentBehavior } from '../src/simulation/behavior.ts';
import { AGENTS } from '../src/config/agents.ts';
import { roomSlotPositions } from '../src/simulation/meetingLogic.ts';
import { eventSlotPositions } from '../src/simulation/eventLogic.ts';
import { getMeetingRoom } from '../src/types/meeting.ts';
import type { MeetingAssignment } from '../src/types/meeting.ts';
import type { EventAssignment } from '../src/types/event.ts';
import type { AgentStatus } from '../src/types/agent.ts';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  lulus: ${name}`);
  } else {
    failed++;
    console.log(`  GAGAL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// PRNG seed supaya simulasi deterministik (behavior memakai Math.random).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const originalRandom = Math.random;

function positions(): { id: string; x: number; z: number }[] {
  return AGENTS.map((a, i) => {
    const angle = (i / AGENTS.length) * Math.PI * 2;
    return { id: a.id, x: Math.cos(angle) * 5.5, z: Math.sin(angle) * 5.5 };
  });
}

/**
 * Pelacak status per tick: menyimpan status AKHIR tiap agent di tiap tick
 * (model UI — React membatch emisi dalam satu frame) beserta posisi
 * terakhir dan SELURUH emisi status dengan stempel waktu (untuk
 * membuktikan agent benar-benar berangkat, bukan hanya status akhirnya).
 */
class Tracker {
  readonly lastStatus: Record<string, AgentStatus> = {};
  readonly lastPos: Record<string, { x: number; z: number }> = {};
  private readonly timeline: Record<string, { t: number; status: AgentStatus }[]> = {};
  private readonly emissions: { id: string; t: number; status: AgentStatus }[] = [];
  readonly behavior: AgentBehavior;
  now = 0;

  constructor() {
    AGENTS.forEach((a) => {
      this.lastStatus[a.id] = 'idle';
      this.lastPos[a.id] = { x: 0, z: 0 };
      this.timeline[a.id] = [{ t: 0, status: 'idle' }];
    });
    this.behavior = new AgentBehavior(AGENTS, positions(), {
      onMove: (id, x, z) => {
        this.lastPos[id] = { x, z };
      },
      onStatus: (id, status) => {
        this.lastStatus[id] = status;
        this.emissions.push({ id, t: this.now, status });
      },
    });
  }

  /** Majukan simulasi `seconds` detik dengan tick 0,1 dtk. */
  run(seconds: number): void {
    const steps = Math.round(seconds / 0.1);
    for (let i = 0; i < steps; i++) {
      this.now += 0.1;
      this.behavior.update(0.1, this.now);
      AGENTS.forEach((a) => {
        const cur = this.lastStatus[a.id];
        const tl = this.timeline[a.id];
        if (tl[tl.length - 1].status !== cur) tl.push({ t: this.now, status: cur });
      });
    }
  }

  /** Jalankan sampai predikat terpenuhi atau batas waktu habis. */
  runUntil(pred: () => boolean, maxSeconds: number): boolean {
    const steps = Math.round(maxSeconds / 0.1);
    for (let i = 0; i < steps; i++) {
      if (pred()) return true;
      this.now += 0.1;
      this.behavior.update(0.1, this.now);
      AGENTS.forEach((a) => {
        const cur = this.lastStatus[a.id];
        const tl = this.timeline[a.id];
        if (tl[tl.length - 1].status !== cur) tl.push({ t: this.now, status: cur });
      });
    }
    return pred();
  }

  /** Run kontinu terpanjang suatu status (versi UI) untuk satu agent. */
  longestRun(id: string, status: AgentStatus): number {
    const tl = this.timeline[id];
    let best = 0;
    for (let j = 0; j < tl.length; j++) {
      const end = j + 1 < tl.length ? tl[j + 1].t : this.now;
      if (tl[j].status === status) best = Math.max(best, end - tl[j].t);
    }
    return best;
  }

  /** Run kontinu terpanjang suatu status yang dimulai pada/setelah `fromT`. */
  longestRunAfter(id: string, status: AgentStatus, fromT: number): number {
    const tl = this.timeline[id];
    let best = 0;
    for (let j = 0; j < tl.length; j++) {
      const start = Math.max(tl[j].t, fromT);
      const end = j + 1 < tl.length ? tl[j + 1].t : this.now;
      if (tl[j].status === status && end > fromT) best = Math.max(best, end - start);
    }
    return best;
  }

  /** True bila agent mengemisikan `status` dalam jendela (fromT, toT]. */
  emitted(id: string, status: AgentStatus, fromT: number, toT: number): boolean {
    return this.emissions.some((e) => e.id === id && e.status === status && e.t > fromT && e.t <= toT);
  }

  /** True bila agent mengemisikan status APA PUN SELAIN `status` dalam jendela (fromT, toT]. */
  leftStatus(id: string, status: AgentStatus, fromT: number, toT: number): boolean {
    return this.emissions.some((e) => e.id === id && e.status !== status && e.t > fromT && e.t <= toT);
  }

  /** Fraksi waktu berstatus 'meeting' sepanjang simulasi. */
  meetingFraction(id: string): number {
    const tl = this.timeline[id];
    let total = 0;
    for (let j = 0; j < tl.length; j++) {
      const end = j + 1 < tl.length ? tl[j + 1].t : this.now;
      if (tl[j].status === 'meeting') total += end - tl[j].t;
    }
    return this.now > 0 ? total / this.now : 0;
  }
}

function meetingAssignment(roomId: string, index: number, count: number): MeetingAssignment {
  const room = getMeetingRoom(roomId);
  if (!room) throw new Error(`Ruang tidak dikenal: ${roomId}`);
  const slots = roomSlotPositions(room, count);
  return {
    roomId: room.id,
    roomName: room.name,
    nodeId: room.nodeId,
    x: room.x,
    z: room.z,
    slotX: slots[index].x,
    slotZ: slots[index].z,
  };
}

function eventAssignment(kind: 'match' | 'show', index: number, count: number): EventAssignment {
  const slots = eventSlotPositions(kind, count);
  const def =
    kind === 'match'
      ? { locationId: 'arena' as const, locationName: 'Arena Olahraga', nodeId: 'arena', x: 25, z: -12, status: 'sports' as const }
      : { locationId: 'stage' as const, locationName: 'Panggung Hiburan', nodeId: 'stage', x: -15, z: -12, status: 'entertainment' as const };
  return { ...def, slotX: slots[index].x, slotZ: slots[index].z };
}

// ---------------------------------------------------------------------------
// 1. Reproduksi rangkaian kejadian live 6.1: ambient -> acara Pertunjukan
//    (kai/luna/rex) -> bubar -> meeting terjadwal (aria+kai, Ruang Sprint)
//    -> bubar -> ambient panjang. Bila ada status yang tertinggal, run
//    'meeting' kontinu di sini akan membengkak sampai ratusan detik.
// ---------------------------------------------------------------------------
console.log('== 6.2: reproduksi rangkaian live (acara -> meeting -> ambient) ==');
Math.random = mulberry32(7);
{
  const tr = new Tracker();
  tr.run(120);
  // Acara Pertunjukan di Panggung untuk kai/luna/rex.
  const showIds = ['kai', 'luna', 'rex'];
  showIds.forEach((id, i) => tr.behavior.setEvent(id, eventAssignment('show', i, showIds.length)));
  const gathered = tr.runUntil(
    () => showIds.every((id) => tr.lastStatus[id] === 'entertainment'),
    120,
  );
  check('acara: ketiga peserta tiba dan berstatus Hiburan', gathered, `status kai=${tr.lastStatus.kai} luna=${tr.lastStatus.luna} rex=${tr.lastStatus.rex}`);
  tr.run(30);
  showIds.forEach((id) => tr.behavior.setEvent(id, null));
  tr.run(60);
  // Meeting terjadwal di Ruang Sprint (plaza) untuk aria+kai.
  const meetIds = ['aria', 'kai'];
  meetIds.forEach((id, i) => tr.behavior.setMeeting(id, meetingAssignment('room-2', i, meetIds.length)));
  const seated = tr.runUntil(
    () => meetIds.every((id) => tr.lastStatus[id] === 'meeting'),
    120,
  );
  check('meeting: kedua peserta tiba di slot dan berstatus Meeting', seated, `status aria=${tr.lastStatus.aria} kai=${tr.lastStatus.kai}`);
  tr.run(20);
  meetIds.forEach((id) => tr.behavior.setMeeting(id, null));
  tr.run(420);
  // Ukur run 'meeting' kontinu terpanjang yang terlihat di UI.
  const runs = AGENTS.map((a) => ({ id: a.id, run: tr.longestRun(a.id, 'meeting') }));
  const worst = runs.reduce((m, r) => (r.run > m.run ? r : m), runs[0]);
  console.log(`  info: run 'meeting' terpanjang per agent: ${runs.map((r) => `${r.id}:${r.run.toFixed(1)}d`).join(' ')}`);
  console.log(`  info: fraksi meeting: ${AGENTS.map((a) => `${a.id}:${(tr.meetingFraction(a.id) * 100).toFixed(0)}%`).join(' ')}`);
  // Meeting ambient 6–10 dtk; rantai re-pair langsung terukur < ~26 dtk di
  // 8 simulasi acak (scratch 6.2). Batas 60 dtk memberi margin 2x lipat;
  // run 540 dtk (temuan live ~9 menit) akan menggagalkan uji ini.
  check("tidak ada status 'meeting' yang menetap (>60 dtk kontinu)", worst.run <= 60, `${worst.id} ${worst.run.toFixed(1)} dtk`);
  check("semua agent sempat 'meeting' ambient (mekanisme pairing hidup)", AGENTS.every((a) => tr.meetingFraction(a.id) > 0.02));
  check("fraksi 'meeting' tidak mendominasi (<45% per agent)", AGENTS.every((a) => tr.meetingFraction(a.id) < 0.45));
}

// ---------------------------------------------------------------------------
// 2. Skenario B1: meeting berakhir saat peserta MASIH BERJALAN ke room.
// ---------------------------------------------------------------------------
console.log('== 6.2: B1 — meeting berakhir saat peserta berjalan ==');
Math.random = mulberry32(21);
{
  const tr = new Tracker();
  tr.run(30);
  const ids = ['aria', 'kai'];
  ids.forEach((id, i) => tr.behavior.setMeeting(id, meetingAssignment('room-1', i, ids.length)));
  tr.run(2); // peserta baru berangkat (status 'moving')
  check('B1: peserta sedang berjalan ke room', ids.every((id) => tr.lastStatus[id] === 'moving'), `aria=${tr.lastStatus.aria} kai=${tr.lastStatus.kai}`);
  ids.forEach((id) => tr.behavior.setMeeting(id, null));
  const t0 = tr.now;
  tr.run(60);
  const worst = Math.max(...ids.map((id) => tr.longestRunAfter(id, 'meeting', t0)));
  check('B1: tidak ada run Meeting >30 dtk setelah meeting dicabut', worst <= 30, `run terpanjang ${worst.toFixed(1)} dtk`);
}

// ---------------------------------------------------------------------------
// 3. Skenario B2: meeting berakhir saat peserta SUDAH DI SLOT (status
//    'meeting' terjadwal). Peserta harus bubar dalam hitungan detik.
// ---------------------------------------------------------------------------
console.log('== 6.2: B2 — meeting berakhir saat peserta di slot ==');
Math.random = mulberry32(22);
{
  const tr = new Tracker();
  tr.run(30);
  const ids = ['aria', 'kai'];
  ids.forEach((id, i) => tr.behavior.setMeeting(id, meetingAssignment('room-2', i, ids.length)));
  const seated = tr.runUntil(() => ids.every((id) => tr.lastStatus[id] === 'meeting'), 120);
  check('B2: peserta tiba di slot', seated);
  ids.forEach((id) => tr.behavior.setMeeting(id, null));
  tr.run(2);
  check('B2: peserta bubar <=2 dtk setelah meeting dicabut', ids.every((id) => tr.lastStatus[id] !== 'meeting'), `aria=${tr.lastStatus.aria} kai=${tr.lastStatus.kai}`);
  const t0 = tr.now;
  tr.run(58);
  const worst = Math.max(...ids.map((id) => tr.longestRunAfter(id, 'meeting', t0)));
  check('B2: tidak ada run Meeting >30 dtk setelahnya', worst <= 30, `run terpanjang ${worst.toFixed(1)} dtk`);
}

// ---------------------------------------------------------------------------
// 4. Skenario B3: acara berakhir saat peserta DI SLOT (sports/hiburan).
//    Peserta harus lepas dari penugasan acara. CATATAN (temuan penyelidikan):
//    status akhir BOLEH tetap 'entertainment'/'sports' sesaat — itu
//    aktivitas ambient yang sah, bukan acara yang tertinggal. Mekanisme
//    yang terbukti (debug seed 23): peserta berangkat (depart) lalu
//    tujuan acaknya sama dengan simpulnya sendiri (1/11) sehingga
//    langsung "tiba" lagi dan 30% mendapat pendingActivity — tanpa
//    pernah mengemisikan 'moving'. Status yang tampil tetap jujur
//    (agent memang menghibur secara ambient), tapi transisi berakhirnya
//    acara tidak terlihat di sidebar. Dwell ambient dibatasi 8–14 dtk,
//    jadi dalam 30 dtk peserta pasti berganti status — itulah yang
//    diuji di sini, bukan status 2 dtk pertama.
// ---------------------------------------------------------------------------
console.log('== 6.2: B3 — acara berakhir saat peserta di slot ==');
Math.random = mulberry32(23);
{
  const tr = new Tracker();
  tr.run(30);
  const ids = ['kai', 'luna', 'rex'];
  ids.forEach((id, i) => tr.behavior.setEvent(id, eventAssignment('show', i, ids.length)));
  const gathered = tr.runUntil(() => ids.every((id) => tr.lastStatus[id] === 'entertainment'), 120);
  check('B3: peserta tiba di slot acara', gathered);
  const t0 = tr.now;
  ids.forEach((id) => tr.behavior.setEvent(id, null));
  tr.run(30);
  check('B3: tiap peserta berganti status (lepas dari Hiburan) dalam 30 dtk setelah acara dicabut', ids.every((id) => tr.leftStatus(id, 'entertainment', t0, t0 + 30)), `kai=${tr.lastStatus.kai} luna=${tr.lastStatus.luna} rex=${tr.lastStatus.rex}`);
  const worst = Math.max(...ids.map((id) => tr.longestRunAfter(id, 'meeting', t0)));
  check('B3: tidak ada run Meeting >30 dtk setelah acara bubar', worst <= 30, `run terpanjang ${worst.toFixed(1)} dtk`);
}

// ---------------------------------------------------------------------------
// 5. Skenario B4: satu pasangan meeting ambient ditarik sepihak ke meeting
//    terjadwal — pasangannya harus langsung bebas (status 'idle').
// ---------------------------------------------------------------------------
console.log('== 6.2: B4 — pasangan ambient ditarik sepihak ==');
Math.random = mulberry32(24);
{
  const tr = new Tracker();
  // Cari pasangan ambient yang terbentuk (dua agent 'meeting' bersamaan).
  let pair: [string, string] | null = null;
  tr.runUntil(() => {
    const meeting = AGENTS.filter((a) => tr.lastStatus[a.id] === 'meeting').map((a) => a.id);
    if (meeting.length >= 2) {
      pair = [meeting[0], meeting[1]];
      return true;
    }
    return false;
  }, 180);
  check('B4: pasangan ambient terbentuk', pair !== null, 'tidak ada pasangan dalam 180 dtk');
  if (pair) {
    const [a, b] = pair;
    tr.behavior.setMeeting(a, meetingAssignment('room-2', 0, 1));
    // releasePartner dipanggil sinkron oleh setMeeting — pasangan langsung bebas.
    check('B4: pasangan langsung bebas (idle) saat pasangannya ditarik', tr.lastStatus[b] === 'idle', `${b}=${tr.lastStatus[b]}`);
    tr.run(5);
    check('B4: pasangan tidak kembali berstatus Meeting dalam 5 dtk', tr.lastStatus[b] !== 'meeting', `${b}=${tr.lastStatus[b]}`);
    tr.behavior.setMeeting(a, null);
  }
}

// ---------------------------------------------------------------------------
// 6. Skenario B5: meeting berakhir saat peserta sudah DEKAT room dan masih
//    berjalan (pendekatan akhir / jalan lurus ke slot). Dipicu oleh
//    peserta PERTAMA yang memenuhi syarat (kedua peserta jarang tiba
//    bersamaan) — yang diuji adalah jalur "meeting dicabut di tengah
//    perjalanan akhir", bukan ketibaan serentak.
// ---------------------------------------------------------------------------
console.log('== 6.2: B5 — meeting berakhir saat dekat room ==');
Math.random = mulberry32(25);
{
  const tr = new Tracker();
  tr.run(30);
  const room = getMeetingRoom('room-2');
  if (!room) throw new Error('room-2 tidak ditemukan');
  const ids = ['aria', 'kai'];
  ids.forEach((id, i) => tr.behavior.setMeeting(id, meetingAssignment('room-2', i, ids.length)));
  // Tunggu sampai SALAH SATU peserta 'moving' dan <=1,5 unit dari pusat
  // room (pendekatan akhir / jalan lurus ke slot; slot berjari-jari 1,3).
  const close = tr.runUntil(
    () =>
      ids.some((id) => {
        const p = tr.lastPos[id];
        return tr.lastStatus[id] === 'moving' && Math.hypot(p.x - room.x, p.z - room.z) <= 1.5;
      }),
    120,
  );
  check('B5: ada peserta dekat room dan masih berjalan', close, `aria=${tr.lastStatus.aria} kai=${tr.lastStatus.kai}`);
  const t0 = tr.now;
  ids.forEach((id) => tr.behavior.setMeeting(id, null));
  tr.run(60);
  const worst = Math.max(...ids.map((id) => tr.longestRunAfter(id, 'meeting', t0)));
  check('B5: tidak ada run Meeting >30 dtk setelahnya', worst <= 30, `run terpanjang ${worst.toFixed(1)} dtk`);
}

// ---------------------------------------------------------------------------
// 7. Ambient dengan taskFocus (tiruan sesi live: 3 agent memegang tugas
//    'doing', seperti Kanban saat verifikasi 6.1). Agent bertugas diam
//    lebih lama di simpul (8–12 dtk) sehingga lebih sering jadi pasangan
//    meeting ambient — run terpanjang harus tetap terbatas.
// ---------------------------------------------------------------------------
console.log('== 6.2: ambient + taskFocus (tiruan sesi live) ==');
Math.random = mulberry32(26);
{
  const tr = new Tracker();
  tr.behavior.setTaskFocus('kai', 'Perbaiki bug sinkronisasi minimap');
  tr.behavior.setTaskFocus('luna', 'Bangun dashboard analytics');
  tr.behavior.setTaskFocus('aria', 'Rapat tinjauan sprint');
  tr.run(600);
  const runs = AGENTS.map((a) => ({ id: a.id, run: tr.longestRun(a.id, 'meeting') }));
  const worst = runs.reduce((m, r) => (r.run > m.run ? r : m), runs[0]);
  console.log(`  info: run 'meeting' terpanjang: ${runs.map((r) => `${r.id}:${r.run.toFixed(1)}d`).join(' ')}`);
  console.log(`  info: fraksi meeting: ${AGENTS.map((a) => `${a.id}:${(tr.meetingFraction(a.id) * 100).toFixed(0)}%`).join(' ')}`);
  check("taskFocus: tidak ada status 'meeting' yang menetap (>60 dtk)", worst.run <= 60, `${worst.id} ${worst.run.toFixed(1)} dtk`);
  check('taskFocus: fraksi meeting tetap <45% per agent', AGENTS.every((a) => tr.meetingFraction(a.id) < 0.45));
}

Math.random = originalRandom;

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
