'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type Profile } from '@/lib/supabase';
import { OBJ_BY_ID } from '@/content';
import Session from './Session';

interface WallRow {
  objective_id: string;
  text: string;
  created_at: string;
}

export default function LearnerHome({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [running, setRunning] = useState(false);
  const [wall, setWall] = useState<WallRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadWall = useCallback(async () => {
    const db = supabase();
    const { data } = await db
      .from('wall')
      .select('objective_id, text, created_at')
      .eq('learner_id', profile.id)
      .order('created_at', { ascending: true });
    setWall((data ?? []) as WallRow[]);
    setLoaded(true);
  }, [profile.id]);

  useEffect(() => {
    void loadWall();
  }, [loadWall]);

  if (running) {
    return (
      <div className="wrap">
        <div className="top">
          <h1>Working</h1>
          <button className="btn quiet" onClick={() => setRunning(false)}>
            Stop
          </button>
        </div>
        <Session
          profile={profile}
          onDone={() => {
            setRunning(false);
            void loadWall();
          }}
        />
      </div>
    );
  }

  const first = wall[0];
  const byStrand = {
    maths: wall.filter((w) => OBJ_BY_ID[w.objective_id]?.strand === 'maths'),
    english: wall.filter((w) => OBJ_BY_ID[w.objective_id]?.strand === 'english'),
  };

  return (
    <div className="wrap">
      <div className="top">
        <h1>Hello, {profile.display_name}</h1>
        <span className="who">
          <button className="btn quiet" onClick={onSignOut}>
            Sign out
          </button>
        </span>
      </div>

      <div className="card">
        <h2>Ready when you are</h2>
        <p className="muted">
          About fifteen minutes. You can stop whenever you want and nothing is lost.
        </p>
        <button className="btn" onClick={() => setRunning(true)} autoFocus>
          Start
        </button>
      </div>

      <h3>The wall</h3>
      {!loaded ? (
        <p className="muted">Loading…</p>
      ) : wall.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Nothing up here yet. The first card goes up as soon as you have something properly
            nailed down. Nothing ever comes off it.
          </p>
        </div>
      ) : (
        <>
          <div className="wallhead">
            <span className="wallcount">{wall.length}</span>
            <span className="muted">
              thing{wall.length === 1 ? '' : 's'} you can do that you could not do before
            </span>
          </div>
          {first ? (
            <p className="muted">
              First one went up on{' '}
              {new Date(first.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
              })}
              .
            </p>
          ) : null}
          <div className="spacer" />
          {(['maths', 'english'] as const).map((s) =>
            byStrand[s].length ? (
              <div key={s} style={{ marginBottom: 22 }}>
                <span className="lbl">{s === 'maths' ? 'Maths' : 'English'}</span>
                <div className="cards">
                  {byStrand[s]
                    .slice()
                    .reverse()
                    .map((w) => (
                      <div key={w.objective_id} className={`cando ${s}`}>
                        <p>{w.text}</p>
                        <time>
                          {new Date(w.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </time>
                      </div>
                    ))}
                </div>
              </div>
            ) : null
          )}
        </>
      )}
    </div>
  );
}
