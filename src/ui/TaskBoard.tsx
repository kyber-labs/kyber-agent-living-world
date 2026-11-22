// Papan Kanban — Phase 4 (MASTER PROMPT §6).
// Tiga kolom (To Do / Doing / Done), kartu tugas dengan prioritas,
// penugasan, deadline, dan penanda terblokir dependensi. Buat tugas baru
// lewat formulir; pindahkan status dengan tombol; tugas tanpa penugasan
// bisa ditugaskan otomatis oleh engine (LLM / aturan).

import { useState } from 'react';
import { AGENTS } from '../config/agents';
import { isBlocked } from '../simulation/taskLogic';
import type { NewTaskInput, Task, TaskPriority, TaskStatus } from '../types/task';
import { PRIORITY_LABEL, STATUS_LABEL } from '../types/task';

interface Props {
  tasks: Task[];
  note: string | null;
  onAdd: (input: NewTaskInput) => void;
  onMove: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onAutoAssign: (id: string) => void;
  assigningId: string | null;
  onClose: () => void;
}

const COLUMNS: TaskStatus[] = ['todo', 'doing', 'done'];
const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

export function TaskBoard({ tasks, note, onAdd, onMove, onDelete, onAutoAssign, assigningId, onClose }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dependsOn, setDependsOn] = useState('');

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const openCount = tasks.filter((t) => t.status !== 'done').length;

  function submitForm(): void {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      priority,
      assigneeId: assigneeId || null,
      deadline: deadline || null,
      dependsOn: dependsOn ? [dependsOn] : [],
    });
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssigneeId('');
    setDeadline('');
    setDependsOn('');
    setShowForm(false);
  }

  return (
    <section className="board-overlay" aria-label="Papan tugas">
      <div className="board-header">
        <h2>Papan Tugas <span className="muted">· {openCount} tugas terbuka</span></h2>
        <div className="board-actions">
          <button type="button" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Batal' : '+ Tugas baru'}
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup papan tugas">✕</button>
        </div>
      </div>

      {note && <p className="assign-note">{note}</p>}

      {showForm && (
        <form
          className="task-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitForm();
          }}
        >
          <label>
            Judul *
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Perbaiki bug login" required />
          </label>
          <label>
            Deskripsi
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detail singkat tugas" />
          </label>
          <div className="form-row">
            <label>
              Prioritas
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </label>
            <label>
              Ditugaskan ke
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— Belum ditugaskan —</option>
                {AGENTS.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </label>
            <label>
              Deadline
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </label>
            <label>
              Bergantung pada
              <select value={dependsOn} onChange={(e) => setDependsOn(e.target.value)}>
                <option value="">— Tidak ada —</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="primary">Simpan tugas</button>
        </form>
      )}

      <div className="board-columns">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="board-col">
              <h3>{STATUS_LABEL[col]} <span className="muted">({colTasks.length})</span></h3>
              {colTasks.map((t) => {
                const assignee = AGENTS.find((a) => a.id === t.assigneeId) ?? null;
                const blocked = isBlocked(t, tasks);
                const blockers = t.dependsOn
                  .map((depId) => byId.get(depId))
                  .filter((d): d is Task => !!d && d.status !== 'done');
                return (
                  <article key={t.id} className="task-card" style={{ borderTopColor: assignee?.color ?? '#94a3b8' }}>
                    <div className="task-title">{t.title}</div>
                    {t.description && <p className="task-desc">{t.description}</p>}
                    <div className="task-meta">
                      <span className={`priority priority-${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span>
                      {assignee ? (
                        <span>{assignee.name}</span>
                      ) : (
                        <span className="muted">Belum ditugaskan</span>
                      )}
                      {t.deadline && <span>⏰ {t.deadline}</span>}
                    </div>
                    {blocked && (
                      <p className="task-blocked">
                        Terblokir oleh: {blockers.map((b) => b.title).join(', ')}
                      </p>
                    )}
                    <div className="task-actions">
                      {col !== 'todo' && (
                        <button type="button" onClick={() => onMove(t.id, col === 'doing' ? 'todo' : 'doing')}>←</button>
                      )}
                      {col !== 'done' && (
                        <button type="button" onClick={() => onMove(t.id, col === 'todo' ? 'doing' : 'done')}>→</button>
                      )}
                      {!assignee && (
                        <button
                          type="button"
                          onClick={() => onAutoAssign(t.id)}
                          disabled={assigningId === t.id}
                        >
                          {assigningId === t.id ? 'Memilih…' : 'Tugaskan otomatis'}
                        </button>
                      )}
                      <button type="button" onClick={() => onDelete(t.id)} aria-label={`Hapus ${t.title}`}>Hapus</button>
                    </div>
                  </article>
                );
              })}
              {colTasks.length === 0 && <p className="muted">Tidak ada tugas.</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
