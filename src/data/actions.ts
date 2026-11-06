import {
  addDoc,
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { normEmail } from '../lib/people';
import type { Member, Project, QuadrantId, TaskInput } from '../types';
import { fireAndReport } from './saveStatus';

/*
 * Every write goes through fireAndReport: the UI updates at once from the local cache,
 * the write is sent when online, and a failure shows the "Kaydedilemedi · Tekrar dene" toast.
 */

const now = () => Date.now();
const tasksCol = () => collection(db, 'tasks');

// ---------- tasks ----------

export function createTask(input: TaskInput): void {
  fireAndReport('createTask', () =>
    addDoc(tasksCol(), {
      ...input,
      title: input.title.trim(),
      desc: input.desc.trim(),
      pinnedAt: null,
      doneAt: null,
      createdAt: now(),
      updatedAt: now(),
      createdBy: auth.currentUser?.email?.toLowerCase() || '',
    }),
  );
}

export function updateTask(id: string, input: TaskInput): void {
  fireAndReport('updateTask', () =>
    updateDoc(doc(db, 'tasks', id), { ...input, title: input.title.trim(), desc: input.desc.trim(), updatedAt: now() }),
  );
}

export function moveTask(id: string, q: QuadrantId): void {
  fireAndReport('moveTask', () => updateDoc(doc(db, 'tasks', id), { q, updatedAt: now() }));
}

export function setPinned(id: string, pinned: boolean): void {
  fireAndReport('setPinned', () => updateDoc(doc(db, 'tasks', id), { pinnedAt: pinned ? now() : null, updatedAt: now() }));
}

/** Mark done (after the 4-second undo window) or restore from Bitenler. */
export function setDone(id: string, done: boolean): void {
  fireAndReport('setDone', () => updateDoc(doc(db, 'tasks', id), { doneAt: done ? now() : null, updatedAt: now() }));
}

export function deleteTask(id: string): void {
  fireAndReport('deleteTask', () => deleteDoc(doc(db, 'tasks', id)));
}

/** Permanently delete several (e.g. all done) tasks. */
export function deleteTasks(ids: string[]): void {
  fireAndReport('deleteTasks', async () => {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, 'tasks', id)));
      await batch.commit();
    }
  });
}

/** One-off: tasks still in the removed Devret / Bırak sections go to Planla. */
export function migrateLegacyQuadrants(ids: string[]): void {
  fireAndReport('migrateLegacyQuadrants', async () => {
    for (let i = 0; i < ids.length; i += 400) {
      const batch = writeBatch(db);
      ids.slice(i, i + 400).forEach((id) => batch.update(doc(db, 'tasks', id), { q: 'plan', updatedAt: now() }));
      await batch.commit();
    }
  });
}

// ---------- projects (admin) ----------

export function createProject(name: string, color: string): void {
  fireAndReport('createProject', () => addDoc(collection(db, 'projects'), { name: name.trim(), color, createdAt: now() }));
}

export function updateProject(id: string, patch: Pick<Project, 'name' | 'color'>): void {
  fireAndReport('updateProject', () => updateDoc(doc(db, 'projects', id), { name: patch.name.trim(), color: patch.color }));
}

/** Deletes the project; its tasks stay as "Projesiz" and members lose access to it. */
export function deleteProject(id: string): void {
  fireAndReport('deleteProject', async () => {
    const [taskSnap, memberSnap] = await Promise.all([
      getDocs(query(tasksCol(), where('projectId', '==', id))),
      getDocs(query(collection(db, 'members'), where('projectIds', 'array-contains', id))),
    ]);
    const batch = writeBatch(db);
    taskSnap.forEach((d) => batch.update(d.ref, { projectId: '', updatedAt: now() }));
    memberSnap.forEach((d) => batch.update(d.ref, { projectIds: arrayRemove(id) }));
    batch.delete(doc(db, 'projects', id));
    await batch.commit();
  });
}

// ---------- members (admin) ----------

export type MemberInput = Pick<Member, 'name' | 'email' | 'role' | 'projectIds'>;

/** Add or update a member and put their address on the invite list. */
export function saveMember(input: MemberInput, previousEmail?: string): void {
  const email = normEmail(input.email);
  fireAndReport('saveMember', async () => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'members', email), {
      name: input.name.trim(),
      email,
      role: input.role,
      projectIds: input.projectIds,
      createdAt: now(),
    });
    batch.set(doc(db, 'invites', email), { createdAt: now() });
    if (previousEmail && normEmail(previousEmail) !== email) {
      batch.delete(doc(db, 'members', normEmail(previousEmail)));
      batch.delete(doc(db, 'invites', normEmail(previousEmail)));
    }
    await batch.commit();
  });
}

/** Removes the member and their invite; their tasks stay, shown as "Atanmadı" if no one else is assigned. */
export function deleteMember(email: string): void {
  const e = normEmail(email);
  fireAndReport('deleteMember', async () => {
    const taskSnap = await getDocs(query(tasksCol(), where('assigneeIds', 'array-contains', e)));
    const batch = writeBatch(db);
    taskSnap.forEach((d) => batch.update(d.ref, { assigneeIds: arrayRemove(e), updatedAt: now() }));
    batch.delete(doc(db, 'members', e));
    batch.delete(doc(db, 'invites', e));
    await batch.commit();
  });
}

/** Used by the "Yeni kişi" shortcut in the task form: editor access to one project. */
export function quickAddMember(name: string, email: string, projectId: string): void {
  saveMember({ name, email, role: 'editor', projectIds: projectId ? [projectId] : [] });
}
