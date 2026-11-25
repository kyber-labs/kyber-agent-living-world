// Life simulation — MASTER PROMPT §7 + §9 (jadwal harian, kebutuhan agent,
// cuaca dan waktu), Phase 5.
//
// Jam harian: 1 hari simulasi = 10 menit nyata (1 detik nyata = 2,4 menit
// simulasi), mulai pukul 08:00. Vital per agent (energi/fokus/mood 0–100)
// berubah mengikuti status agent + cuaca; istirahat memulihkan, bekerja
// dan meeting menguras. Semua angka di sini SIMULASI (bukan data nyata)
// dan tidak pernah diklaim sebagai AI — label simulasi ada di UI bila
// relevan; vital sendiri adalah aturan main dunia, bukan jawaban model.

import type { AgentStatus } from '../types/agent';

export interface Vitals {
  energy: number;
  focus: number;
  mood: number;
}

export type WeatherKind = 'cerah' | 'berawan' | 'hujan';
export type DayPeriod = 'pagi' | 'siang' | 'sore' | 'malam';

export interface EnvironmentState {
  /** Menit sejak 00:00 (0–1439). */
  minutesOfDay: number;
  period: DayPeriod;
  weather: WeatherKind;
}

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  cerah: 'Cerah',
  berawan: 'Berawan',
  hujan: 'Hujan',
};

export const WEATHER_ICON: Record<WeatherKind, string> = {
  cerah: '☀',
  berawan: '⛅',
  hujan: '🌧',
};

export const PERIOD_LABEL: Record<DayPeriod, string> = {
  pagi: 'Pagi',
  siang: 'Siang',
  sore: 'Sore',
  malam: 'Malam',
};

/** 1 hari simulasi = 10 menit nyata. */
export const DAY_LENGTH_SECONDS = 600;
/** Jam awal hari simulasi — Phase 9: 900 = 15:00 (Sore/senja), dulu 480
 *  (08:00). Aplikasi dibuka saat senja supaya kesan pertama sesuai
 *  gambar konsep; jam tetap berputar 1 hari = 10 menit. Pengguna lama
 *  yang punya simpanan localStorage tetap memakai jam tersimpannya. */
export const DAY_START_MINUTES = 900;
/** Menit simulasi per detik nyata. */
export const MINUTES_PER_REAL_SECOND = 1440 / DAY_LENGTH_SECONDS;

const STORAGE_KEY = 'living-world-life-v1';
const DEFAULT_VITALS: Vitals = { energy: 85, focus: 80, mood: 78 };

/** Periode hari dari menit (05:00 pagi, 11:00 siang, 14:00 sore, 19:00 malam).
 *  9.1: jendela Sore diperlebar 15:00–18:00 -> 14:00–19:00 (3 jam ->
 *  5 jam simulasi, ~75 -> ~125 detik nyata) supaya senja golden hour
 *  seperti gambar konsep bertahan lebih lama; kecepatan jam (1 hari =
 *  10 menit) TIDAK berubah dan siklus siang–malam tetap berjalan. */
export function periodOf(minutes: number): DayPeriod {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  if (m >= 300 && m < 660) return 'pagi';
  if (m >= 660 && m < 840) return 'siang';
  if (m >= 840 && m < 1140) return 'sore';
  return 'malam';
}

/** "08:00" dari menit sejak 00:00. */
export function formatClock(minutes: number): string {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Laju perubahan vital per jam simulasi, per status agent. */
const DRIFT_PER_HOUR: Record<AgentStatus, { energy: number; focus: number; mood: number }> = {
  idle: { energy: 2, focus: 2, mood: 0.5 },
  working: { energy: -3, focus: -2, mood: -0.5 },
  thinking: { energy: -1, focus: -1, mood: 0 },
  meeting: { energy: -2, focus: -2, mood: 1 },
  moving: { energy: -1, focus: -0.5, mood: 0.5 },
  celebrating: { energy: -1, focus: -1, mood: 3 },
  resting: { energy: 6, focus: 4, mood: 1 },
  error: { energy: -1, focus: -2, mood: -2 },
  // Phase 6: olahraga menguras energi tapi menaikkan mood; hiburan
  // menaikkan mood dengan biaya energi kecil.
  sports: { energy: -2, focus: -1, mood: 2 },
  entertainment: { energy: -1, focus: -1, mood: 2.5 },
};

/** Pengaruh cuaca pada mood, per jam simulasi. */
const WEATHER_MOOD_PER_HOUR: Record<WeatherKind, number> = {
  cerah: 0.3,
  berawan: -0.2,
  hujan: -0.5,
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Vital baru setelah `dtHours` jam simulasi dengan status + cuaca tertentu.
 * Energi rendah (< 25) ikut menekan mood. Hasil dijepit 0–100.
 */
export function driftVitals(v: Vitals, status: AgentStatus, dtHours: number, weather: WeatherKind): Vitals {
  const rate = DRIFT_PER_HOUR[status];
  let moodDelta = rate.mood + WEATHER_MOOD_PER_HOUR[weather];
  if (v.energy < 25) moodDelta -= 1;
  return {
    energy: clamp(v.energy + rate.energy * dtHours),
    focus: clamp(v.focus + rate.focus * dtHours),
    mood: clamp(v.mood + moodDelta * dtHours),
  };
}

interface PersistedLife {
  vitals: Record<string, Vitals>;
  minutesOfDay: number;
  weather: WeatherKind;
  weatherLeftMin: number;
}

/** Simulator kehidupan: jam harian, cuaca bergilir, vital per agent. */
export class LifeSim {
  private vitals: Record<string, Vitals>;
  private minutesOfDay: number;
  private weather: WeatherKind;
  /** Sisa menit simulasi sampai cuaca berganti. */
  private weatherLeftMin: number;
  private emitAcc = 0;

  constructor(agentIds: string[]) {
    this.vitals = Object.fromEntries(agentIds.map((id) => [id, { ...DEFAULT_VITALS }]));
    this.minutesOfDay = DAY_START_MINUTES;
    this.weather = 'cerah';
    this.weatherLeftMin = 240;
    this.loadLocal(agentIds);
  }

  getEnvironment(): EnvironmentState {
    return {
      minutesOfDay: Math.floor(this.minutesOfDay),
      period: periodOf(this.minutesOfDay),
      weather: this.weather,
    };
  }

  getVitals(): Record<string, Vitals> {
    return Object.fromEntries(
      Object.entries(this.vitals).map(([id, v]) => [id, { ...v }]),
    );
  }

  /**
   * Maju satu frame. `statuses` = status terkini tiap agent (dibaca dari
   * liveState engine — tanpa alokasi baru tiap frame). Mengembalikan
   * snapshot untuk React maksimal 1x/detik; selebihnya null.
   */
  update(
    dt: number,
    statuses: Map<string, { status: AgentStatus; location: string }>,
  ): { vitals: Record<string, Vitals>; env: EnvironmentState } | null {
    const dtMin = dt * MINUTES_PER_REAL_SECOND;
    this.minutesOfDay = (this.minutesOfDay + dtMin) % 1440;
    this.weatherLeftMin -= dtMin;
    if (this.weatherLeftMin <= 0) {
      this.weather = this.rollWeather();
      this.weatherLeftMin = 120 + Math.random() * 240; // 2–6 jam simulasi
    }
    const dtHours = dtMin / 60;
    for (const [id, v] of Object.entries(this.vitals)) {
      const status = statuses.get(id)?.status ?? 'idle';
      this.vitals[id] = driftVitals(v, status, dtHours, this.weather);
    }
    this.emitAcc += dt;
    if (this.emitAcc < 1) return null;
    this.emitAcc = 0;
    this.persistLocal();
    return { vitals: this.getVitals(), env: this.getEnvironment() };
  }

  private rollWeather(): WeatherKind {
    const roll = Math.random();
    if (roll < 0.6) return 'cerah';
    if (roll < 0.85) return 'berawan';
    return 'hujan';
  }

  private loadLocal(agentIds: string[]): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedLife>;
      if (parsed.vitals && typeof parsed.vitals === 'object') {
        for (const id of agentIds) {
          const v = parsed.vitals[id];
          if (v && [v.energy, v.focus, v.mood].every((n) => typeof n === 'number')) {
            this.vitals[id] = { energy: clamp(v.energy), focus: clamp(v.focus), mood: clamp(v.mood) };
          }
        }
      }
      if (typeof parsed.minutesOfDay === 'number' && parsed.minutesOfDay >= 0 && parsed.minutesOfDay < 1440) {
        this.minutesOfDay = parsed.minutesOfDay;
      }
      if (parsed.weather === 'cerah' || parsed.weather === 'berawan' || parsed.weather === 'hujan') {
        this.weather = parsed.weather;
      }
      if (typeof parsed.weatherLeftMin === 'number' && parsed.weatherLeftMin > 0) {
        this.weatherLeftMin = parsed.weatherLeftMin;
      }
    } catch {
      // localStorage rusak / tidak tersedia — pakai nilai awal.
    }
  }

  private persistLocal(): void {
    try {
      const data: PersistedLife = {
        vitals: this.vitals,
        minutesOfDay: Math.floor(this.minutesOfDay),
        weather: this.weather,
        weatherLeftMin: this.weatherLeftMin,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Penyimpanan lokal penuh / diblokir — simulasi tetap jalan.
    }
  }
}
