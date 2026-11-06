import { useEffect, useMemo, useRef, useState } from 'react';
import { ADMIN_EMAIL, ADMIN_NAME } from '../config';
import { deleteMember, saveMember } from '../data/actions';
import type { AppData } from '../data/store';
import { initials, isValidEmail, normEmail } from '../lib/people';
import type { Member } from '../types';
import { LoadingRows, PencilIcon, PlusIcon, TrashIcon } from './icons';
import './pages.css';

interface PersonForm {
  editId: string | null; // the member's email (= id) when editing
  name: string;
  email: string;
  role: Member['role'];
  projectIds: string[];
  error: string;
}

const emptyForm = (): PersonForm => ({ editId: null, name: '', email: '', role: 'editor', projectIds: [], error: '' });

const ROLE_HINT: Record<Member['role'], string> = {
  editor: 'Seçili projelerde görev ekleyebilir, düzenleyebilir ve tamamlayabilir.',
  viewer: 'Seçili projelerin görevlerini yalnızca görebilir.',
};

export function PeoplePage({ data }: { data: AppData }) {
  const [form, setForm] = useState<PersonForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  // Move focus to the form when it opens or loads another person.
  useEffect(() => {
    if (!focusTick) return;
    const el = nameRef.current;
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.focus();
    }
  }, [focusTick]);

  // The person being edited was removed (here or elsewhere): close the form.
  useEffect(() => {
    if (form.editId && data.status === 'ready' && !data.members.some((m) => m.id === form.editId)) {
      setForm(emptyForm());
      setFormOpen(false);
    }
  }, [data.members, data.status, form.editId]);

  const projectIds = useMemo(() => new Set(data.projects.map((p) => p.id)), [data.projects]);
  const projectName = useMemo(() => new Map(data.projects.map((p) => [p.id, p.name])), [data.projects]);

  const openCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data.tasks) {
      if (t.doneAt) continue;
      for (const id of t.assigneeIds) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [data.tasks]);

  if (data.me.role !== 'admin') {
    return (
      <div className="page">
        <div className="panel">
          <div className="row">
            <span className="row-sub">Bu sayfayı yalnızca yönetici görebilir.</span>
          </div>
        </div>
      </div>
    );
  }

  const patch = (p: Partial<PersonForm>) => setForm((f) => ({ ...f, error: '', ...p }));

  const openNew = () => {
    setForm(emptyForm());
    setFormOpen(true);
    setFocusTick((n) => n + 1);
  };

  const edit = (m: Member) => {
    setConfirmId(null);
    setForm({ editId: m.id, name: m.name, email: m.email, role: m.role || 'editor', projectIds: (m.projectIds || []).slice(), error: '' });
    setFormOpen(true);
    setFocusTick((n) => n + 1);
  };

  const cancel = () => {
    setForm(emptyForm());
    setFormOpen(false);
  };

  const validate = (): string => {
    const name = form.name.trim();
    const email = normEmail(form.email);
    if (!name) return 'Ad girin.';
    if (!isValidEmail(email)) return 'Geçerli bir e-posta girin.';
    if (email === ADMIN_EMAIL) return 'Bu e-posta yöneticiye ait.';
    if (data.members.some((m) => m.id !== form.editId && normEmail(m.email || m.id) === email)) return 'Bu e-posta zaten listede.';
    if (!form.projectIds.some((id) => projectIds.has(id))) {
      return data.projects.length ? 'En az bir proje seçin.' : 'Önce Projeler sayfasından bir proje ekleyin.';
    }
    return '';
  };

  const save = () => {
    const error = validate();
    if (error) {
      setForm((f) => ({ ...f, error }));
      return;
    }
    saveMember(
      {
        name: form.name.trim(),
        email: normEmail(form.email),
        role: form.role,
        projectIds: form.projectIds.filter((id) => projectIds.has(id)),
      },
      form.editId || undefined,
    );
    cancel();
  };

  const remove = (m: Member) => {
    deleteMember(m.id);
    setConfirmId(null);
    if (form.editId === m.id) cancel();
  };

  const toggleProject = (id: string) =>
    patch({ projectIds: form.projectIds.includes(id) ? form.projectIds.filter((x) => x !== id) : [...form.projectIds, id] });

  const load = (email: string) => `${openCount.get(email) || 0} açık görev`;

  return (
    <div className="page">
      <div className="people-stack">
        <div className="panel">
          <div className="panel-head">
            <h2>Ekip</h2>
            <span className="row-sub">Yalnızca bu listedeki e-postalar giriş yapabilir</span>
          </div>

          <div className="ritem">
            <div className="row">
              <span className="av lg">{initials(ADMIN_NAME)}</span>
              <div className="grow">
                <div className="row-title">{ADMIN_NAME}</div>
                <div className="row-sub">{ADMIN_EMAIL} · tüm projeler · şifreyle giriş</div>
              </div>
              <span className="badge strong">Yönetici</span>
              <span className="row-sub row-load num">{load(ADMIN_EMAIL)}</span>
              <span className="row-acts" aria-hidden="true" />
            </div>
          </div>

          {data.status === 'loading' ? (
            <LoadingRows count={2} />
          ) : (
            data.members.map((m) => {
              const asking = confirmId === m.id;
              const n = openCount.get(m.id) || 0;
              const names = (m.projectIds || []).map((id) => projectName.get(id)).filter(Boolean);
              return (
                <div className="ritem" key={m.id}>
                  <div className={`row${formOpen && form.editId === m.id ? ' editing' : ''}`}>
                    <span className="av lg">{initials(m.name)}</span>
                    <div className="grow">
                      <div className="row-title">{m.name}</div>
                      <div className="row-sub">
                        {m.email || m.id} · {names.length ? names.join(', ') : 'Proje yok'}
                      </div>
                    </div>
                    <span className="badge">{m.role === 'viewer' ? 'Görüntüleyici' : 'Düzenleyici'}</span>
                    <span className="row-sub row-load num">{load(m.id)}</span>
                    <span className="row-acts">
                      <button className="icon-btn" onClick={() => edit(m)} aria-label={`${m.name} kişisini düzenle`}>
                        <PencilIcon />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setConfirmId(asking ? null : m.id)}
                        aria-label={`${m.name} kişisini kaldır`}
                        aria-expanded={asking}
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  </div>
                  {asking && (
                    <div className="confirm-strip" role="alert">
                      <span className="grow">
                        {n > 0 ? `${m.name} silinecek. ${n} görevi “Atanmadı” olarak kalacak.` : `${m.name} silinecek.`}
                      </span>
                      <button className="btn ghost" onClick={() => setConfirmId(null)}>
                        Vazgeç
                      </button>
                      <button className="btn danger-solid" onClick={() => remove(m)}>
                        Evet, sil
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {data.status !== 'loading' && data.members.length === 0 && (
            <div className="row">
              <span className="row-sub">Henüz kimse eklenmedi.</span>
            </div>
          )}
        </div>

        {!formOpen && (
          <button className="btn" onClick={openNew}>
            <PlusIcon />
            Kişi ekle
          </button>
        )}

        {formOpen && (
          <div className="panel">
            <div className="panel-head">
              <h2>{form.editId ? 'Kişiyi düzenle' : 'Kişi ekle'}</h2>
            </div>
            <form
              className="form-body"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="two">
                <div className="field">
                  <label className="field-label" htmlFor="p-name">
                    Ad soyad
                  </label>
                  <input
                    ref={nameRef}
                    className="input"
                    id="p-name"
                    type="text"
                    autoComplete="off"
                    placeholder="Örn. Zeynep Arslan"
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-mail">
                    E-posta
                  </label>
                  <input
                    className="input"
                    id="p-mail"
                    type="email"
                    autoComplete="off"
                    placeholder="ad@sirket.com"
                    value={form.email}
                    onChange={(e) => patch({ email: e.target.value })}
                  />
                </div>
              </div>

              <div className="field">
                <span className="field-label">İzin</span>
                <div className="seg" role="group" aria-label="İzin">
                  <button type="button" className={form.role === 'editor' ? 'on' : ''} aria-pressed={form.role === 'editor'} onClick={() => patch({ role: 'editor' })}>
                    Düzenleyici
                  </button>
                  <button type="button" className={form.role === 'viewer' ? 'on' : ''} aria-pressed={form.role === 'viewer'} onClick={() => patch({ role: 'viewer' })}>
                    Görüntüleyici
                  </button>
                </div>
                <span className="hint">{ROLE_HINT[form.role]}</span>
              </div>

              <div className="field">
                <span className="field-label">Projeler</span>
                {data.projects.length > 0 ? (
                  <div className="chips" role="group" aria-label="Projeler">
                    {data.projects.map((p) => {
                      const on = form.projectIds.includes(p.id);
                      return (
                        <button type="button" key={p.id} className={`chip${on ? ' sel' : ''}`} aria-pressed={on} onClick={() => toggleProject(p.id)}>
                          <span className="dot" style={{ background: p.color }} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="hint">Henüz proje yok.</span>
                )}
                <span className="hint">Kişi yalnızca seçili projelerin görevlerini görür.</span>
              </div>

              {form.error && (
                <p className="err" role="alert">
                  {form.error}
                </p>
              )}

              <div className="row-btns">
                <button type="button" className="btn ghost" onClick={cancel}>
                  Vazgeç
                </button>
                <button type="submit" className="btn primary">
                  {form.editId ? 'Değişiklikleri kaydet' : 'Kişiyi ekle'}
                </button>
              </div>
              <p className="hint pg-note">Eklenen kişi, e-postasına gelen bağlantıyla giriş yapar.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
