import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, type QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Me, Member, Project, Task } from '../types';
import { migrateLegacyQuadrants } from './actions';

export interface AppData {
  status: 'loading' | 'ready' | 'error';
  projects: Project[]; // only the projects this user may see
  members: Member[];
  tasks: Task[]; // open and done tasks this user may see
  /** The signed-in user, kept live (role / project changes apply immediately). */
  me: Me;
  online: boolean;
}

function rows<T>(snap: QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

function normaliseTask(t: Partial<Task> & { id: string }): Task {
  return {
    id: t.id,
    title: t.title || '',
    desc: t.desc || '',
    q: t.q === 'do' ? 'do' : 'plan', // legacy 'delegate' / 'drop' read as 'plan'
    projectId: t.projectId || '',
    assigneeIds: t.assigneeIds || [],
    start: t.start || '',
    end: t.end || '',
    pinnedAt: t.pinnedAt ?? null,
    doneAt: t.doneAt ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    createdBy: t.createdBy,
  };
}

/** Admin only: move tasks from the removed Devret / Bırak sections to Planla, once. */
let migrated = false;
function migrateLegacy(raw: Task[]) {
  if (migrated) return;
  const ids = raw.filter((t) => (t.q as string) === 'delegate' || (t.q as string) === 'drop').map((t) => t.id);
  migrated = true;
  if (ids.length) migrateLegacyQuadrants(ids);
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Live data for the signed-in user. */
export function useAppData(sessionMe: Me): AppData {
  const online = useOnline();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fail = (e: unknown) => {
      console.error(e);
      setError(true);
    };
    const u1 = onSnapshot(collection(db, 'projects'), (s) => setProjects(rows<Project>(s)), fail);
    const u2 = onSnapshot(collection(db, 'members'), (s) => setMembers(rows<Member>(s)), fail);
    return () => {
      u1();
      u2();
    };
  }, []);

  // The live version of "me": a member's role or projects may change while signed in.
  const me: Me = useMemo(() => {
    if (sessionMe.role === 'admin' || !members) return sessionMe;
    const m = members.find((x) => x.id === sessionMe.email);
    return m ? { ...sessionMe, name: m.name, role: m.role, projectIds: m.projectIds || [] } : { ...sessionMe, projectIds: [] };
  }, [sessionMe, members]);

  const projectKey = me.projectIds === null ? '*' : [...me.projectIds].sort().join(',');

  useEffect(() => {
    // Admin reads everything; members must ask only for their projects (enforced by the rules).
    const ids = projectKey === '*' ? null : projectKey ? projectKey.split(',') : [];
    const chunks: string[][] = ids ? Array.from({ length: Math.ceil(ids.length / 30) }, (_, i) => ids.slice(i * 30, i * 30 + 30)) : [];
    const parts = new Map<number, Task[]>();
    const publish = (expected: number) => {
      if (parts.size === expected) setTasks([...parts.values()].flat());
    };
    // Members: tasks of their projects + project-less tasks assigned to them.
    const queries = ids
      ? [
          ...chunks.map((c) => query(collection(db, 'tasks'), where('projectId', 'in', c))),
          query(collection(db, 'tasks'), where('projectId', '==', ''), where('assigneeIds', 'array-contains', sessionMe.email)),
        ]
      : [collection(db, 'tasks')];
    const unsubs = queries.map(
      (qry, i, all) =>
        onSnapshot(
          qry,
          (s) => {
            const raw = rows<Task>(s);
            if (!ids) migrateLegacy(raw);
            parts.set(i, raw.map(normaliseTask));
            publish(all.length);
          },
          (e) => {
            console.error(e);
            setError(true);
          },
        ),
    );
    return () => unsubs.forEach((u) => u());
  }, [projectKey, sessionMe.email]);

  const visibleProjects = useMemo(() => {
    if (!projects) return [];
    const list = me.projectIds === null ? projects : projects.filter((p) => me.projectIds!.includes(p.id));
    return [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.name.localeCompare(b.name, 'tr'));
  }, [projects, me.projectIds]);

  const sortedMembers = useMemo(
    () => (members ? [...members].sort((a, b) => a.name.localeCompare(b.name, 'tr')) : []),
    [members],
  );

  const status: AppData['status'] = error ? 'error' : projects && members && tasks ? 'ready' : 'loading';
  return { status, projects: visibleProjects, members: sortedMembers, tasks: tasks || [], me, online };
}
