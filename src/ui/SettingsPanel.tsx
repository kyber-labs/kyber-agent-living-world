// Panel Atur — Phase 8.1. Pengaturan yang benar-benar berfungsi saja:
// (a) tampilkan/sembunyikan label nama agent di 3D, (b) tampilkan/
// sembunyikan minimap, (c) blok "Tentang" (versi, model LLM aktif,
// status database). Tidak ada pengaturan lain yang tidak berfungsi.

interface Props {
  showLabels: boolean;
  showMinimap: boolean;
  onToggleLabels: (visible: boolean) => void;
  onToggleMinimap: (visible: boolean) => void;
  /** Nama provider/model LLM aktif dari engine (mis. "Gemini gemini-3.5-flash-lite"). */
  providerName: string;
  engineMode: 'live' | 'simulation';
  dbConfigured: boolean;
  onClose: () => void;
}

export function SettingsPanel({
  showLabels,
  showMinimap,
  onToggleLabels,
  onToggleMinimap,
  providerName,
  engineMode,
  dbConfigured,
  onClose,
}: Props) {
  return (
    <div className="board-overlay" role="dialog" aria-label="Pengaturan">
      <div className="board-header">
        <h2>Atur</h2>
        <div className="board-actions">
          <button type="button" onClick={onClose} aria-label="Tutup panel pengaturan">
            ✕
          </button>
        </div>
      </div>
      <h3 className="section-title">Tampilan</h3>
      <label className="settings-row" htmlFor="setting-labels">
        <span>Label nama agent di dunia 3D</span>
        <input
          id="setting-labels"
          type="checkbox"
          checked={showLabels}
          onChange={(e) => onToggleLabels(e.target.checked)}
        />
      </label>
      <label className="settings-row" htmlFor="setting-minimap">
        <span>Minimap</span>
        <input
          id="setting-minimap"
          type="checkbox"
          checked={showMinimap}
          onChange={(e) => onToggleMinimap(e.target.checked)}
        />
      </label>
      <h3 className="section-title">Tentang</h3>
      <div className="settings-about">
        <div className="detail-row">
          <span>Versi</span>
          <strong>Phase 9 — Kampung Senja</strong>
        </div>
        <div className="detail-row">
          <span>AI Engine</span>
          <strong>
            {providerName} ({engineMode === 'live' ? 'live' : 'simulasi'})
          </strong>
        </div>
        <div className="detail-row">
          <span>Database</span>
          <strong>{dbConfigured ? 'terhubung' : 'belum dikonfigurasi'}</strong>
        </div>
        <p className="muted">
          Lencana "LIVE" di header berarti aplikasi berjalan live, bukan berarti agent
          mengeksekusi pekerjaan nyata — agent di sini adalah simulasi (lihat
          docs/PHASES.md §8.1).
        </p>
      </div>
    </div>
  );
}
