import type { AppData } from '../data/store';

// Placeholder — implemented in sprint D.
export function DonePage({ data }: { data: AppData }) {
  return <div className="page">Done ({data.status})</div>;
}
