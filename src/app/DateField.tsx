import { useEffect, useRef, useState } from 'react';
import { trDate } from '../lib/dates';

/** 'gg.aa.yyyy' (also 'ggaayyyy', 'g.a.yyyy') -> 'YYYY-MM-DD'; '' -> ''; null when not a real date. */
export function parseTrDate(text: string): string | null {
  let v = text.trim();
  if (!v) return '';
  if (/^\d{8}$/.test(v)) v = `${v.slice(0, 2)}.${v.slice(2, 4)}.${v.slice(4)}`;
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(v);
  if (!m) return null;
  const d = +m[1];
  const mo = +m[2];
  const y = +m[3];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Date field shown as gg.aa.yyyy (instead of the browser's own format), with a calendar button
 * that opens the native picker.
 */
export function DateField({
  id,
  value,
  onChange,
  onValidity,
}: {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  onValidity: (ok: boolean) => void;
}) {
  const [text, setText] = useState(() => trDate(value));
  const picker = useRef<HTMLInputElement>(null);

  // Follow changes made from outside (the picker, a reset).
  useEffect(() => {
    setText((cur) => (parseTrDate(cur) === value ? cur : trDate(value)));
  }, [value]);

  const type = (t: string) => {
    setText(t);
    const iso = parseTrDate(t);
    onValidity(iso !== null);
    if (iso !== null && iso !== value) onChange(iso);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input mono"
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="gg.aa.yyyy"
        value={text}
        onChange={(e) => type(e.target.value)}
        onBlur={() => {
          const iso = parseTrDate(text);
          if (iso) setText(trDate(iso));
        }}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        className="icon-btn"
        aria-label="Takvimden seç"
        tabIndex={-1}
        style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)' }}
        onClick={() => {
          const el = picker.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
          }
        }}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => {
          onValidity(true);
          onChange(e.target.value);
          setText(trDate(e.target.value));
        }}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', border: 0, padding: 0 }}
      />
    </div>
  );
}
