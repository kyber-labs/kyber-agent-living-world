// Klien LLM — Phase 4. Antarmuka provider-agnostic; implementasi pertama
// adalah Gemini (keputusan Bos 23 Nov 2026: tier gratis Google AI Studio).
//
// KEAMANAN KEY: key dibaca dari env VITE_GEMINI_API_KEY dan ikut terbungkus
// ke dalam bundle JS publik. Itu risiko yang diterima untuk fase ini —
// mitigasinya: di Google AI Studio, batasi key tersebut ke HTTP referrer
// https://kyber-agent-living-world.vercel.app/* (hanya domain itu yang boleh
// memakai key). Panggilan LLM hanya terjadi atas aksi pengguna (chat /
// penugasan otomatis), bukan polling latar — hemat kuota tier gratis
// (batas ~15 request/menit). Backend proksi server-side adalah hardening
// fase lanjut, bukan Phase 4.
//
// Bila key kosong atau panggilan gagal, engine jatuh ke klien SIMULASI yang
// menjawab dengan aturan — dan UI menampilkannya apa adanya ("Simulasi
// lokal"), TIDAK PERNAH diklaim sebagai jawaban AI sungguhan.

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmClient {
  readonly name: string;
  /** 'live' = memanggil model sungguhan; 'simulation' = jawaban aturan. */
  readonly mode: 'live' | 'simulation';
  complete(messages: LlmMessage[]): Promise<string>;
}

const GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ||
  'gemini-3.5-flash-lite'; // Default diubah 24 Nov 2026 (patch 4.1):
// gemini-2.5-flash sudah tidak dilayani untuk project AI Studio baru
// (404 "no longer available to new users" sejak 12 Nov 2026);
// gemini-3.5-flash-lite penggantinya. VITE_GEMINI_MODEL tetap bisa
// menimpa default ini.
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

class GeminiClient implements LlmClient {
  readonly name = `Gemini ${GEMINI_MODEL}`;
  readonly mode = 'live' as const;
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  async complete(messages: LlmMessage[]): Promise<string> {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const contents: GeminiContent[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      }));
    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Gemini HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) throw new Error('Gemini mengembalikan jawaban kosong.');
    return text;
  }
}

/** Jawaban aturan tanpa model — dipakai bila key belum dipasang / gagal. */
class SimulationClient implements LlmClient {
  readonly name = 'Simulasi lokal';
  readonly mode = 'simulation' as const;

  async complete(messages: LlmMessage[]): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUser?.content ?? '';
    // Balasan simulasi: tidak berpura-pura menjadi model — kalimatnya
    // generik dan UI menandainya "Simulasi lokal".
    if (/tugas|kerjakan|pilih/i.test(userText)) {
      return 'SIMULASI: saya akan mengerjakan tugas dengan prioritas tertinggi yang tidak terblokir.';
    }
    return `SIMULASI: saya mencatat "${userText.slice(0, 80)}". Pasang API key Gemini untuk jawaban AI sungguhan.`;
  }
}

export function createLlmClient(): LlmClient {
  if (GEMINI_KEY) return new GeminiClient(GEMINI_KEY);
  return new SimulationClient();
}
