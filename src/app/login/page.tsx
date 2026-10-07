'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Notice } from '@/components/ui';

const messages: Record<string, string> = {
  'auth/invalid-email': 'Invalid email address format.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!authLoading && user) router.replace('/dashboard'); }, [authLoading, user, router]);

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setError(''); setBusy(true);
    try { await fn(); router.replace('/dashboard'); }
    catch (e: any) { setError(messages[e.code] || fallback); }
    finally { setBusy(false); }
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); run(() => signInWithEmailAndPassword(auth, email, password), 'Failed to sign in. Check your credentials.'); };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between bg-side p-14 lg:flex">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-fg"><img src="/joyprofile.jpeg" alt="" className="h-5 w-5 rounded-[4px] object-cover" />Joy Infant</p>
        <div>
          <p className="font-phrase text-[96px] italic leading-none text-accent">Salve</p>
          <div className="mt-8 h-px w-24 bg-accent" />
          <p className="mt-6 max-w-sm font-read text-lg leading-relaxed text-body">Posts, releases, private notes and the numbers behind them, in one quiet place.</p>
        </div>
        <p className="text-[12px] text-muted">Admin workspace</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[340px]">
          <p className="font-phrase text-6xl italic leading-none text-accent lg:hidden">Salve</p>
          <h1 className="mb-8 mt-4 text-[26px] font-bold tracking-tight text-fg lg:mt-0">Sign in</h1>
          {error && <Notice>{error}</Notice>}
          <form onSubmit={onSubmit} className="space-y-5">
            <div><label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" className="input" value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" required autoComplete="current-password" className="input" value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)} /></div>
            <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-line" /><span className="text-[12px] text-muted">or</span><span className="h-px flex-1 bg-line" /></div>
          <button type="button" disabled={busy} className="btn-ghost btn-lg w-full"
            onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()), 'Failed to sign in with Google.')}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width={16} height={16} /> Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
