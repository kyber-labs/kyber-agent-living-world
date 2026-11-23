// Format detail error LLM untuk pesan fallback — Phase 4.1.
// Fungsi murni (tanpa efek samping), mudah diuji.
// Error asli dari llm.ts sudah berisi status HTTP + pesan Google
// ("Gemini HTTP 429: ..."); fungsi ini hanya memangkas dan menjaga
// agar nilai non-Error / pesan kosong tetap aman ditampilkan.
// Detail ini TIDAK mengandung API key (key dikirim lewat header,
// bukan URL), jadi aman ditampilkan di UI.

/** Panjang maksimum detail error yang ditampilkan di pesan fallback. */
export const LLM_ERROR_DETAIL_MAX_LENGTH = 160;

/**
 * Format nilai error apa pun menjadi detail singkat untuk pesan
 * fallback chat / penugasan otomatis.
 */
export function formatLlmErrorDetail(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const trimmed = message.trim();
  if (trimmed === '') return 'error tidak dikenal';
  return trimmed.length > LLM_ERROR_DETAIL_MAX_LENGTH
    ? `${trimmed.slice(0, LLM_ERROR_DETAIL_MAX_LENGTH)}…`
    : trimmed;
}
