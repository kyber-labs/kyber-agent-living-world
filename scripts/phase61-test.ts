// Uji logika murni perbaikan 6.1 — dijalankan lewat bundle rolldown
// (lihat perintah di bawah), karena `node` langsung gagal pada import
// tanpa ekstensi gaya Vite — sama seperti scripts/phase6-test.ts.
//   ./node_modules/.bin/rolldown scripts/phase61-test.ts --format esm --file /tmp/phase61-test.mjs && node /tmp/phase61-test.mjs
// Mencakup: hitung mundur acara sejak semua peserta berkumpul (bukan
// sejak acara dimulai), masa tenggang kedatangan, EventStore.markGathered,
// batas atas waktu tempuh (pembenaran angka tenggang 90 dtk), dan simulasi
// behavior: peserta yang sedang berjalan dialihkan ke acara lalu tiba
// sebelum masa tenggang habis. Bukan uji UI/browser.
import {
  EVENT_ARRIVAL_GRACE_SECONDS,
  arrivedParticipantIds,
  eventEndMs,
  eventSlotPositions,
  isEventExpired,
  isEventGathered,
} from '../src/simulation/eventLogic.ts';
import { EventStore } from '../src/simulation/eventStore.ts';
import { AgentBehavior } from '../src/simulation/behavior.ts';
import { findPath, getNode, NAV_NODES } from '../src/world/navigation/navGraph.ts';
import { AGENTS } from '../src/config/agents.ts';
import type { CityEvent } from '../src/types/event.ts';

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

const GRACE_MS = EVENT_ARRIVAL_GRACE_SECONDS * 1000;
const T0 = new Date('2026-11-23T10:00:00.000Z').getTime();
const iso = (ms: number): string => new Date(ms).toISOString();

function makeEvent(over: Partial<CityEvent> = {}): CityEvent {
  return {
    id: 'e-test',
    kind: 'show',
    title: 'Uji',
    locationId: 'stage',
    participantIds: ['aria', 'kai', 'luna'],
    status: 'active',
    startedAt: iso(T0),
    endedAt: null,
    durationSeconds: 180,
    gatheredAt: null,
    ...over,
  };
}

console.log('== hitung mundur sejak berkumpul ==');
check('masa tenggang 90 detik', EVENT_ARRIVAL_GRACE_SECONDS === 90);
const ungathered = makeEvent();
check(
  'belum berkumpul: berakhir = mulai + tenggang + durasi',
  eventEndMs(ungathered) === T0 + GRACE_MS + 180_000,
  `dapat ${eventEndMs(ungathered) - T0} ms`,
);
const gathered = makeEvent({ gatheredAt: iso(T0 + 45_000) });
check(
  'berkumpul di +45 dtk: berakhir = berkumpul + durasi (bukan mulai + durasi)',
  eventEndMs(gathered) === T0 + 45_000 + 180_000,
  `dapat ${eventEndMs(gathered) - T0} ms`,
);
check(
  'belum berkumpul: TIDAK kedaluwarsa saat durasi sejak mulai habis',
  !isEventExpired(ungathered, T0 + 180_000),
);
check(
  'belum berkumpul: kedaluwarsa saat tenggang + durasi habis',
  isEventExpired(ungathered, T0 + GRACE_MS + 180_000),
);
check(
  'berkumpul: TIDAK kedaluwarsa 1 dtk sebelum berkumpul + durasi',
  !isEventExpired(gathered, T0 + 45_000 + 180_000 - 1),
);
check(
  'berkumpul: kedaluwarsa tepat saat berkumpul + durasi',
  isEventExpired(gathered, T0 + 45_000 + 180_000),
);
const ended = makeEvent({ status: 'ended', gatheredAt: iso(T0 + 10_000) });
check('acara selesai tidak pernah kedaluwarsa', !isEventExpired(ended, T0 + 999_999_999));
// Acara lama (sebelum 6.1) tanpa field gatheredAt di localStorage.
const legacy = makeEvent();
delete (legacy as Partial<CityEvent>).gatheredAt;
check(
  'acara lama tanpa gatheredAt diperlakukan belum berkumpul',
  eventEndMs(legacy as CityEvent) === T0 + GRACE_MS + 180_000,
);

console.log('== deteksi kedatangan peserta ==');
const liveStates = {
  aria: { status: 'entertainment', location: 'Panggung Hiburan' },
  kai: { status: 'moving', location: 'Plaza' },
  luna: { status: 'idle', location: 'Plaza' },
};
check(
  'arrivedParticipantIds: hanya Aria yang tiba',
  JSON.stringify(arrivedParticipantIds(ungathered, liveStates)) === JSON.stringify(['aria']),
);
check('isEventGathered: false bila masih ada yang berjalan', !isEventGathered(ungathered, liveStates));
const allThere = {
  aria: { status: 'entertainment', location: 'Panggung Hiburan' },
  kai: { status: 'entertainment', location: 'Panggung Hiburan' },
  luna: { status: 'entertainment', location: 'Panggung Hiburan' },
};
check('isEventGathered: true bila semua berstatus Hiburan', isEventGathered(ungathered, allThere));

console.log('== EventStore.markGathered ==');
mem.clear();
const store = new EventStore();
const ev = store.startEvent({ kind: 'show', title: 'Uji', participantIds: ['aria', 'kai'], durationSeconds: 60 });
check('acara baru: gatheredAt null', ev.gatheredAt === null);
store.markGathered(ev.id);
const afterMark = store.getEvents().find((x) => x.id === ev.id);
check('markGathered mengisi gatheredAt', typeof afterMark?.gatheredAt === 'string');
const firstMark = afterMark?.gatheredAt;
store.markGathered(ev.id);
check(
  'markGathered kedua tidak mengubah waktu yang sudah tercatat',
  store.getEvents().find((x) => x.id === ev.id)?.gatheredAt === firstMark,
);
const store2 = new EventStore();
check(
  'gatheredAt tersimpan di localStorage (muat ulang)',
  store2.getEvents().find((x) => x.id === ev.id)?.gatheredAt === firstMark,
);
store.endEvent(ev.id);
store.markGathered(ev.id);
check(
  'markGathered pada acara yang sudah berakhir tidak berpengaruh',
  store.getEvents().find((x) => x.id === ev.id)?.gatheredAt === firstMark,
);
console.log('== EventStore.endExpired dengan tenggang ==');
// Store baru supaya id acara unik: id dibuat dari Date.now() (resolusi
// milidetik) sehingga dua startEvent dalam milidetik yang sama bisa
// bertabrakan — itu pola id yang sudah ada sejak Phase 6, bukan bagian 6.1.
mem.clear();
const store3 = new EventStore();
const ev3 = store3.startEvent({ kind: 'match', title: 'Uji 3', participantIds: ['aria', 'kai'], durationSeconds: 60 });
const start3 = new Date(ev3.startedAt).getTime();
check('acara baru tidak kedaluwarsa sebelum tenggang + durasi', !isEventExpired(ev3, start3 + 60_000));
store3.endExpired(start3 + 61_000);
check(
  'endExpired tidak mengakhiri acara yang masih dalam tenggang',
  store3.getEvents().find((x) => x.id === ev3.id)?.status === 'active',
);
store3.markGathered(ev3.id);
const gatheredMs = new Date(store3.getEvents().find((x) => x.id === ev3.id)?.gatheredAt ?? '').getTime();
store3.endExpired(gatheredMs + 30_000);
check(
  'setelah berkumpul, endExpired menunggu durasi sejak berkumpul',
  store3.getEvents().find((x) => x.id === ev3.id)?.status === 'active',
);
store3.endExpired(gatheredMs + 60_000);
check(
  'setelah berkumpul + durasi, endExpired mengakhiri acara',
  store3.getEvents().find((x) => x.id === ev3.id)?.status === 'ended',
);

console.log('== batas atas waktu tempuh (pembenaran tenggang 90 dtk) ==');
let maxTravel = 0;
for (const from of NAV_NODES) {
  for (const to of NAV_NODES) {
    const path = findPath(from.id, to.id);
    let dist = 0;
    for (let i = 1; i < path.length; i++) {
      const a = getNode(path[i - 1]);
      const b = getNode(path[i]);
      if (!a || !b) continue;
      dist += Math.hypot(b.x - a.x, b.z - a.z);
    }
    maxTravel = Math.max(maxTravel, dist / 2.2);
  }
}
// Batas 55 dtk (diperbarui 8.2): graf membesar 11 → 20 simpul, rute BFS
// terjauh kini mosque→tower = 50,0 dtk (dulu < 30 dtk dengan 11 simpul).
// Batas 55 memberi margin ~10% di atas nilai terukur yang deterministik
// (hanya bergantung pada geometri graf yang tetap). Pembenaran tenggang
// 90 dtk tetap berlaku: 50,0 + 25 = 75,0 < 90 (lihat asersi berikutnya).
check(
  'rute BFS terjauh antar simpul < 55 dtk pada 2,2 unit/dtk',
  maxTravel < 55,
  `terjauh ${maxTravel.toFixed(1)} dtk`,
);
check(
  'rute terjauh + sisa perjalanan yang sedang ditempuh (~25 dtk) tetap < 90 dtk',
  maxTravel + 25 < 90,
  `total ${Math.ceil(maxTravel + 25)} dtk`,
);

console.log('== behavior: peserta dialihkan lalu tiba sebelum tenggang ==');
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
// Biarkan agent berjalan 5 detik ke tujuan acak dulu (kasus live: peserta
// sedang dalam perjalanan saat acara dimulai), baru tetapkan acara.
let now = 0;
for (let i = 0; i < 50; i++) {
  now += 0.1;
  behavior.update(0.1, now);
}
const showSlots = eventSlotPositions('show', 2);
behavior.setEvent('aria', {
  locationId: 'stage',
  locationName: 'Panggung Hiburan',
  nodeId: 'stage',
  x: -25,
  z: -12,
  slotX: showSlots[0].x,
  slotZ: showSlots[0].z,
  status: 'entertainment',
});
behavior.setEvent('kai', {
  locationId: 'stage',
  locationName: 'Panggung Hiburan',
  nodeId: 'stage',
  x: -25,
  z: -12,
  slotX: showSlots[1].x,
  slotZ: showSlots[1].z,
  status: 'entertainment',
});
let arrivedAt: number | null = null;
for (let i = 0; i < 900 && arrivedAt === null; i++) {
  now += 0.1;
  behavior.update(0.1, now);
  if (seen.aria?.status === 'entertainment' && seen.kai?.status === 'entertainment') {
    arrivedAt = now - 5; // waktu sejak acara ditetapkan
  }
}
check(
  'kedua peserta tiba di Panggung (dialihkan dari perjalanan acak)',
  arrivedAt !== null,
  `status Aria: ${seen.aria?.status}, Kai: ${seen.kai?.status}`,
);
check(
  'tiba sebelum masa tenggang 90 dtk habis',
  arrivedAt !== null && arrivedAt < EVENT_ARRIVAL_GRACE_SECONDS,
  `tiba setelah ${arrivedAt?.toFixed(1) ?? '?'} dtk`,
);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
