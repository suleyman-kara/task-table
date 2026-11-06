import { useMemo, useState } from 'react';
import { ADMIN_EMAIL, ADMIN_NAME } from '../config';
import { deleteTask, deleteTasks, setDone } from '../data/actions';
import type { AppData } from '../data/store';
import { isoDate, shortDate } from '../lib/dates';
import { QUADRANTS } from '../types';
import { CheckMark, LoadingRows, TrashIcon, UndoIcon } from './icons';
import './pages.css';

const NO_PROJECT = { name: 'Projesiz', color: 'var(--line-strong)' };

/** "Ayşe Demir" · "Ayşe, Mert" · "Ayşe +2" · "Atanmadı" (as on the matrix cards). */
function whoText(names: string[]): string {
  if (!names.length) return 'Atanmadı';
  if (names.length === 1) return names[0];
  const first = names.map((n) => n.split(' ')[0]);
  return names.length === 2 ? first.join(', ') : `${first[0]} +${names.length - 1}`;
}

export function DonePage({ data }: { data: AppData }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const canEdit = data.me.role !== 'viewer';

  const done = useMemo(
    () => data.tasks.filter((t) => t.doneAt).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
    [data.tasks],
  );

  const projectById = useMemo(() => new Map(data.projects.map((p) => [p.id, p])), [data.projects]);
  const nameById = useMemo(() => {
    const m = new Map<string, string>(data.members.map((x) => [x.id, x.name]));
    m.set(ADMIN_EMAIL, ADMIN_NAME);
    return m;
  }, [data.members]);
  const quadName = useMemo(() => new Map(QUADRANTS.map((q) => [q.id, q.name])), []);

  const asking = confirmClear && done.length > 0 && canEdit;

  const clearAll = () => {
    deleteTasks(done.map((t) => t.id));
    setConfirmClear(false);
  };

  return (
    <div className="page">
      <div className="panel">
        <div className="panel-head">
          <h2>{done.length ? `${done.length} görev` : 'Liste'}</h2>
          {canEdit && done.length > 0 && !asking && (
            <button className="btn danger" onClick={() => setConfirmClear(true)}>
              <TrashIcon />
              Tümünü sil
            </button>
          )}
          {asking && (
            <div className="confirm" role="alert">
              <span>{done.length} görev kalıcı olarak silinecek.</span>
              <button className="btn ghost" onClick={() => setConfirmClear(false)}>
                Vazgeç
              </button>
              <button className="btn danger-solid" onClick={clearAll}>
                Evet, sil
              </button>
            </div>
          )}
        </div>

        {data.status === 'loading' ? (
          <LoadingRows count={2} />
        ) : done.length === 0 ? (
          <div className="row">
            <span className="row-sub">Henüz tamamlanan görev yok. Matristeki kartın yuvarlağına tıklayınca buraya gelir.</span>
          </div>
        ) : (
          done.map((t) => {
            const pr = projectById.get(t.projectId) || NO_PROJECT;
            const names = t.assigneeIds.map((id) => nameById.get(id)).filter((n): n is string => !!n);
            const doneDay = isoDate(new Date(t.doneAt || 0));
            return (
              <div className="row" key={t.id}>
                <CheckMark />
                <div className="grow">
                  <div className="row-title struck">{t.title}</div>
                  <div className="row-sub">
                    <span className="dot" style={{ background: pr.color }} />
                    {pr.name} · {whoText(names)} · {quadName.get(t.q)}
                  </div>
                </div>
                <time className="row-sub mono" dateTime={doneDay}>
                  {shortDate(doneDay)}
                </time>
                {canEdit && (
                  <>
                    <button className="btn" onClick={() => setDone(t.id, false)}>
                      <UndoIcon />
                      Geri al
                    </button>
                    <button className="icon-btn" onClick={() => deleteTask(t.id)} aria-label={`Kalıcı olarak sil: ${t.title}`}>
                      <TrashIcon />
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
