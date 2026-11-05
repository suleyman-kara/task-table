const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

/** Local date as 'YYYY-MM-DD'. */
export function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** '2026-11-05' -> '5 Kas' */
export function shortDate(iso: string): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]}`;
}

/** '2026-11-05' -> '05.11.2026' */
export function trDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Text shown on a card for a task's dates. */
export function dateRange(start: string, end: string): string {
  if (start && end) return `${shortDate(start)} – ${shortDate(end)}`;
  if (end) return `Bitiş ${shortDate(end)}`;
  if (start) return `Başl. ${shortDate(start)}`;
  return '';
}

export function isLate(end: string, today = isoDate()): boolean {
  return !!end && end < today;
}
