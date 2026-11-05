import type { AppData } from '../data/store';

// Placeholder — implemented in sprint D.
export function PeoplePage({ data }: { data: AppData }) {
  return <div className="page">People ({data.status})</div>;
}
