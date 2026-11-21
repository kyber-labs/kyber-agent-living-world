import { useRef, useState } from 'react';
import { AGENTS } from './config/agents';
import { isPersistenceConfigured } from './lib/supabase';
import { WorldView } from './components/WorldView';
import { AgentList } from './ui/AgentList';
import { AgentDetail } from './ui/AgentDetail';
import { Hud } from './ui/Hud';
import type { WorldHandle } from './world/engine/createWorld';

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const worldHandle = useRef<WorldHandle | null>(null);
  const selected = AGENTS.find((a) => a.id === selectedId) ?? null;
  const dbConfigured = isPersistenceConfigured();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>AI Agent Living World</h1>
          <span className="phase-badge">Phase 1 — Setup</span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => worldHandle.current?.resetCamera()}>
            Reset kamera
          </button>
        </div>
      </header>
      <main className="app-main">
        <AgentList agents={AGENTS} selectedId={selectedId} onSelect={setSelectedId} />
        <section className="world-wrap">
          <WorldView
            agents={AGENTS}
            selectedId={selectedId}
            onSelect={setSelectedId}
            worldHandle={worldHandle}
          />
          <p className="world-hint">
            Seret untuk memutar kamera · scroll untuk zoom · klik figur agent untuk memilih
          </p>
        </section>
        <AgentDetail agent={selected} />
      </main>
      <Hud agents={AGENTS} dbConfigured={dbConfigured} />
    </div>
  );
}

export default App;
