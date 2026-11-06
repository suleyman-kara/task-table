import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import './login.css';
import type { SessionState } from './session';
import {
  AUTH_MESSAGES,
  AuthError,
  adminSignIn,
  completeLoginLink,
  isLoginLink,
  logout,
  savedLinkEmail,
  sendLoginLink,
  sendPasswordReset,
  type AuthErrorCode,
} from './authActions';
import { auth } from '../firebase';
import { CardHead, EmailField, FieldError, FieldOk, LoadingCard, LoginShell, SubmitButton } from './LoginParts';

type Step = 'form' | 'admin' | 'sent' | 'expired' | 'otherDevice' | 'loading' | 'done' | 'verify';
/** Which admin field an error belongs to ("form" = general error shown under the password, no field marked). */
type ErrOn = 'email' | 'pass' | 'both' | 'form';

const RESEND_COOLDOWN_MS = 30_000;
const VERIFY_NOTE =
  'E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzdaki bağlantıya tıklayın, sonra tekrar giriş yapın.';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function codeOf(e: unknown): AuthErrorCode {
  return e instanceof AuthError ? e.code : 'unknown';
}

/** Drop the one-time sign-in parameters from the address bar. */
function cleanUrl() {
  if (isLoginLink()) window.history.replaceState(null, '', '/');
}

// The link can be redeemed once; guard against StrictMode's double effect run.
let linkAttempt: Promise<void> | null = null;

export function LoginPage({ session }: { session: SessionState }) {
  const linkOnMount = useRef(isLoginLink());
  const [step, setStep] = useState<Step>(() => {
    if (!linkOnMount.current) return 'form';
    return savedLinkEmail() ? 'loading' : 'otherDevice';
  });
  const [email, setEmailRaw] = useState(() => (linkOnMount.current ? savedLinkEmail() || '' : ''));
  const [password, setPasswordRaw] = useState('');
  const [error, setError] = useState('');
  const [errOn, setErrOn] = useState<ErrOn>('email');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resentNow, setResentNow] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fail = (msg: string, on: ErrOn = 'email') => {
    if (!alive.current) return;
    setError(msg);
    setErrOn(on);
  };

  // --- Finish sign-in from an emailed link -------------------------------------------------------
  const finishLink = async (address?: string) => {
    setBusy(true);
    setError('');
    try {
      linkAttempt ??= completeLoginLink(address);
      await linkAttempt;
      linkAttempt = null;
      if (alive.current) setStep('done');
    } catch (e) {
      linkAttempt = null;
      if (!alive.current) return;
      const code = codeOf(e);
      if (code === 'expired-link') {
        cleanUrl();
        setStep('expired');
      } else if (code === 'email-mismatch' || !address) {
        // Saved email failed for another reason → let the user type it (other-device form shows the error).
        setStep('otherDevice');
        fail(AUTH_MESSAGES[code]);
      } else {
        fail(AUTH_MESSAGES[code]);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (linkOnMount.current && savedLinkEmail()) void finishLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signed in, link cleaned, but App last rendered while the link was still in the URL: nudge the
  // session (a token refresh re-emits it) so App re-checks isLoginLink() and shows the app.
  const ready = session.status === 'ready';
  useEffect(() => {
    if (step !== 'done' || !ready || isLoginLink()) return;
    auth.currentUser?.getIdToken(true).catch(() => window.location.assign('/'));
  }, [step, ready]);

  // --- Resend cooldown ticker ---------------------------------------------------------------------
  const left = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const t = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= cooldownUntil) window.clearInterval(t);
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldownUntil]);

  // Move focus to the new card's first control when the user switches steps.
  const firstRender = useRef(true);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = boxRef.current?.querySelector<HTMLElement>('input, .card button, .card h1');
    el?.focus();
  }, [step]);

  // --- Handlers -----------------------------------------------------------------------------------
  const setEmail = (v: string) => {
    setEmailRaw(v);
    setError('');
    setErrOn('email');
  };
  const setPassword = (v: string) => {
    setPasswordRaw(v);
    setError('');
    setErrOn('email');
  };
  const go = (next: Step) => {
    setStep(next);
    setError('');
    setErrOn('email');
    setResetSent(false);
    setPasswordRaw('');
  };
  const back = () => {
    cleanUrl();
    go('form');
  };

  const requestLink = async (address: string, opts: { resend?: boolean } = {}) => {
    setBusy(true);
    setError('');
    setResentNow(false);
    try {
      await sendLoginLink(address);
      if (!alive.current) return;
      const n = Date.now();
      setEmailRaw(address);
      setNow(n);
      setCooldownUntil(n + RESEND_COOLDOWN_MS);
      setStep('sent');
      setResentNow(!!opts.resend);
    } catch (e) {
      fail(AUTH_MESSAGES[codeOf(e)]);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = email.trim();
    if (!isEmail(v)) return fail(AUTH_MESSAGES['invalid-email']);
    void requestLink(v);
  };

  const resend = () => {
    if (busy || left > 0) return;
    void requestLink(email, { resend: true });
  };

  const confirmDevice = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = email.trim();
    if (!isEmail(v)) return fail(AUTH_MESSAGES['invalid-email']);
    setStep('loading');
    void finishLink(v).then(() => {
      // finishLink sets 'done' / 'expired' itself; on an inline error go back to the form.
      if (alive.current) setStep((s) => (s === 'loading' ? 'otherDevice' : s));
    });
  };

  const adminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = email.trim();
    setResetSent(false);
    if (!v) return fail('E-posta adresinizi girin.', 'email');
    if (!isEmail(v)) return fail(AUTH_MESSAGES['invalid-email'], 'email');
    if (!password) return fail('Şifrenizi girin.', 'pass');
    setBusy(true);
    setError('');
    try {
      const result = await adminSignIn(v, password);
      if (result === 'verification-sent') {
        await logout();
        if (alive.current) go('verify');
      }
      // 'ok': the session turns ready and App swaps this page for the app.
    } catch (err) {
      const code = codeOf(err);
      if (code === 'wrong-password') {
        setPasswordRaw('');
        fail(AUTH_MESSAGES[code], 'both');
      } else {
        fail(AUTH_MESSAGES[code], 'form');
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const forgot = async () => {
    if (busy) return;
    const v = email.trim();
    if (!isEmail(v)) {
      setResetSent(false);
      return fail('Önce e-posta adresinizi girin.', 'email');
    }
    setBusy(true);
    setError('');
    setResetSent(false);
    try {
      await sendPasswordReset(v);
      if (alive.current) setResetSent(true);
    } catch (err) {
      fail(AUTH_MESSAGES[codeOf(err)], 'email');
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const signOutAndRestart = async (next: Step) => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      if (alive.current) go(next);
    } catch (err) {
      fail(AUTH_MESSAGES[codeOf(err)]);
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  // --- Render -------------------------------------------------------------------------------------
  const hasError = !!error;
  let card: ReactNode;
  let foot = !hasError;

  if (step === 'loading' || (step === 'done' && session.status === 'signedOut')) {
    card = <LoadingCard />;
    foot = false;
  } else if (session.status === 'notInvited') {
    card = (
      <div className="card">
        <CardHead title="Erişiminiz yok">
          <span className="mail">{session.email}</span> ile oturum açtınız.
        </CardHead>
        <FieldError id="n-err">Bu e-posta artık ekipte değil. Erişim için yöneticinize başvurun.</FieldError>
        {hasError && <FieldError id="n-err2">{error}</FieldError>}
        <button className="btn" type="button" aria-disabled={busy || undefined} aria-busy={busy || undefined} onClick={() => signOutAndRestart('form')}>
          Farklı e-posta
        </button>
      </div>
    );
    foot = false;
  } else if (session.status === 'needsVerify' || step === 'verify') {
    card = (
      <div className="card">
        <CardHead title="E-postanızı doğrulayın" />
        <FieldOk>{VERIFY_NOTE}</FieldOk>
        {hasError && <FieldError id="v-err">{error}</FieldError>}
        <button
          className="btn primary"
          type="button"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          onClick={() => (session.status === 'needsVerify' ? signOutAndRestart('admin') : go('admin'))}
        >
          Tekrar giriş yap
        </button>
      </div>
    );
    foot = false;
  } else if (step === 'done') {
    const who = session.status === 'ready' ? session.me.email : email;
    card = (
      <div className="card">
        <CardHead title="Giriş yapıldı">
          <span className="mail">{who}</span> olarak oturum açtınız.
        </CardHead>
        <a className="btn primary" href="/">
          Uygulamaya geç
        </a>
      </div>
    );
    foot = false;
  } else if (step === 'admin') {
    const mailErr = hasError && errOn === 'email';
    const passErr = hasError && errOn !== 'email';
    card = (
      <form className="card" noValidate onSubmit={adminSubmit}>
        <CardHead title="Yönetici girişi">E-posta adresiniz ve şifrenizle giriş yapın.</CardHead>
        <EmailField
          id="a-mail"
          name="username"
          autoComplete="username"
          value={email}
          onChange={setEmail}
          error={mailErr ? error : undefined}
          invalid={hasError && (errOn === 'email' || errOn === 'both')}
        />
        <div className="field">
          <label className="label" htmlFor="a-pass">
            Şifre
          </label>
          <input
            className="input"
            id="a-pass"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={hasError && (errOn === 'pass' || errOn === 'both')}
            aria-describedby={passErr ? 'a-pass-err' : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {passErr && <FieldError id="a-pass-err">{error}</FieldError>}
          {resetSent && <FieldOk>Şifre sıfırlama bağlantısı gönderildi.</FieldOk>}
        </div>
        <SubmitButton busy={busy}>Giriş yap</SubmitButton>
        <div className="link-row">
          <button className="link-btn" type="button" aria-disabled={busy || undefined} onClick={forgot}>
            Şifremi unuttum
          </button>
          <button className="link-btn" type="button" onClick={back}>
            Bağlantıyla giriş yap
          </button>
        </div>
      </form>
    );
  } else if (step === 'sent') {
    const resendOff = left > 0 || busy;
    card = (
      <div className="card">
        <CardHead title="E-postanızı kontrol edin">
          <span className="mail">{email}</span> adresine bir giriş bağlantısı gönderdik. Bağlantıyı bu cihazda açın.
        </CardHead>
        <p className="hint">Gelmediyse spam klasörüne bakın.</p>
        <div className="actions">
          <button className="btn" type="button" aria-disabled={resendOff} aria-busy={busy || undefined} onClick={resend}>
            {left > 0 ? `Tekrar gönder · ${left} sn` : 'Tekrar gönder'}
          </button>
          <button className="btn" type="button" onClick={back}>
            Farklı e-posta
          </button>
        </div>
        {resentNow && (
          <p className="hint" role="status">
            Yeni bağlantı gönderildi.
          </p>
        )}
        {hasError && <FieldError id="s-err">{error}</FieldError>}
      </div>
    );
  } else if (step === 'expired') {
    card = (
      <form className="card" noValidate onSubmit={send}>
        <CardHead title="Bağlantı geçersiz">Bu bağlantı kullanılmış ya da süresi geçmiş. Yeni bir bağlantı isteyin.</CardHead>
        <EmailField id="x-mail" value={email} onChange={setEmail} error={error || undefined} />
        <SubmitButton busy={busy}>Yeni bağlantı gönder</SubmitButton>
        <button className="link-btn" type="button" onClick={back}>
          Giriş ekranına dön
        </button>
      </form>
    );
  } else if (step === 'otherDevice') {
    card = (
      <form className="card" noValidate onSubmit={confirmDevice}>
        <CardHead title="E-postanızı doğrulayın">
          Bağlantıyı başka bir cihazda açtınız. Devam etmek için e-postanızı yeniden girin.
        </CardHead>
        <EmailField id="d-mail" value={email} onChange={setEmail} error={error || undefined} />
        <SubmitButton busy={busy}>Girişi tamamla</SubmitButton>
        <button className="link-btn" type="button" onClick={back}>
          Yeni bağlantı iste
        </button>
      </form>
    );
  } else {
    card = (
      <form className="card" noValidate onSubmit={send}>
        <CardHead title="Giriş yap">E-postanıza tek kullanımlık bir giriş bağlantısı göndereceğiz.</CardHead>
        <EmailField id="l-mail" value={email} onChange={setEmail} error={error || undefined} />
        <SubmitButton busy={busy}>Giriş bağlantısı gönder</SubmitButton>
        <button className="link-btn" type="button" onClick={() => go('admin')}>
          Yönetici misiniz? Şifreyle giriş yapın
        </button>
      </form>
    );
  }

  return (
    <LoginShell foot={foot}>
      <div ref={boxRef} style={{ display: 'contents' }}>
        {card}
      </div>
    </LoginShell>
  );
}
