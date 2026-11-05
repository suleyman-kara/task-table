import type { ReactNode } from 'react';

/** Page frame: brand mark above the card, optional footnote below (markup from Login.dc.html). */
export function LoginShell({ children, foot }: { children: ReactNode; foot?: boolean }) {
  return (
    <div className="lg">
      <main className="box">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          Task Table
        </div>
        {children}
        {foot && <p className="foot">Yalnızca yöneticinin eklediği e-postalar giriş yapabilir.</p>}
      </main>
    </div>
  );
}

export function CardHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1>{title}</h1>
      {children && <p className="sub">{children}</p>}
    </div>
  );
}

/** Inline error under a field (role="alert"). */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="field-msg err" id={id} role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M12 7.5v5M12 16h.01"></path>
      </svg>
      <span>{children}</span>
    </p>
  );
}

/** Inline confirmation under a field (role="status"). */
export function FieldOk({ children }: { children: ReactNode }) {
  return (
    <p className="field-msg" role="status">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7.5"></path>
      </svg>
      <span>{children}</span>
    </p>
  );
}

type EmailFieldProps = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  /** Mark the input invalid (defaults to "there is an error"). */
  invalid?: boolean;
  /** Admin form uses autocomplete="username" so password managers pair it with the password. */
  autoComplete?: 'email' | 'username';
  name?: string;
  autoFocus?: boolean;
  children?: ReactNode;
};

export function EmailField({ id, value, onChange, error, invalid, autoComplete = 'email', name = 'email', autoFocus, children }: EmailFieldProps) {
  const errId = `${id}-err`;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        E-posta
      </label>
      <input
        className="input"
        id={id}
        name={name}
        type="email"
        inputMode="email"
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        placeholder="ad@sirket.com"
        aria-invalid={invalid ?? !!error}
        aria-describedby={error ? errId : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
      />
      {error && <FieldError id={errId}>{error}</FieldError>}
      {children}
    </div>
  );
}

/** Spinner-free busy state for the primary button: stays focusable, ignores clicks via the handler. */
export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button className="btn primary" type="submit" aria-disabled={busy || undefined} aria-busy={busy || undefined}>
      {children}
    </button>
  );
}

export function LoadingCard({ title = 'Giriş yapılıyor…', sub = 'Oturumunuz hazırlanıyor.' }: { title?: string; sub?: string }) {
  return (
    <div className="card" role="status" aria-live="polite" aria-busy="true">
      <CardHead title={title}>{sub}</CardHead>
      <div className="progress" aria-hidden="true">
        <span></span>
      </div>
    </div>
  );
}
