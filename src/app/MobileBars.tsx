import { initials } from '../lib/people';
import type { Me, Project } from '../types';
import { DoneIcon, FolderIcon, LogoutIcon, MatrixIcon, PeopleIcon, PlusIcon } from './icons';
import type { View } from './model';
import { BrandMark, ROLE_LABEL } from './Sidebar';

export function MobileTop({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const title = [me.name, me.email, me.role === 'admin' ? '' : ROLE_LABEL[me.role]].filter(Boolean).join(' · ');
  return (
    <div className="mtop">
      <div className="brand">
        <BrandMark />
        Task Table
      </div>
      <span className="grow" />
      <span className="av lg" title={title}>
        {initials(me.name)}
      </span>
      <button className="icon-btn" onClick={onLogout} aria-label="Çıkış yap">
        <LogoutIcon size={18} />
      </button>
    </div>
  );
}

export function MobileFilter({
  projects,
  filterId,
  onFilter,
}: {
  projects: Project[];
  filterId: string | null;
  onFilter: (id: string | null) => void;
}) {
  return (
    <div className="mfilter" role="group" aria-label="Projeye göre filtrele">
      <button className={'fchip' + (filterId ? '' : ' active')} onClick={() => onFilter(null)} aria-pressed={!filterId}>
        Tüm projeler
      </button>
      {projects.map((pr) => {
        const on = filterId === pr.id;
        return (
          <button key={pr.id} className={'fchip' + (on ? ' active' : '')} onClick={() => onFilter(on ? null : pr.id)} aria-pressed={on}>
            <span className="dot" style={{ background: pr.color }} />
            {pr.name}
          </button>
        );
      })}
    </div>
  );
}

export function TabBar({
  view,
  canEdit,
  isAdmin,
  onView,
  onNew,
}: {
  view: View;
  canEdit: boolean;
  isAdmin: boolean;
  onView: (v: View) => void;
  onNew: () => void;
}) {
  const tab = (v: View) => 'tab' + (view === v ? ' active' : '');
  // 5 tabs for the admin, 3 for an editor (no Kişiler / Projeler), 2 for a viewer (.ro)
  const style = canEdit && !isAdmin ? { gridTemplateColumns: 'repeat(3,minmax(0,1fr))' } : undefined;
  return (
    <nav className={'tabbar' + (canEdit ? '' : ' ro')} style={style} aria-label="Görünümler">
      <button className={tab('matrix')} onClick={() => onView('matrix')} aria-current={view === 'matrix' ? 'page' : undefined}>
        <span className="ti">
          <MatrixIcon size={18} />
        </span>
        Matris
      </button>
      <button className={tab('done')} onClick={() => onView('done')} aria-current={view === 'done' ? 'page' : undefined}>
        <span className="ti">
          <DoneIcon size={18} />
        </span>
        Bitenler
      </button>
      {canEdit && (
        <button className="tab tab-new" onClick={onNew} aria-label="Yeni görev">
          <span className="ti">
            <PlusIcon size={16} width={2.2} />
          </span>
          Yeni
        </button>
      )}
      {isAdmin && (
        <>
          <button className={tab('people')} onClick={() => onView('people')} aria-current={view === 'people' ? 'page' : undefined}>
            <span className="ti">
              <PeopleIcon size={18} />
            </span>
            Kişiler
          </button>
          <button className={tab('projects')} onClick={() => onView('projects')} aria-current={view === 'projects' ? 'page' : undefined}>
            <span className="ti">
              <FolderIcon size={18} />
            </span>
            Projeler
          </button>
        </>
      )}
    </nav>
  );
}
