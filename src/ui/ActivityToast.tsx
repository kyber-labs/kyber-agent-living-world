// Toast aktivitas terbaru — Phase 8.1.
// Muncul di KIRI BAWAH (bukan tengah atas — pelajaran 7.2: jangan
// menutupi header/tombol), hilang sendiri setelah ~5 detik, dan tombol
// X benar-benar menutupnya. Toast yang sudah ditutup tidak muncul lagi
// tanpa aktivitas baru (App mengingat id terakhir yang tampil).

import type { ActivityEntry } from '../simulation/activityStore';

interface Props {
  entry: ActivityEntry;
  onClose: () => void;
}

export function ActivityToast({ entry, onClose }: Props) {
  return (
    <div className="activity-toast" role="status">
      <span className="activity-toast-text">{entry.text}</span>
      <button type="button" onClick={onClose} aria-label="Tutup notifikasi aktivitas">
        ✕
      </button>
    </div>
  );
}
