// Uji logika murni Phase 8.1 — dijalankan lewat bundle rolldown
// (lihat scripts/run-all-tests.sh; `node scripts/phase81-test.ts`
// langsung gagal karena import tanpa ekstensi gaya Vite — bukan cacat).
// Mengunci: ActivityStore (tambah/urutan/batas 50/persist/hapus/
// langganan), formatWib (HH:MM:SS zona Asia/Jakarta), dan definisi
// hitungan header "aktif"/"berjalan" (countAgentActivity).
// Bukan uji UI/browser; toast, sidebar, dan toggle Atur diverifikasi
// live oleh parent setelah deploy.
import { ActivityStore, MAX_ACTIVITY_ENTRIES, countAgentActivity } from '../src/simulation/activityStore.ts';
import { formatWib } from '../src/simulation/wallClock.ts';
import type { LiveAgentState } from '../src/types/agent.ts';

// Stub localStorage dalam memori — ActivityStore membaca/menulisnya di
// constructor/emit. Dipasang sebelum store mana pun dibuat (modul store
// sendiri tidak menyentuh localStorage saat di-import).
const mem = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
  clear: () => {
    mem.clear();
  },
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
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

// ---------- 1. ActivityStore: mulai kosong, tambah, urutan ----------
mem.clear();
const store = new ActivityStore();
check('store baru dari storage kosong: 0 entri', store.getEntries().length === 0);

const first = store.add('Tugas baru: "Uji A"');
check('add satu entri: length 1', store.getEntries().length === 1);
check('add satu entri: teks tersimpan', store.getEntries()[0]?.text === 'Tugas baru: "Uji A"');
check(
  'add satu entri: time ≈ sekarang',
  Math.abs((store.getEntries()[0]?.time ?? 0) - Date.now()) < 5000,
);
store.add('Meeting dimulai: "Uji B"');
check(
  'urutan: terbaru di atas (index 0 = entri terakhir)',
  store.getEntries()[0]?.text === 'Meeting dimulai: "Uji B"' &&
    store.getEntries()[1]?.text === 'Tugas baru: "Uji A"',
);
check('id entri pertama tidak kosong', first.id.length > 0);

// ---------- 2. Batas 50 entri ----------
for (let i = 0; i < 55; i++) store.add(`Kejadian ${i}`);
const entries = store.getEntries();
check('batas: 55 tambah → length tetap 50', entries.length === MAX_ACTIVITY_ENTRIES, `dapat ${entries.length}`);
check(
  'batas: entri tertua dibuang ("Uji A" sudah tidak ada)',
  !entries.some((e) => e.text.includes('Uji A')),
);
check('batas: entri terbaru masih ada', entries[0]?.text === 'Kejadian 54');

// ---------- 3. Persistensi localStorage ----------
const reloaded = new ActivityStore();
check(
  'persist: store baru membaca storage yang sama (50 entri)',
  reloaded.getEntries().length === 50,
  `dapat ${reloaded.getEntries().length}`,
);
check(
  'persist: entri terbaru sama setelah muat ulang',
  reloaded.getEntries()[0]?.text === 'Kejadian 54',
);

// ---------- 4. Hapus riwayat ----------
reloaded.clear();
check('clear: 0 entri', reloaded.getEntries().length === 0);
const afterClear = new ActivityStore();
check('clear: tersimpan kosong (store baru juga 0)', afterClear.getEntries().length === 0);

// ---------- 5. Langganan ----------
mem.clear();
const subStore = new ActivityStore();
let notified = 0;
subStore.subscribe(() => {
  notified += 1;
});
subStore.add('Acara dimulai: "Uji C"');
check('subscribe: listener dipanggil saat add', notified === 1, `dapat ${notified}`);

// ---------- 6. Storage rusak → mulai kosong, tidak throw ----------
mem.set('living-world-activity-v1', '{bukan json');
let broken: ActivityStore | null = null;
let threw = false;
try {
  broken = new ActivityStore();
} catch {
  threw = true;
}
check('storage rusak: tidak throw', !threw);
check('storage rusak: mulai kosong', broken !== null && broken.getEntries().length === 0);

// ---------- 7. Id unik saat tambah cepat (pola flaky Date.now() 6.1) ----------
mem.clear();
const fast = new ActivityStore();
const ids = new Set<string>();
for (let i = 0; i < 20; i++) ids.add(fast.add(`Cepat ${i}`).id);
check('id unik: 20 tambah cepat → 20 id berbeda', ids.size === 20, `dapat ${ids.size}`);

// ---------- 8. formatWib (HH:MM:SS, Asia/Jakarta = UTC+7) ----------
check(
  'formatWib: 09:43:25Z → 16:43:25 WIB',
  formatWib(new Date('2026-11-23T09:43:25.000Z')) === '16:43:25',
  `dapat ${formatWib(new Date('2026-11-23T09:43:25.000Z'))}`,
);
check(
  'formatWib: tengah malam 17:00:00Z → 00:00:00 (bukan 24:00:00)',
  formatWib(new Date('2026-11-23T17:00:00.000Z')) === '00:00:00',
  `dapat ${formatWib(new Date('2026-11-23T17:00:00.000Z'))}`,
);
check(
  'formatWib: nol di depan dipertahankan (02:05:07Z → 09:05:07)',
  formatWib(new Date('2026-11-23T02:05:07.000Z')) === '09:05:07',
  `dapat ${formatWib(new Date('2026-11-23T02:05:07.000Z'))}`,
);

// ---------- 9. countAgentActivity (definisi hitungan header 8.1) ----------
const mixed: LiveAgentState = {
  aria: { status: 'idle', location: 'Plaza' },
  kai: { status: 'working', location: 'Plaza' },
  luna: { status: 'moving', location: 'Plaza' },
  max: { status: 'moving', location: 'Plaza' },
  nova: { status: 'meeting', location: 'Plaza' },
  leo: { status: 'sports', location: 'Arena' },
  zoe: { status: 'idle', location: 'Plaza' },
};
const mixedCount = countAgentActivity(mixed);
check(
  'count: campuran 7 agent (2 idle) → aktif 5, berjalan 2',
  mixedCount.active === 5 && mixedCount.moving === 2,
  JSON.stringify(mixedCount),
);
const allIdle: LiveAgentState = {
  aria: { status: 'idle', location: 'Plaza' },
  kai: { status: 'idle', location: 'Plaza' },
};
const idleCount = countAgentActivity(allIdle);
check('count: semua idle → aktif 0, berjalan 0', idleCount.active === 0 && idleCount.moving === 0);
check(
  'count: map kosong → aktif 0, berjalan 0',
  countAgentActivity({}).active === 0 && countAgentActivity({}).moving === 0,
);
const missing: LiveAgentState = {
  // Agent tanpa status live (belum ada emisi engine) dihitung menganggur.
  aria: { status: 'idle', location: 'Plaza' },
};
check(
  'count: hanya idle → berjalan 0 (moving tidak ikut terhitung)',
  countAgentActivity(missing).moving === 0,
);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
