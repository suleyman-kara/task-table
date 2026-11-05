import type { SessionState } from './session';

// Placeholder — implemented in sprint B.
export function LoginPage({ session }: { session: SessionState }) {
  return <div className="splash">Giriş ({session.status})</div>;
}
