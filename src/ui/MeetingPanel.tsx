// Panel meeting — Phase 5 (MASTER PROMPT §7).
// Daftar 6 ruang + keterisian, mulai meeting (room, topik, agenda,
// peserta), whiteboard = catatan bersama per meeting, akhiri meeting,
// dan riwayat meeting yang sudah selesai. Semua state lewat MeetingStore
// (localStorage); panel ini hanya tampilan + formulir.

import { useState } from 'react';
import { AGENTS } from '../config/agents';
import type { Meeting, MeetingRoom, NewMeetingInput } from '../types/meeting';
import { MEETING_ROOMS } from '../types/meeting';

interface Props {
  meetings: Meeting[];
  onStart: (input: NewMeetingInput) => string | null;
  onEnd: (id: string) => void;
  onAddNote: (meetingId: string, authorId: string | null, text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function MeetingPanel({ meetings, onStart, onEnd, onAddNote, onDelete, onClose }: Props) {
  const [formRoomId, setFormRoomId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [agenda, setAgenda] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<Record<string, string>>({});
  const [noteAuthor, setNoteAuthor] = useState<Record<string, string>>({});

  const active = meetings.filter((m) => m.status === 'active');
  const ended = meetings.filter((m) => m.status === 'ended');
  const activeByRoom = new Map(active.map((m) => [m.roomId, m]));
  const formRoom: MeetingRoom | undefined = MEETING_ROOMS.find((r) => r.id === formRoomId);

  function toggleParticipant(id: string): void {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submitForm(): void {
    if (!formRoom) return;
    const err = onStart({
      roomId: formRoom.id,
      topic: topic.trim(),
      agenda: agenda.trim(),
      participantIds: checked,
    });
    if (err) {
      setError(err);
      return;
    }
    setTopic('');
    setAgenda('');
    setChecked([]);
    setError(null);
    setFormRoomId(null);
  }

  return (
    <section className="board-overlay" aria-label="Ruang meeting">
      <div className="board-header">
        <h2>Ruang Meeting <span className="muted">· {active.length} berlangsung</span></h2>
        <div className="board-actions">
          <button type="button" onClick={onClose} aria-label="Tutup panel meeting">✕</button>
        </div>
      </div>

      <h3 className="section-title">Ruang</h3>
      <div className="room-grid">
        {MEETING_ROOMS.map((room) => {
          const meeting = activeByRoom.get(room.id);
          return (
            <article key={room.id} className="room-card" style={{ borderTopColor: room.color }}>
              <div className="room-name">{room.name}</div>
              <div className="muted">Kapasitas {room.capacity} orang</div>
              {meeting ? (
                <p className="room-busy">Dipakai: {meeting.topic} ({meeting.participantIds.length} peserta)</p>
              ) : (
                <p className="muted">Kosong</p>
              )}
              <button
                type="button"
                disabled={!!meeting}
                onClick={() => {
                  setFormRoomId(room.id);
                  setError(null);
                }}
              >
                Mulai meeting
              </button>
            </article>
          );
        })}
      </div>

      {formRoom && (
        <form
          className="task-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
        >
          <h3 className="form-title">Meeting baru — {formRoom.name}</h3>
          <label>
            Topik *
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Contoh: Tinjauan sprint" required />
          </label>
          <label>
            Agenda
            <input value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Poin yang dibahas" />
          </label>
          <fieldset className="check-fieldset">
            <legend>Peserta (pilih minimal 2, maks {formRoom.capacity})</legend>
            <div className="check-list">
              {AGENTS.map((a) => (
                <label key={a.id} className="check-item">
                  <input
                    type="checkbox"
                    checked={checked.includes(a.id)}
                    onChange={() => toggleParticipant(a.id)}
                  />
                  <span className="agent-dot" style={{ background: a.color }} />
                  {a.name} <span className="muted">({a.role})</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error && <p className="error-text">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary">Mulai meeting</button>
            <button
              type="button"
              onClick={() => {
                setFormRoomId(null);
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
          <h3 className="section-title">Meeting berlangsung</h3>
          {active.map((m) => {
            const room = MEETING_ROOMS.find((r) => r.id === m.roomId);
            const participants = m.participantIds.map(
              (id) => AGENTS.find((a) => a.id === id)?.name ?? id,
            );
            return (
              <article key={m.id} className="meeting-card" style={{ borderTopColor: room?.color ?? '#94a3b8' }}>
                <div className="task-title">{m.topic}</div>
                <p className="task-desc">
                  {room?.name ?? m.roomId} · {participants.join(', ')} · mulai {formatTime(m.startedAt)}
                </p>
                {m.agenda && <p className="task-desc">Agenda: {m.agenda}</p>}
                <h4 className="notes-title">Catatan bersama (whiteboard)</h4>
                {m.notes.length === 0 ? (
                  <p className="muted">Belum ada catatan.</p>
                ) : (
                  <ul className="note-list">
                    {m.notes.map((n) => (
                      <li key={n.id} className="note-item">
                        <strong>{n.authorId ? (AGENTS.find((a) => a.id === n.authorId)?.name ?? n.authorId) : 'Bos'}</strong>
                        {': '}
                        {n.text}
                        <span className="muted"> · {formatTime(n.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="note-form">
                  <select
                    value={noteAuthor[m.id] ?? ''}
                    onChange={(e) => setNoteAuthor((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    aria-label="Penulis catatan"
                  >
                    <option value="">Bos</option>
                    {m.participantIds.map((id) => {
                      const a = AGENTS.find((x) => x.id === id);
                      return (
                        <option key={id} value={id}>{a?.name ?? id}</option>
                      );
                    })}
                  </select>
                  <input
                    value={noteText[m.id] ?? ''}
                    onChange={(e) => setNoteText((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="Tulis catatan bersama…"
                    aria-label="Catatan baru"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const text = noteText[m.id] ?? '';
                      if (!text.trim()) return;
                      onAddNote(m.id, noteAuthor[m.id] || null, text);
                      setNoteText((prev) => ({ ...prev, [m.id]: '' }));
                    }}
                  >
                    Tambah
                  </button>
                </div>
                <div className="task-actions">
                  <button type="button" onClick={() => onEnd(m.id)}>Akhiri meeting</button>
                </div>
              </article>
            );
          })}
        </>
      )}

      {ended.length > 0 && (
        <>
          <h3 className="section-title">Riwayat</h3>
          {ended.map((m) => {
            const room = MEETING_ROOMS.find((r) => r.id === m.roomId);
            return (
              <article key={m.id} className="meeting-card ended" style={{ borderTopColor: room?.color ?? '#94a3b8' }}>
                <div className="task-title">{m.topic}</div>
                <p className="task-desc">
                  {room?.name ?? m.roomId} · {formatTime(m.startedAt)}
                  {m.endedAt ? ` – ${formatTime(m.endedAt)}` : ''} · {m.participantIds.length} peserta
                </p>
                {m.notes.length > 0 && (
                  <ul className="note-list">
                    {m.notes.map((n) => (
                      <li key={n.id} className="note-item">
                        <strong>{n.authorId ? (AGENTS.find((a) => a.id === n.authorId)?.name ?? n.authorId) : 'Bos'}</strong>
                        {': '}
                        {n.text}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="task-actions">
                  <button type="button" onClick={() => onDelete(m.id)}>Hapus riwayat</button>
                </div>
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
