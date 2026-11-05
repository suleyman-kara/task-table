import { useEffect, useMemo, useRef, useState } from 'react';
import { createProject, deleteProject, updateProject } from '../data/actions';
import type { AppData } from '../data/store';
import { PROJECT_PALETTE, type Project } from '../types';
import { LoadingRows, PencilIcon, TrashIcon } from './icons';
import './pages.css';

interface ProjectForm {
  editId: string | null;
  name: string;
  color: string;
  error: string;
}

const emptyForm = (color?: string): ProjectForm => ({ editId: null, name: '', color: color || PROJECT_PALETTE[0].hex, error: '' });

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');

export function ProjectsPage({ data }: { data: AppData }) {
  const [form, setForm] = useState<ProjectForm>(() => emptyForm());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusTick) return;
    const el = nameRef.current;
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.focus();
    }
  }, [focusTick]);

  // The project being edited was deleted (here or elsewhere): back to "Proje ekle".
  useEffect(() => {
    if (form.editId && data.status === 'ready' && !data.projects.some((p) => p.id === form.editId)) setForm(emptyForm());
  }, [data.projects, data.status, form.editId]);

  // All tasks, open and done, per project.
  const taskCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data.tasks) counts.set(t.projectId, (counts.get(t.projectId) || 0) + 1);
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

  const edit = (p: Project) => {
    setConfirmId(null);
    setForm({ editId: p.id, name: p.name, color: p.color, error: '' });
    setFocusTick((n) => n + 1);
  };

  const save = () => {
    const name = form.name.trim();
    let error = '';
    if (!name) error = 'Proje adı girin.';
    else if (data.projects.some((p) => p.id !== form.editId && sameName(p.name, name))) error = 'Bu adda bir proje zaten var.';
    if (error) {
      setForm((f) => ({ ...f, error }));
      return;
    }
    if (form.editId) {
      updateProject(form.editId, { name, color: form.color });
      setForm(emptyForm());
    } else {
      createProject(name, form.color);
      setForm(emptyForm(form.color));
    }
  };

  const remove = (p: Project) => {
    deleteProject(p.id);
    setConfirmId(null);
    if (form.editId === p.id) setForm(emptyForm());
  };

  const count = data.projects.length;

  return (
    <div className="page">
      <div className="people-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>{form.editId ? 'Projeyi düzenle' : 'Proje ekle'}</h2>
          </div>
          <form
            className="form-body"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="field">
              <label className="field-label" htmlFor="pr-name">
                Proje adı
              </label>
              <input
                ref={nameRef}
                className="input"
                id="pr-name"
                type="text"
                autoComplete="off"
                placeholder="Örn. Müşteri Portalı"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, error: '' }));
                }}
              />
            </div>
            <div className="field">
              <span className="field-label">Renk</span>
              <div className="swatches" role="group" aria-label="Renk">
                {PROJECT_PALETTE.map((c) => {
                  const on = form.color.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={c.hex}
                      className={`sw${on ? ' sel' : ''}`}
                      aria-label={c.label}
                      aria-pressed={on}
                      onClick={() => setForm((f) => ({ ...f, color: c.hex }))}
                    >
                      <span style={{ background: c.hex }} />
                    </button>
                  );
                })}
              </div>
            </div>
            {form.error && (
              <p className="err" role="alert">
                {form.error}
              </p>
            )}
            <div className="row-btns">
              {form.editId && (
                <button type="button" className="btn ghost" onClick={() => setForm(emptyForm())}>
                  Vazgeç
                </button>
              )}
              <button type="submit" className="btn primary">
                {form.editId ? 'Değişiklikleri kaydet' : 'Projeyi ekle'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>{count ? `${count} proje` : 'Liste'}</h2>
          </div>
          {data.status === 'loading' ? (
            <LoadingRows count={3} />
          ) : count === 0 ? (
            <div className="row">
              <span className="row-sub">Henüz proje yok. Görev ekleyebilmek için en az bir proje gerekir.</span>
            </div>
          ) : (
            data.projects.map((p) => {
              const n = taskCount.get(p.id) || 0;
              const asking = confirmId === p.id;
              return (
                <div className="ritem" key={p.id}>
                  <div className={`row nowrap${form.editId === p.id ? ' editing' : ''}`}>
                    <span className="dot" style={{ background: p.color, width: 10, height: 10, flexBasis: 10 }} />
                    <div className="grow">
                      <div className="row-title">{p.name}</div>
                    </div>
                    <span className="row-sub num">{n} görev</span>
                    <span className="row-acts">
                      <button className="icon-btn" onClick={() => edit(p)} aria-label={`${p.name} projesini düzenle`}>
                        <PencilIcon />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => setConfirmId(asking ? null : p.id)}
                        aria-label={`${p.name} projesini sil`}
                        aria-expanded={asking}
                      >
                        <TrashIcon />
                      </button>
                    </span>
                  </div>
                  {asking && (
                    <div className="confirm-strip proj-strip" role="alert">
                      <span className="grow">
                        {n > 0 ? `${p.name} silinecek. ${n} görevi “Projesiz” olarak kalacak.` : `${p.name} silinecek.`}
                      </span>
                      <button className="btn ghost" onClick={() => setConfirmId(null)}>
                        Vazgeç
                      </button>
                      <button className="btn danger-solid" onClick={() => remove(p)}>
                        Evet, sil
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
