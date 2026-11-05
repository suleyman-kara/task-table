import type { AppData } from '../data/store';

// Placeholder — implemented in sprint D.
export function ProjectsPage({ data }: { data: AppData }) {
  return <div className="page">Projects ({data.status})</div>;
}
