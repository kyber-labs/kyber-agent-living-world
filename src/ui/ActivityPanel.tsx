// Panel Aktivitas — Phase 8.1 (feed aktivitas).
// Daftar kejadian bermakna, terbaru di atas, masing-masing dengan jam
// WIB saat kejadian. Memakai .board-overlay yang sama dengan panel
// lain (Kanban, Meeting, dsb.).

import type { ActivityEntry } from '../simulation/activityStore';
import { formatWib } from '../simulation/wallClock';

interface Props {
  entries: ActivityEntry[];
  onClear: () => void;
  onClose: () => void;
}

export function ActivityPanel({ entries, onClear, onClose }: Props) {
  return (
    <div className="board-overlay" role="dialog" aria-label="Aktivitas">
      <div className="board-header">
        <h2>Aktivitas</h2>
        <div className="board-actions">
          <button type="button" onClick={onClear} disabled={entries.length === 0}>
            Hapus riwayat
          </button>
          <button type="button" onClick={onClose} aria-label="Tutup panel aktivitas">
            ✕
          </button>
        </div>
      </div>
      <p className="muted">
        Kejadian bermakna — tugas, meeting, acara, dan objek builder. Perubahan status
        ambient agent tidak dicatat supaya feed tidak banjir.
      </p>
      {entries.length === 0 ? (
        <p className="muted">Belum ada aktivitas. Buat tugas, mulai meeting, atau tempatkan objek builder — kejadiannya tercatat di sini.</p>
      ) : (
        <ul className="activity-list">
          {entries.map((entry) => (
            <li key={entry.id} className="activity-item">
              <span className="activity-time">{formatWib(new Date(entry.time))}</span>
              <span className="activity-text">{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
