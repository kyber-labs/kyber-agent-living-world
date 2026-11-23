import { useEffect, useMemo, useRef, useState } from 'react';
import { AGENTS } from './config/agents';
import { isPersistenceConfigured } from './lib/supabase';
import { AgentEngine } from './ai/engine';
import { createLlmClient } from './ai/llm';
import { TaskStore } from './simulation/taskStore';
import { MeetingStore } from './simulation/meetingStore';
import { EventStore } from './simulation/eventStore';
import { WorldObjectStore } from './simulation/worldObjectStore';
import { roomSlotPositions, validateStartMeeting } from './simulation/meetingLogic';
import { eventSlotPositions, isEventGathered, validateStartEvent } from './simulation/eventLogic';
import { validatePlacement } from './simulation/builderLogic';
import { computeAnalytics } from './simulation/analytics';
import type { EnvironmentState, Vitals } from './simulation/lifeSim';
import { WorldView } from './components/WorldView';
import { AgentList } from './ui/AgentList';
import { AgentDetail } from './ui/AgentDetail';
import { AgentChat } from './ui/AgentChat';
import { Hud } from './ui/Hud';
import { TaskBoard } from './ui/TaskBoard';
import { MeetingPanel } from './ui/MeetingPanel';
import { EventsPanel } from './ui/EventsPanel';
import { BuilderPanel, type BuildMode } from './ui/BuilderPanel';
import { AnalyticsPanel } from './ui/AnalyticsPanel';
import { MEETING_ROOMS, getMeetingRoom } from './types/meeting';
import type { Meeting, NewMeetingInput } from './types/meeting';
import { EVENT_KINDS } from './types/event';
import type { CityEvent, NewEventInput } from './types/event';
import type { WorldObject, WorldObjectKind } from './types/worldObject';
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
  // Phase 5: meeting + life simulation.
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showMeetings, setShowMeetings] = useState(false);
  const [vitals, setVitals] = useState<Record<string, Vitals>>({});
  const [env, setEnv] = useState<EnvironmentState | null>(null);
  // Phase 6: acara olahraga/hiburan, world builder, analytics.
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [showEvents, setShowEvents] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [buildMode, setBuildMode] = useState<BuildMode | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const worldHandle = useRef<WorldHandle | null>(null);
  const storeRef = useRef<TaskStore | null>(null);
  if (!storeRef.current) storeRef.current = new TaskStore();
  const meetingStoreRef = useRef<MeetingStore | null>(null);
  if (!meetingStoreRef.current) meetingStoreRef.current = new MeetingStore();
  const eventStoreRef = useRef<EventStore | null>(null);
  if (!eventStoreRef.current) eventStoreRef.current = new EventStore();
  const objectStoreRef = useRef<WorldObjectStore | null>(null);
  if (!objectStoreRef.current) objectStoreRef.current = new WorldObjectStore();
  const engine = useMemo(() => new AgentEngine(createLlmClient()), []);
  const selected = AGENTS.find((a) => a.id === selectedId) ?? null;
  const chatAgent = AGENTS.find((a) => a.id === chatAgentId) ?? null;
  const dbConfigured = isPersistenceConfigured();
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const analytics = useMemo(
    () =>
      computeAnalytics({
        tasks,
        meetings,
        events,
        liveStates,
        vitals,
        env,
        objects,
        agents: AGENTS,
      }),
    [tasks, meetings, events, liveStates, vitals, env, objects],
  );

  function closeAllPanels(): void {
    setShowBoard(false);
    setShowMeetings(false);
    setShowEvents(false);
    setShowBuilder(false);
    setShowAnalytics(false);
    setBuildMode(null);
    setPlacementError(null);
  }

  useEffect(() => {
    const store = storeRef.current;
    if (!store) return undefined;
    setTasks(store.getTasks());
    return store.subscribe(() => setTasks([...store.getTasks()]));
  }, []);

  useEffect(() => {
    const store = meetingStoreRef.current;
    if (!store) return undefined;
    setMeetings(store.getMeetings());
    return store.subscribe(() => setMeetings([...store.getMeetings()]));
  }, []);

  useEffect(() => {
    const store = eventStoreRef.current;
    if (!store) return undefined;
    setEvents(store.getEvents());
    return store.subscribe(() => setEvents([...store.getEvents()]));
  }, []);

  useEffect(() => {
    const store = objectStoreRef.current;
    if (!store) return undefined;
    setObjects(store.getObjects());
    return store.subscribe(() => setObjects([...store.getObjects()]));
  }, []);

  // Phase 6: akhiri acara yang sudah melewati durasinya (cek tiap 5 detik).
  useEffect(() => {
    const timer = window.setInterval(() => {
      eventStoreRef.current?.endExpired(Date.now());
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  // Phase 6: sinkronkan penugasan acara + cincin lokasi aktif ke dunia 3D
  // dari state acara (termasuk saat muat ulang dengan acara aktif).
  useEffect(() => {
    const handle = worldHandle.current;
    if (!handle) return;
    const inActive = new Set<string>();
    events
      .filter((e) => e.status === 'active')
      .forEach((e) => {
        const def = EVENT_KINDS[e.kind];
        handle.setEventActive(def.locationId, true);
        const slots = eventSlotPositions(e.kind, e.participantIds.length);
        e.participantIds.forEach((agentId, i) => {
          const slot = slots[i];
          if (!slot) return;
          inActive.add(agentId);
          handle.setEventAssignment(agentId, {
            locationId: def.locationId,
            locationName: def.locationName,
            nodeId: def.nodeId,
            x: def.centerX,
            z: def.centerZ,
            slotX: slot.x,
            slotZ: slot.z,
            status: def.status,
          });
        });
      });
    (Object.keys(EVENT_KINDS) as (keyof typeof EVENT_KINDS)[]).forEach((kind) => {
      const def = EVENT_KINDS[kind];
      const busy = events.some((e) => e.status === 'active' && e.kind === kind);
      if (!busy) handle.setEventActive(def.locationId, false);
    });
    AGENTS.forEach((a) => {
      if (!inActive.has(a.id)) handle.setEventAssignment(a.id, null);
    });
  }, [events]);

  // Phase 6.1: tandai acara sebagai berkumpul penuh saat semua peserta
  // sudah tiba di slot (status live = status acara). Hitung mundur durasi
  // dimulai dari momen ini (lihat eventEndMs); tanpa ini, peserta dari
  // sudut kota yang jauh kehabisan durasi di perjalanan (temuan live 6.0).
  useEffect(() => {
    const store = eventStoreRef.current;
    if (!store) return;
    events
      .filter((e) => e.status === 'active' && !e.gatheredAt)
      .forEach((e) => {
        if (isEventGathered(e, liveStates)) store.markGathered(e.id);
      });
  }, [events, liveStates]);

  // Phase 6: sinkronkan objek builder ke dunia 3D dari state store.
  useEffect(() => {
    worldHandle.current?.setWorldObjects(objects);
  }, [objects]);

  // Phase 5: sinkronkan penugasan meeting + penanda room aktif ke dunia 3D
  // dari state meeting (termasuk saat muat ulang dengan meeting aktif).
  useEffect(() => {
    const handle = worldHandle.current;
    if (!handle) return;
    const inActive = new Set<string>();
    meetings
      .filter((m) => m.status === 'active')
      .forEach((m) => {
        const room = getMeetingRoom(m.roomId);
        if (!room) return;
        handle.setRoomActive(m.roomId, true);
        const slots = roomSlotPositions(room, m.participantIds.length);
        m.participantIds.forEach((agentId, i) => {
          const slot = slots[i];
          if (!slot) return;
          inActive.add(agentId);
          handle.setMeetingAssignment(agentId, {
            roomId: room.id,
            roomName: room.name,
            nodeId: room.nodeId,
            x: room.x,
            z: room.z,
            slotX: slot.x,
            slotZ: slot.z,
          });
        });
      });
    MEETING_ROOMS.forEach((room) => {
      const busy = meetings.some((m) => m.status === 'active' && m.roomId === room.id);
      if (!busy) handle.setRoomActive(room.id, false);
    });
    AGENTS.forEach((a) => {
      if (!inActive.has(a.id)) handle.setMeetingAssignment(a.id, null);
    });
  }, [meetings]);

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

  function handleLifeTick(nextVitals: Record<string, Vitals>, nextEnv: EnvironmentState): void {
    setVitals(nextVitals);
    setEnv(nextEnv);
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

  function handleStartMeeting(input: NewMeetingInput): string | null {
    const room = getMeetingRoom(input.roomId);
    if (!room) return 'Ruang tidak dikenal.';
    const err = validateStartMeeting(room, input.topic, input.participantIds, meetings, AGENTS, events);
    if (err) return err;
    meetingStoreRef.current?.startMeeting(input);
    return null;
  }

  function handleEndMeeting(id: string): void {
    meetingStoreRef.current?.endMeeting(id);
  }

  function handleAddNote(meetingId: string, authorId: string | null, text: string): void {
    meetingStoreRef.current?.addNote(meetingId, authorId, text);
  }

  function handleDeleteMeeting(id: string): void {
    meetingStoreRef.current?.deleteMeeting(id);
  }

  // Phase 6: acara olahraga & hiburan.
  function handleStartEvent(input: NewEventInput): string | null {
    const err = validateStartEvent(input.kind, input.title, input.participantIds, events, meetings, AGENTS);
    if (err) return err;
    eventStoreRef.current?.startEvent(input);
    return null;
  }

  function handleEndEvent(id: string): void {
    eventStoreRef.current?.endEvent(id);
  }

  function handleDeleteEvent(id: string): void {
    eventStoreRef.current?.deleteEvent(id);
  }

  // Phase 6: world builder.
  function handlePickKind(kind: WorldObjectKind): void {
    setPlacementError(null);
    setBuildMode((prev) =>
      prev !== null && prev.kind === kind && prev.movingId === null ? null : { kind, movingId: null },
    );
  }

  function handleMoveObject(id: string): void {
    const obj = objects.find((o) => o.id === id);
    if (!obj) return;
    setPlacementError(null);
    setBuildMode({ kind: obj.kind, movingId: id });
  }

  function handleDeleteObject(id: string): void {
    objectStoreRef.current?.deleteObject(id);
    setBuildMode((prev) => (prev?.movingId === id ? null : prev));
  }

  function handleGroundClick(x: number, z: number): void {
    if (!buildMode) return;
    const handle = worldHandle.current;
    if (!handle) {
      setPlacementError('Dunia belum siap.');
      return;
    }
    const buildings = handle.getCityInfo().buildings;
    if (buildMode.movingId) {
      const err = validatePlacement(x, z, objects, buildings, buildMode.movingId);
      if (err) {
        setPlacementError(err);
        return;
      }
      objectStoreRef.current?.moveObject(buildMode.movingId, x, z);
      setBuildMode(null);
      setPlacementError(null);
      return;
    }
    const err = validatePlacement(x, z, objects, buildings);
    if (err) {
      setPlacementError(err);
      return;
    }
    objectStoreRef.current?.addObject({ kind: buildMode.kind, x, z });
    setPlacementError(null);
  }

  const selectedDoingTask = selected
    ? (tasks.find((t) => t.assigneeId === selected.id && t.status === 'doing') ?? null)
    : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>AI Agent Living World</h1>
          <span className="phase-badge">Phase 6 — Olahraga &amp; Builder &amp; Analitik</span>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={() => {
              const wasOpen = showMeetings;
              closeAllPanels();
              if (!wasOpen) setShowMeetings(true);
            }}
          >
            Meeting
          </button>
          <button
            type="button"
            onClick={() => {
              const wasOpen = showEvents;
              closeAllPanels();
              if (!wasOpen) setShowEvents(true);
            }}
          >
            Acara
          </button>
          <button
            type="button"
            onClick={() => {
              const wasOpen = showBuilder;
              closeAllPanels();
              if (!wasOpen) setShowBuilder(true);
            }}
          >
            Builder
          </button>
          <button
            type="button"
            onClick={() => {
              const wasOpen = showAnalytics;
              closeAllPanels();
              if (!wasOpen) setShowAnalytics(true);
            }}
          >
            Analitik
          </button>
          <button
            type="button"
            onClick={() => {
              const wasOpen = showBoard;
              closeAllPanels();
              if (!wasOpen) setShowBoard(true);
            }}
          >
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
            onLifeTick={handleLifeTick}
            worldHandle={worldHandle}
            onGroundClick={handleGroundClick}
            isBuildMode={() => buildMode !== null}
          />
          {buildMode && (
            <p className="build-banner">
              {buildMode.movingId ? 'Mode pindah — klik tanah tujuan' : 'Mode bangun — klik tanah untuk menempatkan'}
            </p>
          )}
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
          {showMeetings && (
            <MeetingPanel
              meetings={meetings}
              onStart={handleStartMeeting}
              onEnd={handleEndMeeting}
              onAddNote={handleAddNote}
              onDelete={handleDeleteMeeting}
              onClose={() => setShowMeetings(false)}
            />
          )}
          {showEvents && (
            <EventsPanel
              events={events}
              liveStates={liveStates}
              onStart={handleStartEvent}
              onEnd={handleEndEvent}
              onDelete={handleDeleteEvent}
              onClose={() => setShowEvents(false)}
            />
          )}
          {showBuilder && (
            <BuilderPanel
              objects={objects}
              buildMode={buildMode}
              placementError={placementError}
              onPickKind={handlePickKind}
              onCancelBuild={() => {
                setBuildMode(null);
                setPlacementError(null);
              }}
              onMove={handleMoveObject}
              onDelete={handleDeleteObject}
              onClose={() => {
                setShowBuilder(false);
                setBuildMode(null);
                setPlacementError(null);
              }}
            />
          )}
          {showAnalytics && <AnalyticsPanel data={analytics} onClose={() => setShowAnalytics(false)} />}
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
          vitals={selected ? vitals[selected.id] : undefined}
          onChat={selected ? () => setChatAgentId(selected.id) : undefined}
        />
      </main>
      <Hud agents={AGENTS} liveStates={liveStates} dbConfigured={dbConfigured} engineMode={engine.mode} tasks={tasks} env={env} />
    </div>
  );
}

export default App;
