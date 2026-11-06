import { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/app.css';
import { logout } from '../auth/authActions';
import { moveTask, setPinned } from '../data/actions';
import { useAppData } from '../data/store';
import { DonePage } from '../pages/DonePage';
import { PeoplePage } from '../pages/PeoplePage';
import { ProjectsPage } from '../pages/ProjectsPage';
import type { Me, Project, QuadrantId, Task } from '../types';
import { Matrix } from './Matrix';
import { MobileFilter, MobileTop, TabBar } from './MobileBars';
import { peopleById, VIEW_HASH, VIEW_TITLES, viewFromHash, type View } from './model';
import { Sidebar } from './Sidebar';
import { NetBar, SaveToast } from './StatusBars';
import { TaskDialog, type DialogState } from './TaskDialog';
import { usePendingDone } from './usePendingDone';

export function AppShell({ me: sessionMe }: { me: Me }) {
  const data = useAppData(sessionMe);
  const { me, projects, members, tasks } = data;
  const isAdmin = me.role === 'admin';
  const canEdit = me.role !== 'viewer';
  const loading = data.status === 'loading';

  const [rawView, setRawView] = useState<View>(() => viewFromHash(window.location.hash));
  const [filterId, setFilterId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const { pending, toggle: toggleDone, flush } = usePendingDone();

  // Only the admin manages people and projects.
  const view: View = !isAdmin && (rawView === 'people' || rawView === 'projects') ? 'matrix' : rawView;

  // Keep the view in the address (#bitenler, #kisiler, #projeler) so reload and back work.
  useEffect(() => {
    const onHash = () => setRawView(viewFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((v: View) => {
    setRawView(v);
    const hash = VIEW_HASH[v];
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash || window.location.pathname + window.location.search);
    }
  }, []);
  useEffect(() => {
    if (view !== rawView) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [view, rawView]);

  // Viewers can't edit: drop any form that might be open when the role changes.
  useEffect(() => {
    if (!canEdit && dialog && dialog.mode !== 'view') setDialog(null);
  }, [canEdit, dialog]);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const people = useMemo(() => peopleById(members), [members]);
  const openTasks = useMemo(() => tasks.filter((t) => !t.doneAt), [tasks]);
  const doneCount = useMemo(() => tasks.filter((t) => t.doneAt).length, [tasks]);
  const projectCounts = useMemo(() => {
    const m = new Map<string, number>();
    openTasks.forEach((t) => m.set(t.projectId, (m.get(t.projectId) || 0) + 1));
    return m;
  }, [openTasks]);

  // A filter on a project that is gone (deleted, access removed) falls back to all projects.
  const filter: Project | null = (filterId && projectMap.get(filterId)) || null;

  const pickFilter = (id: string | null) => {
    setFilterId(id);
    go('matrix');
  };
  const openNew = (q: QuadrantId | '') => {
    if (!canEdit) return;
    setDialog({ mode: 'new', q, projectId: filter ? filter.id : projects.length === 1 ? projects[0].id : '' });
  };
  const signOut = () => {
    flush();
    void logout();
  };

  const nav = {
    me,
    view,
    canEdit,
    isAdmin,
    showCounts: !loading,
    openCount: openTasks.length,
    doneCount,
    projects,
    projectCounts,
    filterId: filter ? filter.id : null,
    onView: go,
    onFilter: pickFilter,
    onNew: () => openNew(''),
    onLogout: signOut,
  };

  return (
    <div className="app theme-dark">
      <Sidebar {...nav} />

      <main className="main">
        <MobileTop me={me} onLogout={signOut} />
        <NetBar online={data.online} failed={data.status === 'error'} />

        {view !== 'matrix' && (
          <header className="top">
            <div>
              <h1>{VIEW_TITLES[view][0]}</h1>
              <p className="sub">{VIEW_TITLES[view][1]}</p>
            </div>
          </header>
        )}

        {view === 'matrix' && (
          <>
            <MobileFilter projects={projects} filterId={nav.filterId} onFilter={pickFilter} />
            <Matrix
              loading={loading}
              canEdit={canEdit}
              isAdmin={isAdmin}
              openTasks={openTasks}
              projects={projects}
              projectMap={projectMap}
              people={people}
              filter={filter}
              pending={pending}
              dialogOpen={!!dialog}
              onClearFilter={() => pickFilter(null)}
              onNew={openNew}
              onOpen={(t: Task) => setDialog({ mode: 'view', id: t.id })}
              onToggleDone={(id) => canEdit && toggleDone(id)}
              onTogglePin={(t) => canEdit && setPinned(t.id, !t.pinnedAt)}
              onMove={(id, q) => canEdit && moveTask(id, q)}
              onGoProjects={() => go('projects')}
            />
          </>
        )}
        {view === 'done' && <DonePage data={data} />}
        {view === 'people' && isAdmin && <PeoplePage data={data} />}
        {view === 'projects' && isAdmin && <ProjectsPage data={data} />}
      </main>

      <TabBar view={view} canEdit={canEdit} isAdmin={isAdmin} onView={go} onNew={() => openNew('')} />

      <SaveToast />

      {dialog && (
        <TaskDialog
          state={dialog}
          tasks={tasks}
          projects={projects}
          projectMap={projectMap}
          members={members}
          people={people}
          meEmail={me.email}
          canEdit={canEdit}
          isAdmin={isAdmin}
          pending={pending}
          onChange={setDialog}
        />
      )}
    </div>
  );
}
