#!/usr/bin/env bash
# Uji gabungan — Phase 9.
# Menjalankan SEMUA suite logika (Phase 4.1, 5, 6, 6.1, 6.2, 7, 7.1, 8.1, 8.2, 8.3, 8.3.1, 8.3.2, 9) lewat bundle
# rolldown, lalu melaporkan total. Satu perintah dari root proyek:
#   bash scripts/run-all-tests.sh
# atau:
#   npm test
# Keluar 0 bila semua suite lulus, 1 bila ada yang gagal.
# Catatan: `node scripts/<suite>-test.ts` langsung TIDAK bisa dipakai —
# import tanpa ekstensi gaya Vite tidak bisa di-resolve Node ESM
# (bukan cacat aplikasi); karena itu tiap suite dibundel dulu dengan
# rolldown (bundler yang dipakai Vite 8), sama seperti yang dilakukan
# Antigravity di langkah verifikasi tiap fase.
set -u
cd "$(dirname "$0")/.."

SUITES="phase41 phase5 phase6 phase61 phase62 phase7 phase71 phase81 phase82 phase83 phase831 phase9"
total_pass=0
total_fail=0
failed_suites=""

for s in $SUITES; do
  echo "== $s =="
  if ! ./node_modules/.bin/rolldown "scripts/$s-test.ts" --format esm --file "/tmp/$s-test.mjs" > /dev/null 2>&1; then
    echo "  GAGAL membundel scripts/$s-test.ts"
    failed_suites="$failed_suites $s"
    continue
  fi
  if node "/tmp/$s-test.mjs" > "/tmp/$s-result.txt" 2>&1; then
    tail -2 "/tmp/$s-result.txt"
  else
    echo "  GAGAL:"
    tail -5 "/tmp/$s-result.txt"
    failed_suites="$failed_suites $s"
  fi
  pass=$(grep -oE 'Hasil: [0-9]+ lulus' "/tmp/$s-result.txt" | grep -oE '[0-9]+' || true)
  fail=$(grep -oE '[0-9]+ gagal' "/tmp/$s-result.txt" | head -1 | grep -oE '[0-9]+' || true)
  total_pass=$((total_pass + ${pass:-0}))
  total_fail=$((total_fail + ${fail:-0}))
done

echo ""
echo "TOTAL: $total_pass lulus, $total_fail gagal"
if [ -n "$failed_suites" ]; then
  echo "Suite gagal:${failed_suites}"
  exit 1
fi
exit 0
