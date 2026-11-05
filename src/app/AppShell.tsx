import type { Me } from '../types';

// Placeholder — implemented in sprint C.
export function AppShell({ me }: { me: Me }) {
  return <div className="splash">Merhaba {me.name}</div>;
}
