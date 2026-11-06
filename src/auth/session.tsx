import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ADMIN_EMAIL, ADMIN_NAME } from '../config';
import type { Me, Member } from '../types';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Signed in with an address that is not (or no longer) on the team. */
  | { status: 'notInvited'; email: string }
  /** Admin signed in with password but the address is not verified yet. */
  | { status: 'needsVerify'; email: string }
  | { status: 'ready'; user: User; me: Me };

const SessionContext = createContext<SessionState>({ status: 'loading' });

async function resolve(user: User | null): Promise<SessionState> {
  if (!user || !user.email) return { status: 'signedOut' };
  const email = user.email.toLowerCase();
  if (email === ADMIN_EMAIL) {
    if (!user.emailVerified) return { status: 'needsVerify', email };
    return { status: 'ready', user, me: { email, name: ADMIN_NAME, role: 'admin', projectIds: null } };
  }
  try {
    const snap = await getDoc(doc(db, 'members', email));
    if (!snap.exists()) return { status: 'notInvited', email };
    const m = snap.data() as Omit<Member, 'id'>;
    return { status: 'ready', user, me: { email, name: m.name, role: m.role, projectIds: m.projectIds || [] } };
  } catch {
    // permission-denied means the address is not a member
    return { status: 'notInvited', email };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    const unsub = onIdTokenChanged(auth, async (user) => {
      const next = await resolve(user);
      if (alive) setState(next);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
