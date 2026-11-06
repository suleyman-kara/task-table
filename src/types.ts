/** Two sections: 'do' (Hemen yap) on top, 'plan' (Planla) below.
 *  Older tasks may still carry 'delegate' / 'drop' in the database; they are read as 'plan'. */
export type QuadrantId = 'do' | 'plan';
export type Role = 'admin' | 'editor' | 'viewer';

export interface Project {
  id: string;
  name: string;
  color: string; // #RRGGBB
  createdAt?: number;
}

/** A team member. The document id is the lower-cased email. The admin is not stored here. */
export interface Member {
  id: string; // = email
  name: string;
  email: string;
  role: 'editor' | 'viewer';
  projectIds: string[];
  createdAt?: number;
}

export interface Task {
  id: string;
  title: string;
  desc: string;
  q: QuadrantId;
  projectId: string; // '' = no project (created without one, or its project was deleted)
  assigneeIds: string[]; // member emails (the admin's email for the admin)
  start: string; // 'YYYY-MM-DD' or ''
  end: string; // 'YYYY-MM-DD' or ''
  pinnedAt: number | null;
  doneAt: number | null;
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export type TaskInput = Pick<Task, 'title' | 'desc' | 'q' | 'projectId' | 'assigneeIds' | 'start' | 'end'>;

/** Who is signed in, as the UI needs it. */
export interface Me {
  email: string;
  name: string;
  role: Role;
  /** null = all projects (admin) */
  projectIds: string[] | null;
}

export const QUADRANTS: { id: QuadrantId; name: string; hint: string }[] = [
  { id: 'do', name: 'Hemen yap', hint: 'Şu anda yapılanlar ve hemen ilgilenilmesi gerekenler' },
  { id: 'plan', name: 'Planla', hint: 'Sıradaki ve ileri tarihli işler' },
];

/** Project colours (muted, equal lightness, distinct from section colours). */
export const PROJECT_PALETTE: { hex: string; label: string }[] = [
  { hex: '#5EB6B2', label: 'Deniz' },
  { hex: '#7DB485', label: 'Adaçayı' },
  { hex: '#C79B69', label: 'Kum' },
  { hex: '#D08CB2', label: 'Gül' },
  { hex: '#A89AD7', label: 'Lavanta' },
  { hex: '#A6AB63', label: 'Zeytin' },
  { hex: '#DA8D83', label: 'Kil' },
  { hex: '#75AEC7', label: 'Çelik' },
];
