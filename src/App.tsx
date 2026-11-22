import { useRef, useState } from 'react';
import { AGENTS } from './config/agents';
import { isPersistenceConfigured } from './lib/supabase';
import { WorldView } from './components/WorldView';
import { AgentList } from './ui/AgentList';
import { AgentDetail } from './ui/AgentDetail';
import { Hud } from './ui/Hud';
import type { WorldHandle } from './world/engine/createWorld';
import type { CameraMode } from './world/camera/CameraDirector';
import type { AgentStatus, LiveAgentState } from './types/agent';

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'top', label: 'Atas' },
  { id: 'first-person', label: 'Orang Pertama' },
  { id: 'follow', label: 'Ikuti Agent' },
  { id: 'cinematic', label: 'Sinematik' },
];

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview');
  const [liveStates, setLiveStates] = useState<LiveAgentState>(() =>
    Object.fromEntries(AGENTS.map((a) => [a.id, { status: 'idle' as AgentStatus, location: 'Plaza' }])),
  );
  const worldHandle = useRef<WorldHandle | null>(null);
  const selected = AGENTS.find((a) => a.id === selectedId) ?? null;
  const dbConfigured = isPersistenceConfigured();

  function handleAgentState(id: string, status: AgentStatus, location: string): void {
    setLiveStates((prev) => ({ ...prev, [id]: { status, location } }));
  }

  function handleModeChange(mode: CameraMode): void {
    if (mode === 'follow' && !selectedId) {
      setSelectedId('aria');
    }
    setCameraMode(mode);
    worldHandle.current?.setCameraMode(mode);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>AI Agent Living World</h1>
          <span className="phase-badge">Phase 3 — Karakter &amp; Navigasi</span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => handleModeChange('overview')}>
            Reset kamera
          </button>
        </div>
      </header>
      <main className="app-main">
        <AgentList agents={AGENTS} selectedId={selectedId} onSelect={setSelectedId} liveStates={liveStates} />
        <section className="world-wrap">
          <div className="camera-toolbar" role="group" aria-label="Mode kamera">
            {CAMERA_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cameraMode === m.id ? 'active' : ''}
                aria-pressed={cameraMode === m.id}
                onClick={() => handleModeChange(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <WorldView
            agents={AGENTS}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAgentState={handleAgentState}
            worldHandle={worldHandle}
          />
          {cameraMode === 'first-person' && (
            <p className="camera-hint">WASD / tombol panah untuk bergerak · seret untuk melihat sekeliling</p>
          )}
          <p className="world-hint">
            Seret untuk memutar kamera · scroll untuk zoom · klik figur agent untuk memilih
          </p>
        </section>
        <AgentDetail agent={selected} liveState={selected ? liveStates[selected.id] : undefined} />
      </main>
      <Hud agents={AGENTS} liveStates={liveStates} dbConfigured={dbConfigured} />
    </div>
  );
}

export default App;
