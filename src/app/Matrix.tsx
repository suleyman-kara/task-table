import { useState, type DragEvent } from 'react';
import { isoDate, isLate } from '../lib/dates';
import { QUADRANTS, type Project, type QuadrantId, type Task } from '../types';
import { CloseIcon, PlusIcon } from './icons';
import { assignees, projectOf, taskOrder, type Person } from './model';
import { TaskCard } from './TaskCard';

/** First load: muted placeholder rows at card size (title bar widths vary). */
const SKEL: Record<QuadrantId, string[]> = {
  do: ['72%', '54%', '64%'],
  plan: ['60%', '78%'],
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
  /** a project, the "Projesiz" pseudo project (id ''), or null for all */
  filter: Project | null;
  pending: ReadonlySet<string>;
  onClearFilter: () => void;
  onNew: (q: QuadrantId | '') => void;
  onOpen: (t: Task) => void;
  onToggleDone: (id: string) => void;
  onTogglePin: (t: Task) => void;
  onMove: (id: string, q: QuadrantId) => void;
  onGoProjects: () => void;
}

/** The task list: "Hemen yap" on top, "Planla" below; cards can be dragged between the two. */
export function Matrix(p: MatrixProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overQ, setOverQ] = useState<QuadrantId | null>(null);

  const today = isoDate();
  const visible = p.filter ? p.openTasks.filter((t) => t.projectId === p.filter!.id) : p.openTasks;
  const noOpen = p.openTasks.length === 0;
  const showFirstRun = noOpen && p.canEdit && !p.loading;
  const firstUse = noOpen && p.canEdit && !p.filter;
  const hasBar = !!p.filter || showFirstRun;

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

  const section = (def: (typeof QUADRANTS)[number]) => {
    const list = visible.filter((t) => t.q === def.id).sort(taskOrder);
    const cls = ['quad', `q-${def.id}`, overQ === def.id && 'is-over'].filter(Boolean).join(' ');
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
      <section key={def.id} className={cls} aria-label={def.name} {...dnd}>
        <header className="quad-head">
          <span className="q-mark" aria-hidden="true" />
          <div className="grow">
            <h2>{def.name}</h2>
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
    <div className="list-wrap">
      <div className="list">
        {hasBar && (
          <div className="mbar">
            {showFirstRun && (
              <div className="first-run">
                <span>Henüz görev yok.</span>
                <button className="btn primary" onClick={() => p.onNew('')}>
                  İlk görevi ekle
                </button>
                {p.projects.length === 0 && p.isAdmin && (
                  <button className="btn" onClick={p.onGoProjects}>
                    Proje oluştur
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
        {QUADRANTS.map(section)}
      </div>
    </div>
  );
}
