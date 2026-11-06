import type { DragEvent } from 'react';
import { initials } from '../lib/people';
import type { Task } from '../types';
import { DescIcon, PinIcon, TickIcon } from './icons';
import { cardWhen, whoText, type Person } from './model';

export interface TaskCardProps {
  task: Task;
  project: { name: string; color: string };
  people: Person[];
  late: boolean;
  pending: boolean;
  dragging: boolean;
  canEdit: boolean;
  showProject: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
  onTogglePin: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export function TaskCard(p: TaskCardProps) {
  const { task: t, canEdit, pending } = p;
  const when = cardWhen(t, p.late);
  const whenCls = p.late ? 'late' : '';
  const pinned = !!t.pinnedAt;
  const avs = p.people.length ? p.people.slice(0, 3).map((x) => initials(x.name)) : ['–'];
  const cls = [
    'card',
    pending && 'is-pending',
    p.dragging && 'is-dragging',
    pinned && 'is-pinned',
    !canEdit && 'ro',
    !p.showProject && 'no-proj',
  ]
    .filter(Boolean)
    .join(' ');
  const pinLabel = (pinned ? 'Sabitlemeyi kaldır: ' : 'Başa sabitle: ') + t.title;

  return (
    <div
      className={cls}
      draggable={canEdit && !pending}
      onDragStart={canEdit && !pending ? p.onDragStart : undefined}
      onDragEnd={p.onDragEnd}
    >
      {canEdit && (
        <button
          className="check"
          onClick={p.onToggleDone}
          aria-label={(pending ? 'Tamamlamayı geri al: ' : 'Tamamlandı olarak işaretle: ') + t.title}
        >
          <span>
            <TickIcon size={11} width={3.2} />
          </span>
        </button>
      )}
      <div className="card-body">
        <div className="line1">
          <span className="t-wrap">
            <button className="card-title" onClick={p.onOpen}>
              {t.title}
            </button>
            {t.desc && (
              <span className="desc-ic" role="img" aria-label="Açıklaması var">
                <DescIcon />
              </span>
            )}
          </span>
          <span className="l1-sp" />
          <span className="l1-r">
          {canEdit && (
            <button
              className={'pin' + (pinned ? ' on' : '')}
              onClick={p.onTogglePin}
              aria-label={pinLabel}
              aria-pressed={pinned}
              title={pinLabel}
            >
              <PinIcon />
            </button>
          )}
          <span className={`when mono ${whenCls}`}>{when}</span>
          </span>
        </div>
        <div className="card-meta">
          <span className="meta-l">
            {p.showProject && (
              <span className="proj">
                <span className="dot" style={{ background: p.project.color }} />
                {p.project.name}
              </span>
            )}
            {when && <span className={`when m-when mono ${whenCls}`}>{when}</span>}
          </span>
          <span className="who">
            <span className="avs">
              {avs.map((a, i) => (
                <span className="av" key={i}>
                  {a}
                </span>
              ))}
            </span>
            <span className="who-names">{whoText(p.people)}</span>
          </span>
        </div>
      </div>
      {pending && (
        <div className="undo-bar" role="status">
          <span className="undo-msg">
            <span className="undo-t">‘{t.title}</span>
            <span>’ tamamlandı</span>
          </span>
          <button onClick={p.onToggleDone}>Geri al</button>
        </div>
      )}
    </div>
  );
}
