// Uji logika murni Phase 5 — dijalankan dengan Node (type stripping).
// Mencakup: drift vital, validasi meeting, jam harian, slot room, dan
// MeetingStore (dengan stub localStorage). Bukan uji UI/browser.
import { driftVitals, formatClock, periodOf, LifeSim } from '../src/simulation/lifeSim.ts';
import { roomSlotPositions, validateStartMeeting } from '../src/simulation/meetingLogic.ts';
import { MeetingStore } from '../src/simulation/meetingStore.ts';
import { MEETING_ROOMS } from '../src/types/meeting.ts';
import { AGENTS } from '../src/config/agents.ts';
import type { Meeting } from '../src/types/meeting.ts';

// Stub localStorage untuk Node.
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
};

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  lulus: ${name}`);
  } else {
    failed += 1;
    console.log(`  GAGAL: ${name} ${detail}`);
  }
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

console.log('== jam harian ==');
check('periodOf 08:00 = pagi', periodOf(480) === 'pagi');
check('periodOf 12:00 = siang', periodOf(720) === 'siang');
check('periodOf 16:00 = sore', periodOf(960) === 'sore');
check('periodOf 20:00 = malam', periodOf(1200) === 'malam');
check('periodOf 00:00 = malam', periodOf(0) === 'malam');
check('formatClock 480 = 08:00', formatClock(480) === '08:00');
check('formatClock 1439 = 23:59', formatClock(1439) === '23:59');

console.log('== drift vital ==');
const base = { energy: 85, focus: 80, mood: 78 };
const worked = driftVitals(base, 'working', 1, 'cerah');
check('bekerja 1 jam: energi 85->82', near(worked.energy, 82), `dapat ${worked.energy}`);
check('bekerja 1 jam: fokus 80->78', near(worked.focus, 78), `dapat ${worked.focus}`);
check('bekerja 1 jam: mood 78->77.8 (cerah)', near(worked.mood, 77.8), `dapat ${worked.mood}`);
const rested = driftVitals(base, 'resting', 1, 'cerah');
check('istirahat 1 jam: energi 85->91', near(rested.energy, 91), `dapat ${rested.energy}`);
check('istirahat 1 jam: mood 78->79.3', near(rested.mood, 79.3), `dapat ${rested.mood}`);
const capped = driftVitals({ energy: 99, focus: 99, mood: 99 }, 'resting', 1, 'cerah');
check('vital dijepit maks 100', capped.energy === 100 && capped.focus === 100 && capped.mood === 100);
const drained = driftVitals({ energy: 10, focus: 10, mood: 1 }, 'error', 5, 'hujan');
check('vital dijepit min 0', drained.mood === 0 && drained.energy === 5, `dapat ${JSON.stringify(drained)}`);
const lowEnergy = driftVitals({ energy: 20, focus: 80, mood: 78 }, 'idle', 1, 'cerah');
check('energi <25 menekan mood (77.8, bukan 78.8)', near(lowEnergy.mood, 77.8), `dapat ${lowEnergy.mood}`);
const rainy = driftVitals(base, 'working', 1, 'hujan');
check('hujan menurunkan mood dibanding cerah', rainy.mood < worked.mood, `${rainy.mood} vs ${worked.mood}`);

console.log('== validasi meeting ==');
const room3 = MEETING_ROOMS[2]; // Ruang Desain, kapasitas 6
const noMeetings: Meeting[] = [];
check('topik kosong ditolak', validateStartMeeting(room3, '  ', ['aria', 'kai'], noMeetings, AGENTS) !== null);
check('1 peserta ditolak', validateStartMeeting(room3, 'Topik', ['aria'], noMeetings, AGENTS) !== null);
check(
  '7 peserta melebihi kapasitas 6 ditolak',
  validateStartMeeting(room3, 'Topik', ['aria', 'kai', 'luna', 'max', 'nova', 'leo', 'zoe'], noMeetings, AGENTS) !== null,
);
check(
  '2 peserta valid diterima',
  validateStartMeeting(room3, 'Topik', ['aria', 'kai'], noMeetings, AGENTS) === null,
);
const busy: Meeting[] = [
  {
    id: 'm1',
    roomId: 'room-3',
    topic: 'Ada',
    agenda: '',
    participantIds: ['aria', 'kai'],
    status: 'active',
    startedAt: new Date().toISOString(),
    endedAt: null,
    notes: [],
  },
];
check(
  'room sedang dipakai ditolak',
  validateStartMeeting(room3, 'Topik', ['luna', 'max'], busy, AGENTS) !== null,
);
check(
  'peserta sudah ikut meeting lain ditolak',
  validateStartMeeting(MEETING_ROOMS[0], 'Topik', ['aria', 'max'], busy, AGENTS) !== null,
);

console.log('== slot room ==');
const slots = roomSlotPositions(MEETING_ROOMS[0], 4);
check('4 peserta = 4 slot', slots.length === 4);
const dists = slots.map((s) => Math.hypot(s.x - MEETING_ROOMS[0].x, s.z - MEETING_ROOMS[0].z));
check('semua slot berjari-jari 1,3 dari pusat', dists.every((d) => near(d, 1.3)), `dapat ${dists.join(',')}`);
check(
  'slot berbeda satu sama lain',
  new Set(slots.map((s) => `${s.x.toFixed(3)},${s.z.toFixed(3)}`)).size === 4,
);

console.log('== LifeSim ==');
const sim = new LifeSim(AGENTS.map((a) => a.id));
const snap = sim.update(60, new Map());
// Phase 9: jam awal 15:00 (900) — 60 dtk nyata = 900 + 144 = 1044 (17:24, Sore).
check('update 60 dtk nyata = +144 menit simulasi', snap !== null && snap.env.minutesOfDay === 1044, `dapat ${snap?.env.minutesOfDay}`);
check('periode 17:24 masih sore', snap !== null && snap.env.period === 'sore');
check('idle 144 menit menaikkan energi', snap !== null && snap.vitals.aria.energy > 85, `dapat ${snap?.vitals.aria.energy}`);

console.log('== MeetingStore ==');
mem.clear();
const store = new MeetingStore();
check('seed: 1 meeting contoh selesai', store.getMeetings().length === 1 && store.getMeetings()[0].status === 'ended');
const m = store.startMeeting({ roomId: 'room-2', topic: 'Uji', agenda: '', participantIds: ['aria', 'kai'] });
check('meeting baru berstatus active', m.status === 'active' && store.getMeetings().length === 2);
store.addNote(m.id, null, 'Catatan Bos.');
check('catatan bersama tersimpan', store.getMeetings().find((x) => x.id === m.id)?.notes.length === 1);
store.endMeeting(m.id);
check('akhiri meeting -> ended + endedAt terisi', store.getMeetings().find((x) => x.id === m.id)?.status === 'ended');
const store2 = new MeetingStore();
check('meeting tersimpan di localStorage (muat ulang)', store2.getMeetings().length === 2);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
