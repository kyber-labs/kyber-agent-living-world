// Uji logika murni Patch 4.1 — detail error asli di fallback + default model.
// Dijalankan lewat bundle rolldown (lihat scripts/run-all-tests.sh;
// `node scripts/phase41-test.ts` langsung gagal karena import tanpa
// ekstensi gaya Vite — bukan cacat).
// Yang diuji: formatLlmErrorDetail (status HTTP, non-Error, pesan kosong,
// pemangkasan) dan wiring-nya di engine (chat + pickAgentForTask memakai
// detail asli di teks fallback, live=false tetap). Bukan uji UI/browser;
// jalur gagal TIDAK bisa diuji live tanpa merusak key/env — verifikasi
// live hanya jalur sukses (chat + penugasan otomatis tetap live).
import { LLM_ERROR_DETAIL_MAX_LENGTH, formatLlmErrorDetail } from '../src/ai/errorDetail.ts';
import { AgentEngine } from '../src/ai/engine.ts';
import type { LlmClient } from '../src/ai/llm.ts';
import type { Agent } from '../src/types/agent.ts';
import type { Task } from '../src/types/task.ts';

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

// ---------- 1. formatLlmErrorDetail: status HTTP termuat ----------
console.log('== 4.1: detail error HTTP ==');
check('429 termuat', formatLlmErrorDetail(new Error('Gemini HTTP 429: {"error":{"code":429,"message":"Quota exceeded"}}')).includes('429'));
check('403 termuat', formatLlmErrorDetail(new Error('Gemini HTTP 403: API key not valid.')).includes('403'));
check('404 termuat', formatLlmErrorDetail(new Error('Gemini HTTP 404: models/gemini-2.5-flash is not found')).includes('404'));
check('503 termuat', formatLlmErrorDetail(new Error('Gemini HTTP 503: The service is currently unavailable.')).includes('503'));
check('jawaban kosong termuat', formatLlmErrorDetail(new Error('Gemini mengembalikan jawaban kosong.')).includes('jawaban kosong'));

// ---------- 2. formatLlmErrorDetail: non-Error + pesan kosong ----------
console.log('== 4.1: non-Error dan pesan kosong ==');
check('string non-Error dikembalikan apa adanya', formatLlmErrorDetail('koneksi terputus') === 'koneksi terputus');
check('number non-Error jadi string', formatLlmErrorDetail(42) === '42');
check("Error('') -> 'error tidak dikenal'", formatLlmErrorDetail(new Error('')) === 'error tidak dikenal');
check("Error('   ') -> 'error tidak dikenal'", formatLlmErrorDetail(new Error('   ')) === 'error tidak dikenal');
check('null aman, tidak throw', typeof formatLlmErrorDetail(null) === 'string');

// ---------- 3. formatLlmErrorDetail: pemangkasan ----------
console.log('== 4.1: pemangkasan ==');
const long = formatLlmErrorDetail(new Error('x'.repeat(300)));
check('pesan panjang dipangkas 160 + ellipsis', long.length === LLM_ERROR_DETAIL_MAX_LENGTH + 1 && long.endsWith('…'));
check('pesan pendek tidak berubah', formatLlmErrorDetail(new Error('abc')) === 'abc');
check('konstanta batas 160', LLM_ERROR_DETAIL_MAX_LENGTH === 160);

// ---------- 4. Wiring engine: chat ----------
console.log('== 4.1: wiring engine (chat) ==');
const fakeAgent: Agent = { id: 'aria', name: 'Aria', role: 'Project Manager', color: '#6366F1', status: 'idle', description: 'Mengelola proyek.' };
const fakeTask: Task = { id: 'task-1', title: 'Perbaiki bug login', description: '', status: 'todo', priority: 'high', assigneeId: null, deadline: null, dependsOn: [], createdAt: '2026-11-23', updatedAt: '2026-11-23' };
const agents: Agent[] = [
  fakeAgent,
  { id: 'kai', name: 'Kai', role: 'Software Developer', color: '#0EA5E9', status: 'idle', description: 'Menulis kode.' },
];

function throwingClient(err: unknown): LlmClient {
  return {
    name: 'Gemini gemini-3.5-flash-lite',
    mode: 'live',
    complete: async (): Promise<string> => {
      throw err;
    },
  };
}

const chatResult = await new AgentEngine(
  throwingClient(new Error('Gemini HTTP 429: Quota exceeded')),
).chat(fakeAgent, 'idle', 'Plaza', [], 'Halo, apa kabar?', []);
check('chat fallback tetap berawalan SIMULASI:', chatResult.text.startsWith('SIMULASI:'));
check('chat fallback memuat status 429', chatResult.text.includes('429'));
check('chat fallback live=false', chatResult.live === false);

// ---------- 5. Wiring engine: penugasan otomatis ----------
console.log('== 4.1: wiring engine (penugasan otomatis) ==');
const assignResult = await new AgentEngine(
  throwingClient(new Error('Gemini HTTP 503: Service Unavailable')),
).pickAgentForTask(fakeTask, agents, []);
check('alasan fallback memuat status 503', assignResult.reason.includes('503'));
check('alasan fallback tetap menyebut fallback aturan', assignResult.reason.includes('fallback aturan'));
check('penugasan fallback live=false', assignResult.live === false);

// ---------- 6. Wiring engine: throw non-Error ----------
console.log('== 4.1: wiring engine (throw non-Error) ==');
const chatString = await new AgentEngine(
  throwingClient('koneksi terputus'),
).chat(fakeAgent, 'idle', 'Plaza', [], 'Halo?', []);
check('throw string tetap aman + termuat', chatString.text.includes('koneksi terputus'));
check('throw string live=false', chatString.live === false);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
