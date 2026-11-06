import { useState, type DragEvent } from 'react';
import { isoDate, isLate } from '../lib/dates';
import { QUADRANTS, type Project, type QuadrantId, type Task } from '../types';
import { CloseIcon, PlusIcon } from './icons';
import { assignees, COL_OF, projectOf, ROW_OF, taskOrder, type Person } from './model';
import { TaskCard } from './TaskCard';
import { GROW, useHoverGrow } from './useHoverGrow';

/** First load: muted placeholder rows at card size (title bar widths vary). */
const SKEL: Record<QuadrantId, string[]> = {
  do: ['72%', '54%', '64%'],
  plan: ['60%', '78%'],
  delegate: ['66%', '48%'],
  drop: ['58%'],
};

export interface MatrixProps {
  loading: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  /** open tasks the user may see (all projects) */
  openTasks: Task[];
  projects: Project[];
  projectMap: Map<string, Project>;
  people: Map<string, Person>;
  filter: Project | null;
  pending: ReadonlySet<string>;
  dialogOpen: boolean;
  onClearFilter: () => void;
  onNew: (q: QuadrantId | '') => void;
  onOpen: (t: Task) => void;
  onToggleDone: (id: string) => void;
  onTogglePin: (t: Task) => void;
  onMove: (id: string, q: QuadrantId) => void;
  onGoProjects: () => void;
}

export function Matrix(p: MatrixProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overQ, setOverQ] = useState<QuadrantId | null>(null);
  const { growOn, enter, leave } = useHoverGrow(!!dragId || p.dialogOpen);

  const today = isoDate();
  const visible = p.filter ? p.openTasks.filter((t) => t.projectId === p.filter!.id) : p.openTasks;
  const noOpen = p.openTasks.length === 0;
  const hasProjects = p.projects.length > 0;
  const showFirstRun = noOpen && p.canEdit && !p.loading;
  const firstUse = noOpen && p.canEdit && !p.filter;
  const hasBar = !!p.filter || showFirstRun;

  let firstRunText = 'Henüz görev yok.';
  if (!hasProjects) firstRunText = p.isAdmin ? 'Görev eklemek için önce bir proje oluşturun.' : 'Size henüz bir proje atanmadı.';

  const gCol = [1, 1];
  const gRow = [1, 1];
  if (growOn) {
    gCol[COL_OF[growOn]] = GROW;
    gRow[ROW_OF[growOn]] = GROW;
  }

  const endDrag = () => {
    setDragId(null);
    setOverQ(null);
  };

  const drop = (q: QuadrantId, e: DragEvent) => {
    e.preventDefault();
    let id = dragId;
    if (!id) {
      try {
        id = e.dataTransfer.getData('text/plain');
      } catch {
        id = null;
      }
    }
    const t = id ? p.openTasks.find((x) => x.id === id) : null;
    if (t && t.q !== q && !p.pending.has(t.id)) p.onMove(t.id, q);
    endDrag();
  };

  const quad = (def: (typeof QUADRANTS)[number]) => {
    const list = visible.filter((t) => t.q === def.id).sort(taskOrder);
    const cls = ['quad', `q-${def.id}`, overQ === def.id && 'is-over', growOn === def.id && 'is-expanded']
      .filter(Boolean)
      .join(' ');
    const dnd = p.canEdit
      ? {
          onDragOver: (e: DragEvent) => {
            if (!dragId && !e.dataTransfer.types.includes('text/plain')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (overQ !== def.id) setOverQ(def.id);
          },
          onDragLeave: (e: DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null) && overQ === def.id) setOverQ(null);
          },
          onDrop: (e: DragEvent) => drop(def.id, e),
        }
      : {};
    return (
      <section
        key={def.id}
        className={cls}
        style={{ flexGrow: gCol[COL_OF[def.id]] }}
        aria-label={def.name}
        onMouseEnter={() => enter(def.id)}
        {...dnd}
      >
        <header className="quad-head">
          <span className="q-mark" aria-hidden="true" />
          <div className="grow">
            <h2>{def.name}</h2>
            <p>{def.tag}</p>
          </div>
          {list.length > 0 && !p.loading && <span className="q-count num">{list.length}</span>}
          {p.canEdit && (
            <button className="icon-btn" onClick={() => p.onNew(def.id)} aria-label={`${def.name} kutusuna görev ekle`}>
              <PlusIcon />
            </button>
          )}
        </header>
        <div className="cards">
          {!p.loading &&
            list.map((t) => {
              const pending = p.pending.has(t.id);
              return (
                <TaskCard
                  key={t.id}
                  task={t}
                  project={projectOf(t, p.projectMap)}
                  people={assignees(t, p.people)}
                  late={isLate(t.end, today) && !pending}
                  pending={pending}
                  dragging={dragId === t.id}
                  canEdit={p.canEdit}
                  showProject={!p.filter}
                  onOpen={() => p.onOpen(t)}
                  onToggleDone={() => p.onToggleDone(t.id)}
                  onTogglePin={() => p.onTogglePin(t)}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setData('text/plain', t.id);
                      e.dataTransfer.effectAllowed = 'move';
                    } catch {
                      /* some browsers refuse; the drag id in state is enough */
                    }
                    setDragId(t.id);
                  }}
                  onDragEnd={endDrag}
                />
              );
            })}
          {p.loading &&
            SKEL[def.id].map((w, i) => (
              <div className="sk" aria-hidden="true" key={i}>
                <span style={{ width: w }} />
                <span />
              </div>
            ))}
          {!p.loading && list.length === 0 && (
            <div className="empty">
              {firstUse ? (
                <span>{def.hint}</span>
              ) : (
                <>
                  <span className="e1">Görev yok</span>
                  {p.canEdit && <span className="e2">Sürükleyin ya da +&nbsp;ile ekleyin</span>}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className={'matrix-wrap' + (hasBar ? ' has-bar' : '')}>
      {hasBar && (
        <div className="mbar">
          {showFirstRun && (
            <div className="first-run">
              <span>{firstRunText}</span>
              {!hasProjects && p.isAdmin && (
                <button className="btn primary" onClick={p.onGoProjects}>
                  Proje oluştur
                </button>
              )}
              {hasProjects && (
                <button className="btn primary" onClick={() => p.onNew('')}>
                  İlk görevi ekle
                </button>
              )}
            </div>
          )}
          {p.filter && (
            <button
              className="fpill"
              onClick={p.onClearFilter}
              aria-label={`Filtreyi kaldır: ${p.filter.name}`}
              title="Filtreyi kaldır"
            >
              <span className="dot" style={{ background: p.filter.color }} />
              {p.filter.name}
              <CloseIcon size={14} />
            </button>
          )}
        </div>
      )}
      <div className="axis-x">
        <div className="axis-label" style={{ flexGrow: gCol[0] }}>
          Acil
        </div>
        <div className="axis-label" style={{ flexGrow: gCol[1] }}>
          Acil değil
        </div>
      </div>
      <div className="axis-y">
        <div className="axis-label" style={{ flexGrow: gRow[0] }}>
          Önemli
        </div>
        <div className="axis-label" style={{ flexGrow: gRow[1] }}>
          Önemli değil
        </div>
      </div>
      <div className="matrix" onMouseLeave={leave}>
        <div className="mrow" style={{ flexGrow: gRow[0] }}>
          {quad(QUADRANTS[0])}
          {quad(QUADRANTS[1])}
        </div>
        <div className="mrow" style={{ flexGrow: gRow[1] }}>
          {quad(QUADRANTS[2])}
          {quad(QUADRANTS[3])}
        </div>
      </div>
    </div>
  );
}
