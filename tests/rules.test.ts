import { readFileSync } from 'node:fs';
import 'firebase/compat/app';
import 'firebase/compat/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

const ADMIN = 'karasuleyman125@gmail.com';
let env: RulesTestEnvironment;

const as = (email: string, emailVerified = true) =>
  env.authenticatedContext(email, { email, email_verified: emailVerified }).firestore();

const task = (projectId: string, extra: Record<string, unknown> = {}) => ({
  title: 'Görev',
  desc: '',
  q: 'do',
  projectId,
  assigneeIds: [],
  start: '2026-11-05',
  end: '2026-11-07',
  pinnedAt: null,
  doneAt: null,
  createdAt: 1,
  updatedAt: 1,
  createdBy: ADMIN,
  ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-task-table',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'projects', 'web'), { name: 'Web', color: '#5EB6B2', createdAt: 1 });
    await setDoc(doc(db, 'projects', 'ops'), { name: 'Ops', color: '#A89AD7', createdAt: 1 });
    await setDoc(doc(db, 'members', 'ed@x.com'), { name: 'Ed', email: 'ed@x.com', role: 'editor', projectIds: ['web'], createdAt: 1 });
    await setDoc(doc(db, 'members', 'vi@x.com'), { name: 'Vi', email: 'vi@x.com', role: 'viewer', projectIds: ['web'], createdAt: 1 });
    await setDoc(doc(db, 'invites', 'ed@x.com'), { createdAt: 1 });
    await setDoc(doc(db, 'tasks', 'tWeb'), task('web'));
    await setDoc(doc(db, 'tasks', 'tOps'), task('ops'));
  });
});

describe('signed out / not invited', () => {
  it('can check one invite but not list them', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'invites', 'ed@x.com')));
    await assertFails(getDocs(collection(db, 'invites')));
  });
  it('cannot read anything else', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'tasks', 'tWeb')));
    await assertFails(getDocs(collection(db, 'projects')));
    const stranger = as('who@x.com');
    await assertFails(getDoc(doc(stranger, 'tasks', 'tWeb')));
    await assertFails(getDocs(collection(stranger, 'members')));
  });
});

describe('admin', () => {
  it('needs a verified email', async () => {
    await assertFails(getDocs(collection(as(ADMIN, false), 'tasks')));
  });
  it('reads and writes everything', async () => {
    const db = as(ADMIN);
    await assertSucceeds(getDocs(collection(db, 'tasks')));
    await assertSucceeds(setDoc(doc(db, 'projects', 'mkt'), { name: 'Pazarlama', color: '#C79B69', createdAt: 2 }));
    await assertSucceeds(
      setDoc(doc(db, 'members', 'new@x.com'), { name: 'Yeni', email: 'new@x.com', role: 'viewer', projectIds: [], createdAt: 2 }),
    );
    await assertSucceeds(setDoc(doc(db, 'invites', 'new@x.com'), { createdAt: 2 }));
    await assertSucceeds(updateDoc(doc(db, 'tasks', 'tOps'), { projectId: '' }));
  });
  it('rejects invalid data', async () => {
    const db = as(ADMIN);
    await assertFails(setDoc(doc(db, 'projects', 'bad'), { name: '', color: 'red' }));
    await assertFails(setDoc(doc(db, 'tasks', 'bad'), task('web', { q: 'urgent' })));
    await assertFails(setDoc(doc(db, 'tasks', 'bad'), task('web', { start: '2026-12-01', end: '2026-11-01' })));
    await assertFails(setDoc(doc(db, 'members', 'Caps@x.com'), { name: 'C', email: 'Caps@x.com', role: 'editor', projectIds: [] }));
    await assertFails(
      setDoc(doc(db, 'members', ADMIN), { name: 'A', email: ADMIN, role: 'editor', projectIds: [] }),
    );
  });
});

describe('editor', () => {
  it('reads only own project tasks (query must filter)', async () => {
    const db = as('ed@x.com');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('projectId', 'in', ['web']))));
    await assertFails(getDocs(collection(db, 'tasks')));
    await assertFails(getDoc(doc(db, 'tasks', 'tOps')));
  });
  it('creates, edits and deletes in own project only', async () => {
    const db = as('ed@x.com');
    await assertSucceeds(setDoc(doc(db, 'tasks', 'n1'), task('web')));
    await assertFails(setDoc(doc(db, 'tasks', 'n2'), task('ops')));
    await assertSucceeds(updateDoc(doc(db, 'tasks', 'tWeb'), { q: 'plan' }));
    await assertFails(updateDoc(doc(db, 'tasks', 'tWeb'), { projectId: 'ops' }));
    await assertSucceeds(deleteDoc(doc(db, 'tasks', 'tWeb')));
  });
  it('cannot manage people or projects', async () => {
    const db = as('ed@x.com');
    await assertSucceeds(getDocs(collection(db, 'members')));
    await assertFails(setDoc(doc(db, 'projects', 'p'), { name: 'P', color: '#5EB6B2', createdAt: 1 }));
    await assertFails(updateDoc(doc(db, 'members', 'ed@x.com'), { projectIds: ['web', 'ops'] }));
    await assertFails(setDoc(doc(db, 'invites', 'friend@x.com'), { createdAt: 1 }));
  });
  it('needs a verified email', async () => {
    await assertFails(getDocs(query(collection(as('ed@x.com', false), 'tasks'), where('projectId', 'in', ['web']))));
  });
});

describe('project-less tasks', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'tasks', 'pEd'), task('', { assigneeIds: ['ed@x.com'] }));
      await setDoc(doc(db, 'tasks', 'pVi'), task('', { assigneeIds: ['vi@x.com'] }));
      await setDoc(doc(db, 'tasks', 'pNone'), task(''));
    });
  });
  it('admin creates and reads them', async () => {
    const db = as(ADMIN);
    await assertSucceeds(setDoc(doc(db, 'tasks', 'p1'), task('')));
    await assertSucceeds(getDoc(doc(db, 'tasks', 'pNone')));
  });
  it('members read only those assigned to them (query must filter)', async () => {
    const ed = as('ed@x.com');
    await assertSucceeds(
      getDocs(query(collection(ed, 'tasks'), where('projectId', '==', ''), where('assigneeIds', 'array-contains', 'ed@x.com'))),
    );
    await assertFails(getDocs(query(collection(ed, 'tasks'), where('projectId', '==', ''))));
    await assertFails(getDoc(doc(ed, 'tasks', 'pNone')));
    await assertSucceeds(getDoc(doc(as('vi@x.com'), 'tasks', 'pVi')));
  });
  it('editors create/edit them only when assigned; viewers never', async () => {
    const ed = as('ed@x.com');
    await assertSucceeds(setDoc(doc(ed, 'tasks', 'p2'), task('', { assigneeIds: ['ed@x.com'] })));
    await assertFails(setDoc(doc(ed, 'tasks', 'p3'), task('', { assigneeIds: ['vi@x.com'] })));
    await assertSucceeds(updateDoc(doc(ed, 'tasks', 'pEd'), { q: 'plan' }));
    await assertFails(updateDoc(doc(as('vi@x.com'), 'tasks', 'pVi'), { q: 'plan' }));
  });
});

describe('viewer', () => {
  it('reads own project tasks but cannot write', async () => {
    const db = as('vi@x.com');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('projectId', 'in', ['web']))));
    await assertFails(updateDoc(doc(db, 'tasks', 'tWeb'), { doneAt: 5 }));
    await assertFails(setDoc(doc(db, 'tasks', 'n'), task('web')));
    await assertFails(deleteDoc(doc(db, 'tasks', 'tWeb')));
  });
});

