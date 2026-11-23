// Panel acara olahraga & hiburan — Phase 6 (MASTER PROMPT §7).
// Mulai acara (pertandingan di Arena / pertunjukan di Panggung) dengan
// judul, peserta, dan durasi; acara aktif bisa diakhiri manual atau
// berakhir otomatis saat durasi habis; riwayat acara selesai bisa dihapus.
// Semua state lewat EventStore (localStorage); panel ini hanya tampilan.

import { useState } from 'react';
import { AGENTS } from '../config/agents';
import type { CityEvent, EventKind, NewEventInput } from '../types/event';
import { EVENT_DURATIONS, EVENT_KINDS } from '../types/event';

interface Props {
  events: CityEvent[];
  onStart: (input: NewEventInput) => string | null;
  onEnd: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} mnt` : `${m} mnt ${s} dtk`;
}

export function EventsPanel({ events, onStart, onEnd, onDelete, onClose }: Props) {
  const [formKind, setFormKind] = useState<EventKind | null>(null);
  const [title, setTitle] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [duration, setDuration] = useState(180);
  const [error, setError] = useState<string | null>(null);

  const active = events.filter((e) => e.status === 'active');
  const ended = events.filter((e) => e.status === 'ended');
  const activeByKind = new Map(active.map((e) => [e.kind, e]));

  function toggleParticipant(id: string): void {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submitForm(): void {
    if (!formKind) return;
    const err = onStart({
      kind: formKind,
      title: title.trim() || EVENT_KINDS[formKind].defaultTitle,
      participantIds: checked,
      durationSeconds: duration,
    });
    if (err) {
      setError(err);
      return;
    }
    setTitle('');
    setChecked([]);
    setDuration(180);
    setError(null);
    setFormKind(null);
  }

  return (
    <section className="board-overlay" aria-label="Acara olahraga dan hiburan">
      <div className="board-header">
        <h2>
          Acara <span className="muted">· {active.length} berlangsung</span>
        </h2>
        <div className="board-actions">
          <button type="button" onClick={onClose} aria-label="Tutup panel acara">
            ✕
          </button>
        </div>
      </div>
      <p className="muted">
        Acara simulasi — peserta berjalan ke lokasi dan berkumpul selama durasi acara, lalu bubar.
      </p>

      <h3 className="section-title">Mulai acara</h3>
      <div className="room-grid">
        {(Object.keys(EVENT_KINDS) as EventKind[]).map((kind) => {
          const def = EVENT_KINDS[kind];
          const running = activeByKind.get(kind);
          return (
            <article key={kind} className="room-card" style={{ borderTopColor: def.color }}>
              <div className="room-name">{def.label}</div>
              <div className="muted">{def.locationName}</div>
              {running ? (
                <p className="room-busy">
                  Berlangsung: {running.title} ({running.participantIds.length} peserta)
                </p>
              ) : (
                <p className="muted">Belum ada acara</p>
              )}
              <button
                type="button"
                disabled={!!running}
                onClick={() => {
                  setFormKind(kind);
                  setTitle(def.defaultTitle);
                  setError(null);
                }}
              >
                Mulai acara
              </button>
            </article>
          );
        })}
      </div>

      {formKind && (
        <form
          className="task-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
        >
          <h3 className="form-title">Acara baru — {EVENT_KINDS[formKind].label}</h3>
          <label>
            Judul
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={EVENT_KINDS[formKind].defaultTitle}
            />
          </label>
          <label>
            Durasi
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {EVENT_DURATIONS.map((d) => (
                <option key={d.seconds} value={d.seconds}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="check-fieldset">
            <legend>Peserta (pilih minimal 2)</legend>
            <div className="check-list">
              {AGENTS.map((a) => (
                <label key={a.id} className="check-item">
                  <input type="checkbox" checked={checked.includes(a.id)} onChange={() => toggleParticipant(a.id)} />
                  <span className="agent-dot" style={{ background: a.color }} />
                  {a.name} <span className="muted">({a.role})</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary">
              Mulai acara
            </button>
            <button
              type="button"
              onClick={() => {
                setFormKind(null);
                setError(null);
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {active.length > 0 && (
        <>
          <h3 className="section-title">Acara berlangsung</h3>
          {active.map((e) => {
            const def = EVENT_KINDS[e.kind];
            const participants = e.participantIds.map((id) => AGENTS.find((a) => a.id === id)?.name ?? id);
            return (
              <article key={e.id} className="meeting-card" style={{ borderTopColor: def.color }}>
                <div className="task-title">{e.title}</div>
                <p className="task-desc">
                  {def.label} · {def.locationName} · {participants.join(', ')} · mulai {formatTime(e.startedAt)} ·
                  durasi {formatDuration(e.durationSeconds)}
                </p>
                <div className="task-actions">
                  <button type="button" onClick={() => onEnd(e.id)}>
                    Akhiri acara
                  </button>
                </div>
              </article>
            );
          })}
        </>
      )}

      {ended.length > 0 && (
        <>
          <h3 className="section-title">Riwayat acara</h3>
          {ended.map((e) => {
            const def = EVENT_KINDS[e.kind];
            return (
              <article key={e.id} className="meeting-card ended" style={{ borderTopColor: def.color }}>
                <div className="task-title">{e.title}</div>
                <p className="task-desc">
                  {def.label} · {def.locationName} · {formatTime(e.startedAt)}
                  {e.endedAt ? ` – ${formatTime(e.endedAt)}` : ''} · {e.participantIds.length} peserta
                </p>
                <div className="task-actions">
                  <button type="button" onClick={() => onDelete(e.id)}>
                    Hapus riwayat
                  </button>
                </div>
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
