// Jam dinding nyata (WIB) — Phase 8.1.
// Berbeda dengan jam simulasi Phase 5 (1 hari = 10 menit nyata, mulai
// 08:00 tiap muat): ini jam dinding perangkat, zona Asia/Jakarta,
// format 24 jam HH:MM:SS. Dipakai header (komponen WallClock).
// hourCycle 'h23' (bukan hour12:false) supaya tengah malam tetap
// "00:00:00", bukan "24:00:00" di beberapa lingkungan.

const wibFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Format tanggal menjadi "HH:MM:SS" waktu Jakarta (WIB, UTC+7). */
export function formatWib(date: Date): string {
  // formatToParts + gabung ':' sendiri: locale id-ID memisahkan jam
  // dengan titik ("16.43.25"), sedangkan spesifikasi 8.1 meminta
  // titik dua ("16:43:25") seperti di screenshot acuan.
  const parts = wibFormatter.formatToParts(date);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}
