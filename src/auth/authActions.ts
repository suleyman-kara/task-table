import {
  isSignInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ADMIN_EMAIL } from '../config';
import { normEmail } from '../lib/people';

const EMAIL_KEY = 'tt-signin-email';

export type AuthErrorCode =
  | 'not-invited'
  | 'invalid-email'
  | 'expired-link'
  | 'email-mismatch'
  | 'wrong-password'
  | 'too-many-requests'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
  }
}

function mapError(e: unknown): AuthError {
  const code = (e as { code?: string })?.code || '';
  if (code === 'auth/invalid-email') return new AuthError('invalid-email');
  if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') return new AuthError('expired-link');
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')
    return new AuthError('wrong-password');
  if (code === 'auth/too-many-requests') return new AuthError('too-many-requests');
  if (code === 'auth/network-request-failed' || code === 'unavailable') return new AuthError('network');
  return new AuthError('unknown');
}

/** Is this exact address on the invite list? (The admin always is.) */
export async function isInvited(email: string): Promise<boolean> {
  const e = normEmail(email);
  if (e === ADMIN_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, 'invites', e));
    return snap.exists();
  } catch (err) {
    throw mapError(err);
  }
}

/** Step 1 of passwordless sign-in: email a one-time link (only to invited addresses). */
export async function sendLoginLink(email: string): Promise<void> {
  const e = normEmail(email);
  if (!(await isInvited(e))) throw new AuthError('not-invited');
  try {
    await sendSignInLinkToEmail(auth, e, { url: `${window.location.origin}/`, handleCodeInApp: true });
    window.localStorage.setItem(EMAIL_KEY, e);
  } catch (err) {
    throw mapError(err);
  }
}

export function isLoginLink(href = window.location.href): boolean {
  return isSignInWithEmailLink(auth, href);
}

/** The email saved on this device when the link was requested (null = opened on another device). */
export function savedLinkEmail(): string | null {
  return window.localStorage.getItem(EMAIL_KEY);
}

/** Step 2: finish sign-in from the link. Pass the email when it was opened on another device. */
export async function completeLoginLink(email?: string): Promise<void> {
  const e = normEmail(email || savedLinkEmail() || '');
  if (!e) throw new AuthError('email-mismatch');
  try {
    await signInWithEmailLink(auth, e, window.location.href);
    window.localStorage.removeItem(EMAIL_KEY);
    window.history.replaceState(null, '', '/');
  } catch (err) {
    const mapped = mapError(err);
    // Firebase answers a wrong email with invalid-email / invalid-action-code depending on version.
    if (email && mapped.code === 'invalid-email') throw new AuthError('email-mismatch');
    throw mapped;
  }
}

export type AdminSignInResult = 'ok' | 'verification-sent';

/** Admin sign-in with password. The admin's email must be verified once before data opens up. */
export async function adminSignIn(email: string, password: string): Promise<AdminSignInResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, normEmail(email), password);
    if (!cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
      return 'verification-sent';
    }
    return 'ok';
  } catch (err) {
    throw mapError(err);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, normEmail(email));
  } catch (err) {
    const mapped = mapError(err);
    // Don't reveal whether the address exists.
    if (mapped.code === 'wrong-password') return;
    throw mapped;
  }
}

export function logout(): Promise<void> {
  return signOut(auth);
}

/** Turkish messages for the login screen. */
export const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  'not-invited': 'Bu e-posta davetli değil. Erişim için yöneticiye başvurun.',
  'invalid-email': 'Geçerli bir e-posta adresi girin.',
  'expired-link': 'Bu bağlantı kullanılmış ya da süresi geçmiş. Yeni bir bağlantı isteyin.',
  'email-mismatch': 'Bu e-posta, bağlantının gönderildiği adresle eşleşmiyor.',
  'wrong-password': 'E-posta ya da şifre hatalı.',
  'too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.',
  network: 'Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.',
  unknown: 'Bir şeyler ters gitti. Tekrar deneyin.',
};
