import type { Agent, LiveAgentState } from '../types/agent';
import type { Task } from '../types/task';
import type { PerfStats } from '../world/engine/createWorld';
import { formatClock, PERIOD_LABEL, WEATHER_ICON, WEATHER_LABEL, type EnvironmentState } from '../simulation/lifeSim';

interface Props {
  agents: Agent[];
  liveStates: LiveAgentState;
  dbConfigured: boolean;
  engineMode: 'live' | 'simulation';
  tasks: Task[];
  env: EnvironmentState | null;
  /** Statistik performa nyata (FPS + draw call), null sebelum sampel pertama. */
  perf: PerfStats | null;
}

export function Hud({ agents, liveStates, dbConfigured, engineMode, tasks, env, perf }: Props) {
  const states = agents.map((a) => liveStates[a.id]?.status ?? a.status);
  const idle = states.filter((s) => s === 'idle').length;
  const working = states.filter((s) => s === 'working').length;
  const open = tasks.filter((t) => t.status !== 'done').length;
  return (
    <footer className="hud">
      <span>{agents.length} agent</span>
      <span>{idle} menganggur</span>
      <span>{working} bekerja</span>
      <span>{open} tugas terbuka</span>
      <span>AI: {engineMode === 'live' ? 'Gemini live' : 'Simulasi lokal'}</span>
      <span>
        {env
          ? `${formatClock(env.minutesOfDay)} · ${PERIOD_LABEL[env.period]} · ${WEATHER_ICON[env.weather]} ${WEATHER_LABEL[env.weather]}`
          : 'Jam: —'}
      </span>
      <span>{perf ? `${perf.fps} FPS · ${perf.drawCalls} draw` : 'FPS: —'}</span>
      <span>Fase 9/7 — Kampung Senja</span>
      <span>Database: {dbConfigured ? 'terhubung' : 'belum dikonfigurasi'}</span>
    </footer>
  );
}
