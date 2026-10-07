import axios from 'axios';
import { auth } from './firebase';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://blog-api.joyinfant.com').replace(/\/$/, '');
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.joyinfant.com').replace(/\/$/, '');

/** Axios client that attaches the signed-in user's Firebase token to every request. */
export const api = axios.create({ baseURL: API_URL, withCredentials: true });
api.interceptors.request.use(async (config) => {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.details || err?.response?.data?.error || err?.response?.data?.message || (err?.message === 'Network Error' ? 'Cannot reach the API. Is the backend running?' : fallback);

export const imageUrl = (p?: string | null) => (!p ? '' : p.startsWith('http') ? p : `${API_URL}/${p}`);

export const fmtDate = (d?: string | number | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

/** "just now", "5 min ago", "3 days ago", then a plain date. */
export const ago = (d?: string | number | Date | null) => {
  if (!d) return '';
  const s = (Date.now() - +new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(d);
};

export const domainOf = (u?: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : ''; } catch { return ''; } };
