'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import LearnerHome from '@/components/LearnerHome';
import ParentDashboard from '@/components/ParentDashboard';

export default function Home() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const db = supabase();
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) {
        setProfile(null);
        setReady(true);
        return;
      }
      const { data, error } = await db.from('profiles').select('*').eq('id', auth.user.id).single();
      if (error) throw error;
      setProfile(data as Profile);
      setReady(true);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : String(e));
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    setProfile(null);
  }, []);

  if (!ready) {
    return (
      <div className="wrap">
        <div className="spacer" />
        <p className="muted">One moment…</p>
      </div>
    );
  }

  if (configError && !profile) {
    return (
      <div className="wrap">
        <div className="top">
          <h1>Murphy&rsquo;s Desk</h1>
        </div>
        <div className="card">
          <h2>Not set up yet</h2>
          <p className="muted">{configError}</p>
          <p className="muted">
            Check .env.local, then run supabase/schema.sql and add the two profile rows described at
            the bottom of it.
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return <SignIn onSignedIn={loadProfile} />;

  return profile.role === 'parent' ? (
    <ParentDashboard profile={profile} onSignOut={signOut} />
  ) : (
    <LearnerHome profile={profile} onSignOut={signOut} />
  );
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <div className="top">
        <h1>Murphy&rsquo;s Desk</h1>
      </div>
      <form className="card" onSubmit={submit}>
        <label className="field">
          <span className="lbl">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span className="lbl">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'One second…' : 'Sign in'}
        </button>
        {error ? (
          <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
            {error}
          </p>
        ) : null}
      </form>
      <p className="muted center">Stay signed in on her device so she never has to do this.</p>
    </div>
  );
}
