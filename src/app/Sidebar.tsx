import { initials } from '../lib/people';
import type { Me, Project } from '../types';
import { DoneIcon, FolderIcon, LogoutIcon, MatrixIcon, PeopleIcon, PlusIcon, TickIcon } from './icons';
import { NO_PROJECT, NO_PROJECT_FILTER, type View } from './model';

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export const ROLE_LABEL: Record<Me['role'], string> = {
  admin: 'Yönetici',
  editor: 'Düzenleyici',
  viewer: 'Görüntüleyici',
};

export interface NavProps {
  me: Me;
  view: View;
  canEdit: boolean;
  isAdmin: boolean;
  showCounts: boolean;
  openCount: number;
  doneCount: number;
  projects: Project[];
  projectCounts: Map<string, number>;
  filterId: string | null;
  /** open project-less tasks; null hides the "Projesiz" filter */
  noProjectCount: number | null;
  onView: (v: View) => void;
  onFilter: (id: string | null) => void;
  onNew: () => void;
  onLogout: () => void;
}

export function Sidebar(p: NavProps) {
  const nav = (v: View) => 'nav-btn' + (p.view === v ? ' active' : '');
  const tick = <TickIcon className="tick" />;
  return (
    <aside className="side">
      <div className="brand">
        <BrandMark />
        Task Table
      </div>

      {p.canEdit && (
        <button className="new-btn" onClick={p.onNew}>
          <span className="plus" aria-hidden="true">
            <PlusIcon size={13} />
          </span>
          Yeni görev
        </button>
      )}

      <nav className="nav" aria-label="Görünümler">
        <button className={nav('matrix')} onClick={() => p.onView('matrix')} aria-current={p.view === 'matrix' ? 'page' : undefined}>
          <MatrixIcon />
          <span className="grow">Matris</span>
          {p.showCounts && <span className="nav-count num">{p.openCount}</span>}
        </button>
        <button className={nav('done')} onClick={() => p.onView('done')} aria-current={p.view === 'done' ? 'page' : undefined}>
          <DoneIcon />
          <span className="grow">Bitenler</span>
          {p.showCounts && <span className="nav-count num">{p.doneCount}</span>}
        </button>
        {p.isAdmin && (
          <>
            <button className={nav('people')} onClick={() => p.onView('people')} aria-current={p.view === 'people' ? 'page' : undefined}>
              <PeopleIcon />
              <span className="grow">Kişiler</span>
            </button>
            <button
              className={nav('projects')}
              onClick={() => p.onView('projects')}
              aria-current={p.view === 'projects' ? 'page' : undefined}
            >
              <FolderIcon />
              <span className="grow">Projeler</span>
            </button>
          </>
        )}
      </nav>

      <div className="side-projects">
        <div className="side-label">Filtre</div>
        <div className="nav" role="group" aria-label="Projeye göre filtrele">
          <button className={'nav-btn' + (p.filterId ? '' : ' picked')} onClick={() => p.onFilter(null)} aria-pressed={!p.filterId}>
            <span className="dot" style={{ background: 'var(--line-strong)' }} />
            <span className="grow">Tüm projeler</span>
            {!p.filterId && tick}
          </button>
          {p.projects.map((pr) => {
            const on = p.filterId === pr.id;
            return (
              <button
                key={pr.id}
                className={'nav-btn' + (on ? ' picked' : '')}
                onClick={() => p.onFilter(on ? null : pr.id)}
                aria-pressed={on}
              >
                <span className="dot" style={{ background: pr.color }} />
                <span className="grow">{pr.name}</span>
                {on && tick}
                {p.showCounts && <span className="nav-count num">{p.projectCounts.get(pr.id) || 0}</span>}
              </button>
            );
          })}
          {p.noProjectCount !== null && (
            <button
              className={'nav-btn' + (p.filterId === NO_PROJECT_FILTER ? ' picked' : '')}
              onClick={() => p.onFilter(p.filterId === NO_PROJECT_FILTER ? null : NO_PROJECT_FILTER)}
              aria-pressed={p.filterId === NO_PROJECT_FILTER}
            >
              <span className="dot" style={{ background: NO_PROJECT.color }} />
              <span className="grow">{NO_PROJECT.name}</span>
              {p.filterId === NO_PROJECT_FILTER && tick}
              {p.showCounts && <span className="nav-count num">{p.noProjectCount}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="side-foot">
        <div className="me">
          <span className="av lg">{initials(p.me.name)}</span>
          <div className="grow">
            <div className="me-name">{p.me.name}</div>
            {p.me.role !== 'admin' && (
              <span className="me-role">
                <span className="badge">{ROLE_LABEL[p.me.role]}</span>
              </span>
            )}
            <div className="me-mail">{p.me.email}</div>
          </div>
          <button className="icon-btn" onClick={p.onLogout} aria-label="Çıkış yap" title="Çıkış yap">
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}
