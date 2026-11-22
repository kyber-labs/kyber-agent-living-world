import { useEffect, useMemo, useRef, useState } from 'react';
import { AGENTS } from './config/agents';
import { isPersistenceConfigured } from './lib/supabase';
import { AgentEngine } from './ai/engine';
import { createLlmClient } from './ai/llm';
import { TaskStore } from './simulation/taskStore';
import { WorldView } from './components/WorldView';
import { AgentList } from './ui/AgentList';
import { AgentDetail } from './ui/AgentDetail';
import { AgentChat } from './ui/AgentChat';
import { Hud } from './ui/Hud';
import { TaskBoard } from './ui/TaskBoard';
import type { WorldHandle } from './world/engine/createWorld';
import type { CameraMode } from './world/camera/CameraDirector';
import type { AgentStatus, LiveAgentState } from './types/agent';
import type { NewTaskInput, Task, TaskStatus } from './types/task';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showBoard, setShowBoard] = useState(false);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignNote, setAssignNote] = useState<string | null>(null);
  const worldHandle = useRef<WorldHandle | null>(null);
  const storeRef = useRef<TaskStore | null>(null);
  if (!storeRef.current) storeRef.current = new TaskStore();
  const engine = useMemo(() => new AgentEngine(createLlmClient()), []);
  const selected = AGENTS.find((a) => a.id === selectedId) ?? null;
  const chatAgent = AGENTS.find((a) => a.id === chatAgentId) ?? null;
  const dbConfigured = isPersistenceConfigured();
  const openTasks = tasks.filter((t) => t.status !== 'done').length;

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return undefined;
    setTasks(store.getTasks());
    return store.subscribe(() => setTasks([...store.getTasks()]));
  }, []);

  // Phase 4: agent yang memegang tugas 'doing' fokus bekerja di dunia 3D.
  useEffect(() => {
    const handle = worldHandle.current;
    if (!handle) return;
    AGENTS.forEach((a) => {
      const doing = tasks.find((t) => t.assigneeId === a.id && t.status === 'doing');
      handle.setTaskFocus(a.id, doing ? doing.title : null);
    });
  }, [tasks]);

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

  function handleAddTask(input: NewTaskInput): void {
    storeRef.current?.addTask(input);
  }

  function handleMoveTask(id: string, status: TaskStatus): void {
    storeRef.current?.moveTask(id, status);
  }

  function handleDeleteTask(id: string): void {
    storeRef.current?.deleteTask(id);
  }

  async function handleAutoAssign(taskId: string): Promise<void> {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || assigningId) return;
    setAssigningId(taskId);
    const result = await engine.pickAgentForTask(task, AGENTS, tasks);
    setAssigningId(null);
    if (result.agentId) {
      storeRef.current?.updateTask(taskId, { assigneeId: result.agentId });
      const name = AGENTS.find((a) => a.id === result.agentId)?.name ?? result.agentId;
      setAssignNote(`${task.title} → ${name}: ${result.reason}`);
    } else {
      setAssignNote(`Tidak ada agent yang bisa ditugaskan untuk "${task.title}".`);
    }
  }

  const selectedDoingTask = selected
    ? (tasks.find((t) => t.assigneeId === selected.id && t.status === 'doing') ?? null)
    : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>AI Agent Living World</h1>
          <span className="phase-badge">Phase 4 — AI Engine &amp; Tugas</span>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => setShowBoard((v) => !v)}>
            Tugas ({openTasks})
          </button>
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
          {showBoard && (
            <TaskBoard
              tasks={tasks}
              note={assignNote}
              onAdd={handleAddTask}
              onMove={handleMoveTask}
              onDelete={handleDeleteTask}
              onAutoAssign={(id) => void handleAutoAssign(id)}
              assigningId={assigningId}
              onClose={() => {
                setShowBoard(false);
                setAssignNote(null);
              }}
            />
          )}
          {chatAgent && (
            <AgentChat
              agent={chatAgent}
              liveState={liveStates[chatAgent.id] ?? { status: chatAgent.status, location: 'Plaza' }}
              tasks={tasks}
              engine={engine}
              onClose={() => setChatAgentId(null)}
            />
          )}
          <p className="world-hint">
            Seret untuk memutar kamera · scroll untuk zoom · klik figur agent untuk memilih
          </p>
        </section>
        <AgentDetail
          agent={selected}
          liveState={selected ? liveStates[selected.id] : undefined}
          currentTask={selectedDoingTask}
          onChat={selected ? () => setChatAgentId(selected.id) : undefined}
        />
      </main>
      <Hud agents={AGENTS} liveStates={liveStates} dbConfigured={dbConfigured} engineMode={engine.mode} tasks={tasks} />
    </div>
  );
}

export default App;
