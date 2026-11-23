// Uji logika murni Phase 6 — dijalankan dengan Node (type stripping).
// Mencakup: drift vital olahraga/hiburan, validasi + slot acara,
// EventStore (termasuk kedaluwarsa), validasi penempatan builder,
// WorldObjectStore, agregasi analytics + export CSV, dan simulasi
// behavior untuk penugasan acara. Bukan uji UI/browser.
import { driftVitals } from '../src/simulation/lifeSim.ts';
import { eventSlotPositions, isEventExpired, validateStartEvent } from '../src/simulation/eventLogic.ts';
import { EventStore } from '../src/simulation/eventStore.ts';
import { defaultRotation, validatePlacement } from '../src/simulation/builderLogic.ts';
import { WorldObjectStore } from '../src/simulation/worldObjectStore.ts';
import { computeAnalytics, analyticsToCsv } from '../src/simulation/analytics.ts';
import { AgentBehavior } from '../src/simulation/behavior.ts';
import { AGENTS } from '../src/config/agents.ts';
import type { Meeting } from '../src/types/meeting.ts';
import type { CityEvent } from '../src/types/event.ts';
import type { Task } from '../src/types/task.ts';
import type { LiveAgentState } from '../src/types/agent.ts';

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

const noMeetings: Meeting[] = [];
const noEvents: CityEvent[] = [];

console.log('== drift vital olahraga/hiburan ==');
const base = { energy: 85, focus: 80, mood: 78 };
const sport = driftVitals(base, 'sports', 1, 'cerah');
check('olahraga 1 jam: energi 85->83', near(sport.energy, 83), `dapat ${sport.energy}`);
check('olahraga 1 jam: mood 78->80,3 (cerah)', near(sport.mood, 80.3), `dapat ${sport.mood}`);
const show = driftVitals(base, 'entertainment', 1, 'cerah');
check('hiburan 1 jam: energi 85->84', near(show.energy, 84), `dapat ${show.energy}`);
check('hiburan 1 jam: mood 78->80,8 (cerah)', near(show.mood, 80.8), `dapat ${show.mood}`);

console.log('== validasi acara ==');
check(
  'judul kosong ditolak',
  validateStartEvent('match', '  ', ['aria', 'kai'], noEvents, noMeetings, AGENTS) !== null,
);
check(
  '1 peserta ditolak',
  validateStartEvent('match', 'Main', ['aria'], noEvents, noMeetings, AGENTS) !== null,
);
check(
  '2 peserta valid diterima',
  validateStartEvent('match', 'Main', ['aria', 'kai'], noEvents, noMeetings, AGENTS) === null,
);
const busyMeeting: Meeting[] = [
  {
    id: 'm1',
    roomId: 'room-1',
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
  'peserta sedang meeting ditolak',
  validateStartEvent('match', 'Main', ['aria', 'max'], noEvents, busyMeeting, AGENTS) !== null,
);
const busyEvent: CityEvent[] = [
  {
    id: 'e1',
    kind: 'match',
    title: 'Ada',
    locationId: 'arena',
    participantIds: ['luna', 'max'],
    status: 'active',
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSeconds: 180,
  },
];
check(
  'lokasi sedang dipakai acara lain ditolak',
  validateStartEvent('match', 'Main', ['aria', 'kai'], busyEvent, noMeetings, AGENTS) !== null,
);
check(
  'peserta sudah ikut acara lain ditolak',
  validateStartEvent('show', 'Tampil', ['luna', 'aria'], busyEvent, noMeetings, AGENTS) !== null,
);

console.log('== slot acara ==');
const matchSlots = eventSlotPositions('match', 4);
check('pertandingan: 4 slot', matchSlots.length === 4);
const matchDists = matchSlots.map((s) => Math.hypot(s.x - 25, s.z - -12));
check('pertandingan: slot berjari-jari 3,5 dari pusat arena', matchDists.every((d) => near(d, 3.5)), `dapat ${matchDists.join(',')}`);
const showSlots = eventSlotPositions('show', 3);
check('pertunjukan: 3 slot', showSlots.length === 3);
check(
  'pertunjukan: slot di depan panggung (z > -12, dekat z -6)',
  showSlots.every((s) => s.z > -12 && s.z <= -3 && Math.abs(s.x + 25) <= 3.1),
  `dapat ${JSON.stringify(showSlots)}`,
);

console.log('== EventStore ==');
mem.clear();
const eventStore = new EventStore();
check('seed: 1 acara contoh selesai', eventStore.getEvents().length === 1 && eventStore.getEvents()[0].status === 'ended');
const ev = eventStore.startEvent({ kind: 'show', title: 'Uji', participantIds: ['aria', 'kai'], durationSeconds: 60 });
check('acara baru berstatus active', ev.status === 'active' && eventStore.getEvents().length === 2);
const startMs = new Date(ev.startedAt).getTime();
check('belum kedaluwarsa sebelum durasi habis', !isEventExpired(ev, startMs + 30_000));
eventStore.endExpired(startMs + 61_000);
check(
  'kedaluwarsa setelah durasi habis -> ended',
  eventStore.getEvents().find((x) => x.id === ev.id)?.status === 'ended',
);
const eventStore2 = new EventStore();
check('acara tersimpan di localStorage (muat ulang)', eventStore2.getEvents().length === 2);

console.log('== validasi penempatan builder ==');
const buildings = [
  { id: 'hq', name: 'Gedung Kantor Pusat', kind: 'office' as const, x: 0, z: -22, w: 16, d: 10, color: '#7d93a8' },
  { id: 'arena', name: 'Arena Olahraga', kind: 'arena' as const, x: 25, z: -12, w: 16, d: 16, color: '#c96f4a' },
];
check('di luar batas (±40) ditolak', validatePlacement(41, 0, [], buildings) !== null);
check('di dalam gedung ditolak', validatePlacement(0, -22, [], buildings) !== null);
check('di dalam arena ditolak', validatePlacement(25, -12, [], buildings) !== null);
check('di tepi gedung (margin 1) ditolak', validatePlacement(8.5, -22, [], buildings) !== null);
check(
  'dekat objek lain (<1,5) ditolak',
  validatePlacement(10.5, 10, [{ id: 'o1', kind: 'tree' as const, x: 10, z: 10, rotY: 0, createdAt: '' }], buildings) !== null,
);
check('rumput kosong diterima', validatePlacement(10, 10, [], buildings) === null);
check('bangku menghadap plaza', near(defaultRotation('bench', 8, 8), Math.atan2(-8, -8)));
check('pohon rotasi 0', defaultRotation('tree', 8, 8) === 0);

console.log('== WorldObjectStore ==');
mem.clear();
const objStore = new WorldObjectStore();
check('seed: 2 objek contoh', objStore.getObjects().length === 2);
const obj = objStore.addObject({ kind: 'fountain', x: 12, z: 12 });
check('tambah objek -> 3 objek', objStore.getObjects().length === 3 && obj.kind === 'fountain');
objStore.moveObject(obj.id, -12, -12);
const moved = objStore.getObjects().find((o) => o.id === obj.id);
check('pindah objek mengubah posisi', moved?.x === -12 && moved?.z === -12);
objStore.deleteObject(obj.id);
check('hapus objek -> kembali 2 objek', objStore.getObjects().length === 2);
const objStore2 = new WorldObjectStore();
check('objek tersimpan di localStorage (muat ulang)', objStore2.getObjects().length === 2);

console.log('== analytics ==');
const tasks: Task[] = [
  { id: 't1', title: 'A', description: '', status: 'todo', priority: 'high', assigneeId: 'kai', deadline: '2026-01-01', dependsOn: [], createdAt: '', updatedAt: '' },
  { id: 't2', title: 'B', description: '', status: 'doing', priority: 'low', assigneeId: 'kai', deadline: null, dependsOn: [], createdAt: '', updatedAt: '' },
  { id: 't3', title: 'C', description: '', status: 'done', priority: 'medium', assigneeId: 'luna', deadline: null, dependsOn: [], createdAt: '', updatedAt: '' },
];
const meetings: Meeting[] = [
  {
    id: 'm1', roomId: 'room-1', topic: 'Rapat', agenda: '', participantIds: ['aria', 'kai'],
    status: 'ended', startedAt: '2026-11-23T08:00:00.000Z', endedAt: '2026-11-23T08:45:00.000Z',
    notes: [{ id: 'n1', authorId: null, text: 'Catatan', createdAt: '2026-11-23T08:10:00.000Z' }],
  },
];
const events: CityEvent[] = [
  {
    id: 'e1', kind: 'match', title: 'Main', locationId: 'arena', participantIds: ['kai', 'leo'],
    status: 'ended', startedAt: '2026-11-23T09:00:00.000Z', endedAt: '2026-11-23T09:03:00.000Z', durationSeconds: 180,
  },
];
const liveStates: LiveAgentState = Object.fromEntries(
  AGENTS.map((a) => [a.id, { status: a.id === 'kai' ? 'working' : 'idle', location: 'Plaza' }]),
) as LiveAgentState;
const vitals = Object.fromEntries(AGENTS.map((a) => [a.id, { energy: 80, focus: 70, mood: 90 }]));
const data = computeAnalytics({
  tasks,
  meetings,
  events,
  liveStates,
  vitals,
  env: { minutesOfDay: 600, period: 'pagi', weather: 'cerah' },
  objects: objStore2.getObjects(),
  agents: AGENTS,
  now: new Date('2026-11-23T12:00:00.000Z'),
});
check('tugas: total 3, todo/doing/done 1/1/1', data.tasks.total === 3 && data.tasks.todo === 1 && data.tasks.doing === 1 && data.tasks.done === 1);
check('tugas: selesai 33%', data.tasks.donePct === 33, `dapat ${data.tasks.donePct}`);
check('tugas: 1 terlambat (deadline lewat, belum selesai)', data.tasks.overdue === 1, `dapat ${data.tasks.overdue}`);
check('tugas: pemegang terbanyak Kai (2)', data.tasks.topAssignee?.name === 'Kai' && data.tasks.topAssignee.count === 2);
check('meeting: total durasi 45 menit', data.meetings.totalMinutes === 45, `dapat ${data.meetings.totalMinutes}`);
check('meeting: peserta tersering 1× (seri)', data.meetings.topParticipant?.count === 1);
check('meeting: 1 catatan', data.meetings.notesTotal === 1);
check('acara: 1 pertandingan selesai', data.events.total === 1 && data.events.matches === 1 && data.events.ended === 1);
check('aktivitas: 1 bekerja, 9 menganggur', data.activity.byStatus.working === 1 && data.activity.byStatus.idle === 9);
check('vital: rata-rata energi 80, mood 90', data.vitals.avgEnergy === 80 && data.vitals.avgMood === 90);
check('objek: 2 objek (1 bangku, 1 lampu)', data.objects.total === 2 && data.objects.byKind.bench === 1 && data.objects.byKind.lamp === 1);
const csv = analyticsToCsv(data);
check('CSV: header + baris tugas total', csv.startsWith('Bagian,Metrik,Nilai\n') && csv.includes('Tugas,Total,3'));
check('CSV: baris meeting durasi', csv.includes('Meeting,Total durasi (menit),45'));

console.log('== behavior: penugasan acara ==');
const positions = AGENTS.map((a, i) => {
  const angle = (i / AGENTS.length) * Math.PI * 2;
  return { id: a.id, x: Math.cos(angle) * 5.5, z: Math.sin(angle) * 5.5 };
});
const seen: Record<string, { status: string; x: number; z: number }> = {};
const behavior = new AgentBehavior(AGENTS, positions, {
  onMove: (id, x, z) => {
    seen[id] = { ...(seen[id] ?? { status: 'idle' }), x, z };
  },
  onStatus: (id, status) => {
    seen[id] = { ...(seen[id] ?? { x: 0, z: 0 }), status };
  },
});
const slots = eventSlotPositions('match', 2);
behavior.setEvent('aria', {
  locationId: 'arena',
  locationName: 'Arena Olahraga',
  nodeId: 'arena',
  x: 25,
  z: -12,
  slotX: slots[0].x,
  slotZ: slots[0].z,
  status: 'sports',
});
behavior.setEvent('kai', {
  locationId: 'arena',
  locationName: 'Arena Olahraga',
  nodeId: 'arena',
  x: 25,
  z: -12,
  slotX: slots[1].x,
  slotZ: slots[1].z,
  status: 'sports',
});
// Majukan simulasi 60 detik (tick 0,1 dtk): jarak plaza->arena ~20 unit,
// kecepatan 2,2 unit/dtk -> tiba < 30 dtk.
let now = 0;
for (let i = 0; i < 600; i++) {
  now += 0.1;
  behavior.update(0.1, now);
}
check('peserta acara tiba dan berstatus Olahraga', seen.aria?.status === 'sports', `dapat ${seen.aria?.status}`);
const ariaDist = Math.hypot((seen.aria?.x ?? 0) - slots[0].x, (seen.aria?.z ?? 0) - slots[0].z);
check('peserta acara berdiri di slotnya', ariaDist < 0.5, `jarak ${ariaDist.toFixed(2)}`);
behavior.setEvent('aria', null);
behavior.setEvent('kai', null);
for (let i = 0; i < 50; i++) {
  now += 0.1;
  behavior.update(0.1, now);
}
check('acara dicabut -> peserta bubar (tidak lagi Olahraga)', seen.aria?.status !== 'sports', `dapat ${seen.aria?.status}`);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
