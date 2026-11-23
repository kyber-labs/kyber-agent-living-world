// Jam dinding nyata (WIB) di header — Phase 8.1.
// Berdetak tiap detik. Ini JAM DINDING, bukan jam simulasi Phase 5
// (1 hari = 10 menit, tampil di HUD) — keduanya tampil berdampingan
// dan tidak boleh dicampur aduk.

import { useEffect, useState } from 'react';
import { formatWib } from '../simulation/wallClock';

export function WallClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="wall-clock" title="Jam dinding (WIB)">
      {formatWib(now)} WIB
    </span>
  );
}
