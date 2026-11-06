import { SessionProvider, useSession } from './auth/session';
import { isLoginLink } from './auth/authActions';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './app/AppShell';

function Root() {
  const session = useSession();
  if (session.status === 'loading') return <div className="splash" role="status">Yükleniyor…</div>;
  // A sign-in link in the address bar always goes through the login flow first.
  if (session.status !== 'ready' || isLoginLink()) return <LoginPage session={session} />;
  return <AppShell me={session.me} />;
}

export function App() {
  return (
    <SessionProvider>
      <Root />
    </SessionProvider>
  );
}
