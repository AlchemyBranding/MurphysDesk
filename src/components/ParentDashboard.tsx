'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, type MasteryRow, type Profile } from '@/lib/supabase';
import { OBJ_BY_ID, OBJECTIVES } from '@/content';
import { paceSummary } from '@/lib/session';

interface AttemptRow {
  objective_id: string;
  is_correct: boolean;
  misconception_id: string | null;
  rapid: boolean;
  latency_ms: number | null;
  created_at: string;
  mode: string;
}
interface FlagRow {
  id: number;
  template_id: string;
  stem: string | null;
  expected: string | null;
  note: string | null;
  created_at: string;
  resolved: boolean;
}

export default function ParentDashboard({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [learners, setLearners] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [mastery, setMastery] = useState<Record<string, MasteryRow>>({});
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [week, setWeek] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const db = supabase();
    void db
      .from('profiles')
      .select('*')
      .eq('household_id', profile.household_id)
      .eq('role', 'learner')
      .then(({ data }) => {
        const list = (data ?? []) as Profile[];
        setLearners(list);
        if (list[0]) {
          setSelected(list[0]);
          setWeek(list[0].programme_week);
        }
      });
  }, [profile.household_id]);

  const load = useCallback(async (learner: Profile) => {
    const db = supabase();
    const [m, a, f] = await Promise.all([
      db.from('mastery').select('*').eq('learner_id', learner.id),
      db
        .from('attempts')
        .select('objective_id, is_correct, misconception_id, rapid, latency_ms, created_at, mode')
        .eq('learner_id', learner.id)
        .order('created_at', { ascending: false })
        .limit(400),
      db
        .from('flags')
        .select('*')
        .eq('learner_id', learner.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false }),
    ]);
    setMastery(Object.fromEntries(((m.data ?? []) as MasteryRow[]).map((x) => [x.objective_id, x])));
    setAttempts((a.data ?? []) as AttemptRow[]);
    setFlags((f.data ?? []) as FlagRow[]);
  }, []);

  useEffect(() => {
    if (selected) void load(selected);
  }, [selected, load]);

  if (!selected) {
    return (
      <div className="wrap">
        <div className="top">
          <h1>Grown-ups</h1>
          <button className="btn quiet" onClick={onSignOut}>
            Sign out
          </button>
        </div>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No learners in this household yet. Add a profile row with role &lsquo;learner&rsquo; in
            Supabase, following the instructions at the bottom of schema.sql.
          </p>
        </div>
      </div>
    );
  }

  const pace = paceSummary(mastery, selected.programme_week);

  // The misconception leaderboard. The single most valuable thing here, and the
  // one signal no bought product will give you for one child.
  const misTally: Record<string, { n: number; where: Set<string> }> = {};
  for (const a of attempts) {
    if (!a.misconception_id) continue;
    const key = a.misconception_id;
    misTally[key] = misTally[key] ?? { n: 0, where: new Set() };
    misTally[key].n++;
    misTally[key].where.add(a.objective_id);
  }
  const misconceptions = Object.entries(misTally).sort((a, b) => b[1].n - a[1].n).slice(0, 8);

  const rapid = attempts.filter((a) => a.rapid).length;
  const recent = attempts.slice(0, 60);
  const recentAcc = recent.length
    ? Math.round((recent.filter((a) => a.is_correct).length / recent.length) * 100)
    : 0;

  // Rising speed with falling accuracy is the tell that she is racing to finish
  // rather than trying to be right. Treat it as a stop signal, not a metric.
  const half = Math.floor(recent.length / 2);
  const older = recent.slice(half);
  const newer = recent.slice(0, half);
  const meanMs = (xs: AttemptRow[]) =>
    xs.length ? xs.reduce((s, x) => s + (x.latency_ms ?? 0), 0) / xs.length : 0;
  const acc = (xs: AttemptRow[]) => (xs.length ? xs.filter((x) => x.is_correct).length / xs.length : 0);
  const racing =
    newer.length >= 12 && meanMs(newer) < meanMs(older) * 0.7 && acc(newer) < acc(older) - 0.12;

  const halted = Object.values(mastery).filter((m) => m.halted);

  return (
    <div className="wrap wide">
      <div className="top">
        <h1>Grown-ups</h1>
        <span className="who">
          {learners.length > 1 ? (
            <select
              value={selected.id}
              onChange={(e) => setSelected(learners.find((l) => l.id === e.target.value) ?? null)}
            >
              {learners.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.display_name}
                </option>
              ))}
            </select>
          ) : (
            selected.display_name
          )}{' '}
          <button className="btn quiet" onClick={onSignOut}>
            Sign out
          </button>
        </span>
      </div>

      {racing ? (
        <div className="card" style={{ borderLeft: '3px solid var(--red)' }}>
          <h2>Worth stopping for</h2>
          <p style={{ marginBottom: 0 }}>
            She is answering noticeably faster and getting noticeably less right. That usually means
            racing to finish rather than trying to be right. It is a signal to stop for a bit, not a
            thing to correct.
          </p>
        </div>
      ) : null}

      {halted.length ? (
        <div className="card" style={{ borderLeft: '3px solid var(--copper)' }}>
          <h2>Needs a conversation, not another quiz</h2>
          <ul>
            {halted.map((m) => (
              <li key={m.objective_id}>
                <b>{OBJ_BY_ID[m.objective_id]?.title}</b>
                {topMis(m) ? <> — she keeps choosing: {OBJ_BY_ID[m.objective_id]?.misconceptions[topMis(m)!]}</> : null}
              </li>
            ))}
          </ul>
          <button
            className="btn ghost"
            onClick={async () => {
              const db = supabase();
              for (const m of halted) {
                await db
                  .from('mastery')
                  .upsert({ ...m, halted: false, gate_fails: 0, rung: 0 });
              }
              void load(selected);
            }}
          >
            We have talked about it, unpark them
          </button>
        </div>
      ) : null}

      <div className="card">
        <div className="stat">
          <div>
            <span>On the wall</span>
            <b>{Object.values(mastery).filter((m) => m.status === 'gated' || m.status === 'retained').length}</b>
          </div>
          <div>
            <span>On this week&rsquo;s pace</span>
            <b>
              {pace.secure}/{pace.total}
            </b>
          </div>
          <div>
            <span>Last 60 answers</span>
            <b>{recentAcc}%</b>
          </div>
          <div>
            <span>Rapid taps</span>
            <b>{rapid}</b>
          </div>
        </div>
      </div>

      <h3>What keeps going wrong</h3>
      <div className="card tight">
        {misconceptions.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing has fired more than once yet.
          </p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>The error</th>
                  <th className="num">Times</th>
                  <th>Where</th>
                </tr>
              </thead>
              <tbody>
                {misconceptions.map(([id, v]) => {
                  const first = Array.from(v.where)[0];
                  const text = OBJ_BY_ID[first]?.misconceptions[id] ?? id;
                  return (
                    <tr key={id}>
                      <td>{text}</td>
                      <td className="num">{v.n}</td>
                      <td>
                        {Array.from(v.where)
                          .map((o) => OBJ_BY_ID[o]?.title ?? o)
                          .join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          The same error showing up across two or three different topics is the highest value signal
          in here. That is one conversation, not three.
        </p>
      </div>

      <h3>Where she is</h3>
      <div className="card tight">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Objective</th>
                <th>Week</th>
                <th>State</th>
                <th className="num">Belief</th>
                <th className="num">Right</th>
              </tr>
            </thead>
            <tbody>
              {OBJECTIVES.filter((o) => o.week <= selected.programme_week + 1).map((o) => {
                const m = mastery[o.id];
                const secure = m?.status === 'gated' || m?.status === 'retained';
                return (
                  <tr key={o.id}>
                    <td>{o.title}</td>
                    <td className="num">{o.week}</td>
                    <td>
                      {m?.halted ? (
                        <span className="pill bad">parked</span>
                      ) : secure ? (
                        <span className="pill ok">on the wall</span>
                      ) : m ? (
                        <span className="pill mid">
                          {['worked example', 'completion', 'on her own'][m.rung] ?? 'working'}
                        </span>
                      ) : (
                        <span className="pill">not met</span>
                      )}
                    </td>
                    <td className="num">{m ? Math.round(m.p_known * 100) + '%' : '—'}</td>
                    <td className="num">
                      {m ? `${m.correct_count}/${m.attempts_count}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {flags.length ? (
        <>
          <h3>She flagged these as wrong</h3>
          <div className="card tight">
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Our answer</th>
                    <th>What she said</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {flags.map((f) => (
                    <tr key={f.id}>
                      <td style={{ whiteSpace: 'pre-line' }}>{f.stem}</td>
                      <td>{f.expected}</td>
                      <td>{f.note}</td>
                      <td>
                        <button
                          className="btn quiet"
                          onClick={async () => {
                            await supabase().from('flags').update({ resolved: true }).eq('id', f.id);
                            void load(selected);
                          }}
                        >
                          Looked at it
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              Template id is in the database if you need to reproduce it. Being told she is wrong
              when she is right costs far more than a question she never sees.
            </p>
          </div>
        </>
      ) : null}

      <h3>The pace</h3>
      <div className="card">
        <p className="muted">
          Mastery gates the ordering and the repetition. This gates overall progress, because the
          evidence on mastery learning turns negative when it is purely self-paced. Move it on when
          the week is done, whether or not everything is on the wall.
        </p>
        <div className="row">
          <label className="field" style={{ marginBottom: 0, width: 120 }}>
            <span className="lbl">Programme week</span>
            <input
              type="number"
              min={1}
              max={40}
              value={week}
              onChange={(e) => setWeek(parseInt(e.target.value || '1', 10))}
            />
          </label>
          <button
            className="btn ghost"
            onClick={async () => {
              await supabase().from('profiles').update({ programme_week: week }).eq('id', selected.id);
              setSelected({ ...selected, programme_week: week });
              setMsg('Pace updated.');
            }}
          >
            Set
          </button>
          <span className="muted">{msg}</span>
        </div>
      </div>
    </div>
  );
}

function topMis(m: MasteryRow): string | null {
  const entries = Object.entries(m.misconceptions ?? {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
