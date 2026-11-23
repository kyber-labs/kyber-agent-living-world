import { useEffect, useMemo, useRef, useState } from 'react';
import { AGENTS } from './config/agents';
import { isPersistenceConfigured } from './lib/supabase';
import { AgentEngine } from './ai/engine';
import { createLlmClient } from './ai/llm';
import { TaskStore } from './simulation/taskStore';
import { MeetingStore } from './simulation/meetingStore';
import { EventStore } from './simulation/eventStore';
import { WorldObjectStore } from './simulation/worldObjectStore';
import { ActivityStore, countAgentActivity, type ActivityEntry } from './simulation/activityStore';
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
import { Sidebar, type Section } from './ui/Sidebar';
import { WallClock } from './ui/WallClock';
import { ActivityPanel } from './ui/ActivityPanel';
import { ActivityToast } from './ui/ActivityToast';
import { SettingsPanel } from './ui/SettingsPanel';
import { MEETING_ROOMS, getMeetingRoom } from './types/meeting';
import type { Meeting, NewMeetingInput } from './types/meeting';
import { EVENT_KINDS } from './types/event';
import type { CityEvent, NewEventInput } from './types/event';
import type { WorldObject, WorldObjectKind } from './types/worldObject';
import { WORLD_OBJECT_CATALOG } from './types/worldObject';
import type { WorldHandle, PerfStats } from './world/engine/createWorld';
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
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignNote, setAssignNote] = useState<string | null>(null);
  // Phase 5: meeting + life simulation.
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [vitals, setVitals] = useState<Record<string, Vitals>>({});
  const [env, setEnv] = useState<EnvironmentState | null>(null);
  // Phase 7: statistik performa nyata (FPS + draw call), diperbarui 1x/detik.
  const [perf, setPerf] = useState<PerfStats | null>(null);
  // Phase 6: acara olahraga/hiburan, world builder, analytics.
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [buildMode, setBuildMode] = useState<BuildMode | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  // Phase 8.1: layout sidebar + feed aktivitas + pengaturan.
  const [section, setSection] = useState<Section>('agents');
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [toast, setToast] = useState<ActivityEntry | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const worldHandle = useRef<WorldHandle | null>(null);
  const storeRef = useRef<TaskStore | null>(null);
  if (!storeRef.current) storeRef.current = new TaskStore();
  const meetingStoreRef = useRef<MeetingStore | null>(null);
  if (!meetingStoreRef.current) meetingStoreRef.current = new MeetingStore();
  const eventStoreRef = useRef<EventStore | null>(null);
  if (!eventStoreRef.current) eventStoreRef.current = new EventStore();
  const objectStoreRef = useRef<WorldObjectStore | null>(null);
  if (!objectStoreRef.current) objectStoreRef.current = new WorldObjectStore();
  const activityStoreRef = useRef<ActivityStore | null>(null);
  if (!activityStoreRef.current) activityStoreRef.current = new ActivityStore();
  // Id aktivitas terakhir yang sudah ditampilkan sebagai toast — supaya
  // toast yang ditutup tidak muncul lagi, dan entri lama (persisted)
  // tidak memunculkan toast saat muat.
  const lastToastIdRef = useRef<string | null>(null);
  const engine = useMemo(() => new AgentEngine(createLlmClient()), []);
  const selected = AGENTS.find((a) => a.id === selectedId) ?? null;
  const chatAgent = AGENTS.find((a) => a.id === chatAgentId) ?? null;
  const dbConfigured = isPersistenceConfigured();
  const openTasks = tasks.filter((t) => t.status !== 'done').length;
  const counts = countAgentActivity(liveStates);
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

  // Phase 8.1: pindah bagian. Keluar dari Bangun membatalkan mode
  // bangun/pindah (seperti closeAllPanels dulu).
  function selectSection(next: Section): void {
    setSection(next);
    if (next !== 'builder') {
      setBuildMode(null);
      setPlacementError(null);
    }
  }

  // Memilih agent (dari daftar atau klik figur 3D) selalu membuka bagian
  // Agent supaya panel detailnya terlihat.
  function handleSelectAgent(id: string | null): void {
    setSelectedId(id);
    if (id) setSection('agents');
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

  // Phase 8.1: langganan feed aktivitas. Toast hanya untuk entri BARU
  // (id belum pernah tampil); entri lama dari localStorage tidak
  // memunculkan toast saat muat.
  useEffect(() => {
    const store = activityStoreRef.current;
    if (!store) return undefined;
    setActivities([...store.getEntries()]);
    lastToastIdRef.current = store.getEntries()[0]?.id ?? null;
    return store.subscribe(() => {
      const entries = store.getEntries();
      setActivities([...entries]);
      const latest = entries[0];
      if (latest && latest.id !== lastToastIdRef.current) {
        lastToastIdRef.current = latest.id;
        setToast(latest);
      }
    });
  }, []);

  // Phase 8.1: toast hilang sendiri setelah ~5 detik.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Phase 6: akhiri acara yang sudah melewati durasinya (cek tiap 5 detik).
  // Phase 8.1: acara yang berakhir otomatis ikut tercatat di feed.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const store = eventStoreRef.current;
      if (!store) return;
      const activeBefore = store.getEvents().filter((e) => e.status === 'active');
      store.endExpired(Date.now());
      if (activeBefore.length === 0) return;
      const endedIds = new Set(
        store.getEvents().filter((e) => e.status === 'ended').map((e) => e.id),
      );
      activeBefore.forEach((e) => {
        if (endedIds.has(e.id)) activityStoreRef.current?.add(`Acara selesai: "${e.title}"`);
      });
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

  function handlePerf(stats: PerfStats): void {
    setPerf(stats);
  }

  function handleModeChange(mode: CameraMode): void {
    if (mode === 'follow' && !selectedId) {
      handleSelectAgent('aria');
    }
    setCameraMode(mode);
    worldHandle.current?.setCameraMode(mode);
  }

  function handleAddTask(input: NewTaskInput): void {
    const task = storeRef.current?.addTask(input);
    if (!task) return;
    const name = task.assigneeId
      ? (AGENTS.find((a) => a.id === task.assigneeId)?.name ?? task.assigneeId)
      : null;
    activityStoreRef.current?.add(
      name ? `Tugas baru: "${task.title}" → ${name}` : `Tugas baru: "${task.title}"`,
    );
  }

  function handleMoveTask(id: string, status: TaskStatus): void {
    const task = tasks.find((t) => t.id === id);
    if (task && status === 'done' && task.status !== 'done') {
      activityStoreRef.current?.add(`Tugas selesai: "${task.title}"`);
    }
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
      activityStoreRef.current?.add(`Tugas "${task.title}" ditugaskan otomatis ke ${name}`);
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
    activityStoreRef.current?.add(`Meeting dimulai: "${input.topic}" di ${room.name}`);
    return null;
  }

  function handleEndMeeting(id: string): void {
    const meeting = meetings.find((m) => m.id === id);
    if (meeting && meeting.status === 'active') {
      activityStoreRef.current?.add(`Meeting selesai: "${meeting.topic}"`);
    }
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
    activityStoreRef.current?.add(`Acara dimulai: "${input.title}"`);
    return null;
  }

  function handleEndEvent(id: string): void {
    const event = events.find((e) => e.id === id);
    if (event && event.status === 'active') {
      activityStoreRef.current?.add(`Acara selesai: "${event.title}"`);
    }
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
    const obj = objects.find((o) => o.id === id);
    if (obj) {
      activityStoreRef.current?.add(`Objek dihapus: ${WORLD_OBJECT_CATALOG[obj.kind].label}`);
    }
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
    const placed = objectStoreRef.current?.addObject({ kind: buildMode.kind, x, z });
    if (placed) {
      activityStoreRef.current?.add(
        `Objek ditempatkan: ${WORLD_OBJECT_CATALOG[placed.kind].label} (${placed.x.toFixed(1)}, ${placed.z.toFixed(1)})`,
      );
    }
    setPlacementError(null);
  }

  const selectedDoingTask = selected
    ? (tasks.find((t) => t.assigneeId === selected.id && t.status === 'doing') ?? null)
    : null;

  // Perbaikan 8.1.1: panel overlay (Tugas/Rapat/Acara/Bangun/Analitik/
  // Aktivitas/Atur) menutupi sisi kanan .world-wrap — kelas has-panel
  // menggeser pill kamera + bilah petunjuk ke strip yang terlihat.
  // Bagian Dunia/Agent tidak memakai overlay, jadi tidak perlu.
  const hasPanel =
    section === 'tasks' ||
    section === 'meetings' ||
    section === 'events' ||
    section === 'builder' ||
    section === 'analytics' ||
    section === 'activity' ||
    section === 'settings';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">
          <h1>AI Agent Living World</h1>
          <span className="live-badge" title="Aplikasi berjalan live">
            <span className="live-dot" />
            LIVE
          </span>
          <span className="phase-badge">Phase 8.1 — Layout &amp; Feed</span>
        </div>
        <div className="header-status">
          <span>
            {counts.active} aktif · {counts.moving} berjalan
          </span>
          <WallClock />
          <button type="button" onClick={() => handleModeChange('overview')}>
            Reset kamera
          </button>
        </div>
      </header>
      <main className="app-main">
        <Sidebar section={section} onSelect={selectSection} openTasks={openTasks} />
        {section === 'agents' && (
          <AgentList agents={AGENTS} selectedId={selectedId} onSelect={handleSelectAgent} liveStates={liveStates} />
        )}
        <section className={hasPanel ? 'world-wrap has-panel' : 'world-wrap'}>
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
            onSelect={handleSelectAgent}
            onAgentState={handleAgentState}
            onLifeTick={handleLifeTick}
            onPerf={handlePerf}
            worldHandle={worldHandle}
            onGroundClick={handleGroundClick}
            isBuildMode={() => buildMode !== null}
            showMinimap={showMinimap}
            showLabels={showLabels}
          />
          {buildMode && (
            <p className="build-banner">
              {buildMode.movingId ? 'Mode pindah — klik tanah tujuan' : 'Mode bangun — klik tanah untuk menempatkan'}
            </p>
          )}
          {cameraMode === 'first-person' && (
            <p className="camera-hint">WASD / tombol panah untuk bergerak · seret untuk melihat sekeliling</p>
          )}
          {section === 'tasks' && (
            <TaskBoard
              tasks={tasks}
              note={assignNote}
              onAdd={handleAddTask}
              onMove={handleMoveTask}
              onDelete={handleDeleteTask}
              onAutoAssign={(id) => void handleAutoAssign(id)}
              assigningId={assigningId}
              onClose={() => {
                selectSection('agents');
                setAssignNote(null);
              }}
            />
          )}
          {section === 'meetings' && (
            <MeetingPanel
              meetings={meetings}
              onStart={handleStartMeeting}
              onEnd={handleEndMeeting}
              onAddNote={handleAddNote}
              onDelete={handleDeleteMeeting}
              onClose={() => selectSection('agents')}
            />
          )}
          {section === 'events' && (
            <EventsPanel
              events={events}
              liveStates={liveStates}
              onStart={handleStartEvent}
              onEnd={handleEndEvent}
              onDelete={handleDeleteEvent}
              onClose={() => selectSection('agents')}
            />
          )}
          {section === 'builder' && (
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
              onClose={() => selectSection('agents')}
            />
          )}
          {section === 'analytics' && <AnalyticsPanel data={analytics} onClose={() => selectSection('agents')} />}
          {section === 'activity' && (
            <ActivityPanel
              entries={activities}
              onClear={() => activityStoreRef.current?.clear()}
              onClose={() => selectSection('agents')}
            />
          )}
          {section === 'settings' && (
            <SettingsPanel
              showLabels={showLabels}
              showMinimap={showMinimap}
              onToggleLabels={setShowLabels}
              onToggleMinimap={setShowMinimap}
              providerName={engine.providerName}
              engineMode={engine.mode}
              dbConfigured={dbConfigured}
              onClose={() => selectSection('agents')}
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
          {toast && !chatAgent && <ActivityToast entry={toast} onClose={() => setToast(null)} />}
          <p className="world-hint">
            Seret untuk memutar kamera · scroll untuk zoom · klik figur agent untuk memilih
          </p>
        </section>
        {section === 'agents' && (
          <AgentDetail
            agent={selected}
            liveState={selected ? liveStates[selected.id] : undefined}
            currentTask={selectedDoingTask}
            vitals={selected ? vitals[selected.id] : undefined}
            onChat={selected ? () => setChatAgentId(selected.id) : undefined}
          />
        )}
      </main>
      <Hud agents={AGENTS} liveStates={liveStates} dbConfigured={dbConfigured} engineMode={engine.mode} tasks={tasks} env={env} perf={perf} />
    </div>
  );
}

export default App;
