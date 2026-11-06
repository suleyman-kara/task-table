import { ADMIN_EMAIL, ADMIN_NAME } from '../config';
import { shortDate } from '../lib/dates';
import type { Member, Project, Task } from '../types';

/** Someone who can be assigned to a task: the admin plus every member. */
export interface Person {
  id: string; // email
  name: string;
  email: string;
  member: Member | null; // null for the admin
}

export const ADMIN_PERSON: Person = { id: ADMIN_EMAIL, name: ADMIN_NAME, email: ADMIN_EMAIL, member: null };

export function peopleById(members: Member[]): Map<string, Person> {
  const map = new Map<string, Person>([[ADMIN_EMAIL, ADMIN_PERSON]]);
  members.forEach((m) => map.set(m.id, { id: m.id, name: m.name, email: m.email, member: m }));
  return map;
}

export function assignees(t: Task, people: Map<string, Person>): Person[] {
  return t.assigneeIds.map((id) => people.get(id)).filter((p): p is Person => !!p);
}

/** "Atanmadı", "Ayşe Demir", "Ayşe, Mert", "Ayşe +2" — as in the design. */
export function whoText(list: Person[]): string {
  if (!list.length) return 'Atanmadı';
  if (list.length === 1) return list[0].name;
  const first = list.map((p) => p.name.split(' ')[0]);
  return list.length === 2 ? first.join(', ') : `${first[0]} +${list.length - 1}`;
}

export const NO_PROJECT: Pick<Project, 'name' | 'color'> = { name: 'Projesiz', color: 'var(--line-strong)' };

/** Filter key for project-less tasks (project ids are never this). */
export const NO_PROJECT_FILTER = '__none__';
/** The "Projesiz" filter as a pseudo project: its id '' matches `task.projectId`. */
export const NO_PROJECT_AS_FILTER: Project = { id: '', ...NO_PROJECT };

export function projectOf(t: Task, projects: Map<string, Project>): Pick<Project, 'name' | 'color'> {
  return projects.get(t.projectId) || NO_PROJECT;
}

/** Pinned first (in the order they were pinned), then by end date; no end date goes last. */
export function taskOrder(a: Task, b: Task): number {
  if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
  if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) return a.pinnedAt - b.pinnedAt;
  const ae = a.end || '9999';
  const be = b.end || '9999';
  if (ae !== be) return ae < be ? -1 : 1;
  const as = a.start || '9999';
  const bs = b.start || '9999';
  if (as !== bs) return as < bs ? -1 : 1;
  return (a.createdAt || 0) - (b.createdAt || 0);
}

/** Date text on a card; a late task shows "Gecikti · 3 Kas". */
export function cardWhen(t: Task, late: boolean): string {
  if (late) return `Gecikti · ${shortDate(t.end)}`;
  if (t.start && t.end) return `${shortDate(t.start)} – ${shortDate(t.end)}`;
  if (t.end) return `Bitiş ${shortDate(t.end)}`;
  if (t.start) return `Başl. ${shortDate(t.start)}`;
  return '';
}

/** Date text in the detail dialog. */
export function detailWhen(t: Task): string {
  if (t.start && t.end) return `${shortDate(t.start)} – ${shortDate(t.end)}`;
  if (t.end) return `Bitiş ${shortDate(t.end)}`;
  if (t.start) return `Başlangıç ${shortDate(t.start)}`;
  return 'Tarih yok';
}

export type View = 'matrix' | 'done' | 'people' | 'projects';

export const VIEW_HASH: Record<View, string> = { matrix: '', done: '#bitenler', people: '#kisiler', projects: '#projeler' };

export function viewFromHash(hash: string): View {
  const v = (Object.keys(VIEW_HASH) as View[]).find((k) => VIEW_HASH[k] && VIEW_HASH[k] === hash);
  return v || 'matrix';
}

export const VIEW_TITLES: Record<Exclude<View, 'matrix'>, [string, string]> = {
  done: ['Bitenler', 'Biten görevleri geri alın veya silin'],
  people: ['Kişiler', 'Görev atanabilecek kişiler'],
  projects: ['Projeler', 'Görevler eklenirken bu listeden proje seçilir'],
};
