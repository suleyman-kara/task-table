import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createTask, deleteTask, quickAddMember, updateTask } from '../data/actions';
import { isoDate, isLate } from '../lib/dates';
import { initials, isValidEmail, normEmail } from '../lib/people';
import { ADMIN_EMAIL } from '../config';
import { QUADRANTS, type Member, type Project, type QuadrantId, type Task, type TaskInput } from '../types';
import { DateField } from './DateField';
import { CloseIcon, EditIcon } from './icons';
import { ADMIN_PERSON, assignees, detailWhen, NO_PROJECT, projectOf, type Person } from './model';

export type DialogState =
  | { mode: 'view'; id: string }
  | { mode: 'edit'; id: string; from?: 'view'; focus?: string }
  | { mode: 'new'; q: QuadrantId | ''; projectId: string };

export interface TaskDialogProps {
  state: DialogState;
  tasks: Task[];
  projects: Project[];
  projectMap: Map<string, Project>;
  members: Member[];
  people: Map<string, Person>;
  meEmail: string;
  canEdit: boolean;
  isAdmin: boolean;
  pending: ReadonlySet<string>;
  onChange: (s: DialogState | null) => void;
}

export function TaskDialog(p: TaskDialogProps) {
  const { state } = p;
  const task = state.mode === 'new' ? null : p.tasks.find((t) => t.id === state.id) || null;
  const gone = state.mode !== 'new' && !task;

  // The task was deleted (here or elsewhere): close.
  useEffect(() => {
    if (gone) p.onChange(null);
  });

  const close = () => {
    if (state.mode === 'edit' && state.from === 'view') p.onChange({ mode: 'view', id: state.id });
    else p.onChange(null);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (gone) return null;

  const ro = !p.canEdit;
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && state.mode === 'view') p.onChange(null);
      }}
    >
      <div className={'dialog' + (ro ? ' ro' : '')} role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        {state.mode === 'view' && task ? (
          <DetailView
            task={task}
            ro={ro}
            project={projectOf(task, p.projectMap)}
            people={assignees(task, p.people)}
            late={isLate(task.end) && !p.pending.has(task.id)}
            onClose={() => p.onChange(null)}
            onEdit={(focus) => p.onChange({ mode: 'edit', id: task.id, from: 'view', focus })}
          />
        ) : (
          <TaskForm key={state.mode === 'new' ? 'new' : state.id} {...p} task={task} onCancel={close} />
        )}
      </div>
    </div>
  );
}

/* ---------------- detail ---------------- */

function DetailView({
  task: t,
  ro,
  project,
  people,
  late,
  onClose,
  onEdit,
}: {
  task: Task;
  ro: boolean;
  project: { name: string; color: string };
  people: Person[];
  late: boolean;
  onClose: () => void;
  onEdit: (focus: string) => void;
}) {
  const qd = QUADRANTS.find((q) => q.id === t.q) || QUADRANTS[0];
  const go = (id: string) => () => {
    if (!ro) onEdit(id);
  };
  const editIc = <EditIcon className="edit-ic" />;
  const row = (label: string, focus: string, value: ReactNode) => (
    <button className="vrow" onClick={go(focus)} disabled={ro}>
      <span className="vlabel">{label}</span>
      {value}
      {editIc}
    </button>
  );
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeBtnRef.current?.focus(), []);

  return (
    <>
      <div className="dialog-head">
        <h2 className="vhead" id="dlg-title">
          <button className="vtitle" onClick={go('f-title')} disabled={ro} aria-label={ro ? t.title : `Görev adını düzenle: ${t.title}`}>
            <span>{t.title}</span>
            {editIc}
          </button>
        </h2>
        <button className="icon-btn" onClick={onClose} aria-label="Kapat" ref={closeBtnRef}>
          <CloseIcon />
        </button>
      </div>
      <div className="dialog-body">
        <div className="vlist">
          {row(
            'Kutu',
            'f-q',
            <span className={`vval q-${qd.id}`}>
              <span className="q-mark" aria-hidden="true" />
              {qd.name}
            </span>,
          )}
          {row(
            'Proje',
            'f-proj',
            <span className="vval">
              <span className="dot" style={{ background: project.color }} />
              {project.name}
            </span>,
          )}
          {row(
            'Sorumlular',
            'f-people',
            <span className="vval">
              {people.map((x) => (
                <span className="pchip" key={x.id}>
                  <span className="av">{initials(x.name)}</span>
                  {x.name}
                </span>
              ))}
              {people.length === 0 && <span className="muted">Atanmadı</span>}
            </span>,
          )}
          {row(
            'Tarih',
            'f-start',
            <span className="vval mono">
              <span>{detailWhen(t)}</span>
              {late && <span className="late">Gecikti</span>}
            </span>,
          )}
          {row(
            'Açıklama',
            'f-desc',
            t.desc ? (
              <span className="vval desc">{t.desc}</span>
            ) : (
              <span className="vval">
                <span className="muted">Açıklama eklenmemiş</span>
              </span>
            ),
          )}
        </div>
      </div>
      {!ro && (
        <div className="dialog-foot">
          <span className="grow" />
          <button className="btn primary" onClick={() => onEdit('f-title')}>
            Düzenle
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- edit / new ---------------- */

type FieldErr = { field: 'title' | 'q' | 'people' | 'dates'; text: string } | null;
const ERR_FOCUS = { title: 'f-title', q: 'f-q', people: 'f-people', dates: 'f-end' } as const;

function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) (el as HTMLInputElement).focus();
  else el.querySelector<HTMLElement>('button')?.focus();
}

function TaskForm(p: TaskDialogProps & { task: Task | null; onCancel: () => void }) {
  const { state, task } = p;
  const isEdit = state.mode === 'edit';
  const [form, setFormState] = useState<TaskInput>(() =>
    task
      ? {
          title: task.title,
          desc: task.desc,
          q: task.q,
          projectId: task.projectId,
          assigneeIds: [...task.assigneeIds],
          start: task.start,
          end: task.end,
        }
      : {
          title: '',
          desc: '',
          q: (state.mode === 'new' ? state.q : '') as QuadrantId,
          projectId: state.mode === 'new' ? state.projectId : '',
          // an editor's project-less task must include them: pre-select
          assigneeIds: !p.isAdmin && state.mode === 'new' && !state.projectId ? [p.meEmail] : [],
          start: isoDate(),
          end: '',
        },
  );
  const [error, setError] = useState<FieldErr>(null);
  const [badDate, setBadDate] = useState({ start: false, end: false });
  const [askDelete, setAskDelete] = useState(false);
  const [inlineAdd, setInlineAdd] = useState(false);
  const [np, setNpState] = useState({ name: '', email: '', error: '' });
  const [focusReq, setFocusReq] = useState<{ id: string } | null>(() => ({
    id: state.mode === 'edit' && state.focus ? state.focus : 'f-title',
  }));

  useEffect(() => {
    if (focusReq) focusField(focusReq.id);
  }, [focusReq]);

  const setForm = (patch: Partial<TaskInput>) => {
    setError(null);
    setFormState((f) => ({ ...f, ...patch }));
  };
  const setNp = (patch: Partial<typeof np>) => setNpState((cur) => ({ ...cur, error: '', ...patch }));

  // Project-less tasks are visible only to the admin and their assignees, so an editor must stay on them.
  const mustKeepMe = !p.isAdmin && !form.projectId;

  const pickProject = (projectId: string) => {
    const addMe = !p.isAdmin && !projectId && !form.assigneeIds.includes(p.meEmail);
    setForm({ projectId, ...(addMe ? { assigneeIds: [...form.assigneeIds, p.meEmail] } : {}) });
  };

  const save = () => {
    let err: FieldErr = null;
    if (!form.title.trim()) err = { field: 'title', text: 'Görev adı boş olamaz.' };
    else if (!form.q) err = { field: 'q', text: 'Görevin hangi kutuya gideceğini seçin.' };
    else if (mustKeepMe && !form.assigneeIds.includes(p.meEmail))
      err = { field: 'people', text: 'Projesiz görevde kendinizi sorumlu olarak bırakın.' };
    else if (badDate.start || badDate.end) err = { field: 'dates', text: 'Tarihi gg.aa.yyyy biçiminde girin.' };
    else if (form.start && form.end && form.end < form.start) err = { field: 'dates', text: 'Bitiş tarihi başlangıçtan önce olamaz.' };
    if (err) {
      setError(err);
      setFocusReq({ id: err.field === 'dates' && badDate.start ? 'f-start' : ERR_FOCUS[err.field] });
      return;
    }
    if (state.mode === 'edit') {
      updateTask(state.id, form);
      p.onChange(state.from === 'view' ? { mode: 'view', id: state.id } : null);
    } else {
      createTask(form);
      p.onChange(null);
    }
  };

  const remove = () => {
    if (state.mode !== 'edit') return;
    p.onChange(null);
    deleteTask(state.id);
  };

  const addPersonInline = () => {
    const name = np.name.trim();
    const email = normEmail(np.email);
    let e = '';
    if (!name) e = 'Ad girin.';
    else if (!isValidEmail(email)) e = 'Geçerli bir e-posta girin.';
    else if (email === ADMIN_EMAIL || p.members.some((m) => m.id === email)) e = 'Bu e-posta zaten listede.';
    if (e) {
      setNpState((cur) => ({ ...cur, error: e }));
      return;
    }
    quickAddMember(name, email, form.projectId);
    setForm({ assigneeIds: form.assigneeIds.includes(email) ? form.assigneeIds : [...form.assigneeIds, email] });
    setNpState({ name: '', email: '', error: '' });
    setInlineAdd(false);
  };

  // only people with access to the chosen project are offered (plus anyone already assigned);
  // a project-less task can go to anyone
  const personOptions: Person[] = [
    ADMIN_PERSON,
    ...p.members
      .filter((m) => !form.projectId || m.projectIds.includes(form.projectId) || form.assigneeIds.includes(m.id))
      .map((m) => p.people.get(m.id)!)
      .filter(Boolean),
  ];

  const errFor = (f: NonNullable<FieldErr>['field']) =>
    error && error.field === f ? (
      <p className="err" role="alert">
        {error.text}
      </p>
    ) : null;

  return (
    <>
      <div className="dialog-head">
        <h2 id="dlg-title">{isEdit ? 'Görevi düzenle' : 'Yeni görev'}</h2>
        <button className="icon-btn" onClick={() => p.onChange(null)} aria-label="Kapat">
          <CloseIcon />
        </button>
      </div>
      <div className="dialog-body">
        <div className="field">
          <label className="field-label" htmlFor="f-title">
            Görev
          </label>
          <input
            className="input title-input"
            id="f-title"
            type="text"
            maxLength={200}
            placeholder="Ne yapılması gerekiyor?"
            value={form.title}
            onChange={(e) => setForm({ title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
          {errFor('title')}
        </div>

        <div className="field" id="f-q">
          <span className="field-label">Kutu</span>
          <div className="qpick">
            {QUADRANTS.map((q) => {
              const sel = form.q === q.id;
              return (
                <button key={q.id} className={`qopt q-${q.id}` + (sel ? ' sel' : '')} onClick={() => setForm({ q: q.id })} aria-pressed={sel}>
                  <span className="q-mark" aria-hidden="true" />
                  <span>
                    <b>{q.name}</b>
                    <small>{q.hint}</small>
                  </span>
                </button>
              );
            })}
          </div>
          {errFor('q')}
        </div>

        <div className="field" id="f-proj">
          <span className="field-label">Proje</span>
          <div className="chips">
            {p.projects.map((pr) => {
              const sel = form.projectId === pr.id;
              return (
                <button key={pr.id} className={'chip' + (sel ? ' sel' : '')} onClick={() => pickProject(pr.id)} aria-pressed={sel}>
                  <span className="dot" style={{ background: pr.color }} />
                  {pr.name}
                </button>
              );
            })}
            <button className={'chip' + (!form.projectId ? ' sel' : '')} onClick={() => pickProject('')} aria-pressed={!form.projectId}>
              <span className="dot" style={{ background: NO_PROJECT.color }} />
              {NO_PROJECT.name}
            </button>
          </div>
          {mustKeepMe && <p className="hint">Projesiz görevleri yalnızca yönetici ve atanan kişiler görür.</p>}
        </div>

        <div className="field" id="f-people">
          <span className="field-label">
            Sorumlu kişiler <i>(birden fazla seçilebilir)</i>
          </span>
          <div className="chips">
            {personOptions.map((x) => {
              const on = form.assigneeIds.includes(x.id);
              return (
                <button
                  key={x.id}
                  className={'chip' + (on ? ' sel' : '')}
                  onClick={() =>
                    setForm({ assigneeIds: on ? form.assigneeIds.filter((id) => id !== x.id) : [...form.assigneeIds, x.id] })
                  }
                  aria-pressed={on}
                >
                  <span className="av">{initials(x.name)}</span>
                  {x.id === p.meEmail ? `${x.name} (ben)` : x.name}
                </button>
              );
            })}
            {p.isAdmin && (
              <button className="chip add" onClick={() => setInlineAdd((v) => !v)} aria-expanded={inlineAdd}>
                + Yeni kişi
              </button>
            )}
          </div>
          {p.isAdmin && inlineAdd && (
            <div className="inline-add">
              <input
                className="input"
                type="text"
                aria-label="Ad soyad"
                placeholder="Ad soyad"
                value={np.name}
                onChange={(e) => setNp({ name: e.target.value })}
                autoFocus
              />
              <input
                className="input"
                type="email"
                aria-label="E-posta"
                placeholder="E-posta"
                value={np.email}
                onChange={(e) => setNp({ email: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addPersonInline();
                }}
              />
              <button className="btn" onClick={addPersonInline}>
                Ekle
              </button>
            </div>
          )}
          {np.error && <p className="err">{np.error}</p>}
          {errFor('people')}
        </div>

        <div className="field">
          <div className="two">
            <div className="field">
              <label className="field-label" htmlFor="f-start">
                Başlangıç
              </label>
              <DateField
                id="f-start"
                value={form.start}
                onChange={(start) => setForm({ start })}
                onValidity={(ok) => setBadDate((b) => ({ ...b, start: !ok }))}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="f-end">
                Bitiş
              </label>
              <DateField
                id="f-end"
                value={form.end}
                onChange={(end) => setForm({ end })}
                onValidity={(ok) => setBadDate((b) => ({ ...b, end: !ok }))}
              />
            </div>
          </div>
          {errFor('dates')}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="f-desc">
            Açıklama <i>(isteğe bağlı)</i>
          </label>
          <textarea
            className="input"
            id="f-desc"
            maxLength={5000}
            placeholder="Notlar, bağlantılar, ayrıntılar…"
            value={form.desc}
            onChange={(e) => setForm({ desc: e.target.value })}
          />
        </div>
      </div>
      <div className="dialog-foot">
        {askDelete ? (
          <div className="confirm" role="alert">
            <span>Görev kalıcı olarak silinecek.</span>
            <span className="grow" />
            <button className="btn ghost" onClick={() => setAskDelete(false)}>
              Vazgeç
            </button>
            <button className="btn danger-solid" onClick={remove}>
              Evet, sil
            </button>
          </div>
        ) : (
          <>
            {isEdit && (
              <button className="btn danger" onClick={() => setAskDelete(true)}>
                Görevi sil
              </button>
            )}
            <span className="grow" />
            <button className="btn ghost" onClick={p.onCancel}>
              Vazgeç
            </button>
            <button className="btn primary" onClick={save}>
              {isEdit ? 'Değişiklikleri kaydet' : 'Görevi ekle'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
