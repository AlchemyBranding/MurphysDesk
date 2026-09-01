'use client';

// Murphy's board.
//
// A link she opens each morning. No login, because she does not have one and
// should not need one. The secret is the ?k= token in the URL: anyone holding
// the link can tick the board, which is the correct trade-off for a tick sheet
// on a family fridge and the wrong one for anything else. Nothing personal is
// stored here beyond ten booleans a week.
//
// The rules this page enforces, all of them deliberate:
//   - five sessions carry the week, flat. Nothing is scaled to how well she did
//   - the mornings are shown because they happen, not because they earn anything
//   - the run of past weeks only ever grows. Nothing already earned comes off
//   - no streak, no score, no total, no comparison to anyone

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SESSIONS = [
  { day: 'Monday', when: 'after school', what: 'CENTURY' },
  { day: 'Tuesday', when: 'after piano', what: 'CENTURY' },
  { day: 'Wednesday', when: 'after school', what: 'CENTURY' },
  { day: 'Weekend', when: 'your pick of day', what: 'CENTURY' },
  { day: 'Weekend', when: 'the other day', what: 'Money and thinking' },
];
const MORNINGS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FIVE = [false, false, false, false, false];

interface WeekRow {
  week_start: string;
  sessions: boolean[];
  mornings: boolean[];
}

function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pretty(isoDate: string, addDays = 0): string {
  const p = isoDate.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2] + addDays);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function five(v: unknown): boolean[] {
  return Array.isArray(v) && v.length === 5 ? v.map(Boolean) : [...FIVE];
}

export default function Board() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const thisWeek = useMemo(() => mondayOf(new Date()), []);

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('k');
    setToken(k);
    if (!k) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error: e } = await supabase()
        .from('board')
        .select('week_start, sessions, mornings')
        .eq('token', k)
        .order('week_start');
      if (e) {
        setError(e.message);
      } else {
        const list: WeekRow[] = (data ?? []).map((r) => ({
          week_start: r.week_start as string,
          sessions: five(r.sessions),
          mornings: five(r.mornings),
        }));
        if (!list.some((r) => r.week_start === thisWeek)) {
          list.push({ week_start: thisWeek, sessions: [...FIVE], mornings: [...FIVE] });
        }
        setRows(list);
      }
      setLoading(false);
    })();
  }, [thisWeek]);

  const current = rows.find((r) => r.week_start === thisWeek);

  const save = useCallback(
    async (row: WeekRow) => {
      if (!token) return;
      setNote('saving');
      const { error: e } = await supabase()
        .from('board')
        .upsert(
          { token, week_start: row.week_start, sessions: row.sessions, mornings: row.mornings },
          { onConflict: 'token,week_start' }
        );
      if (e) {
        setNote('');
        setError(e.message);
      } else {
        setError(null);
        setNote('saved');
        setTimeout(() => setNote(''), 1600);
      }
    },
    [token]
  );

  function toggle(kind: 'sessions' | 'mornings', i: number) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.week_start !== thisWeek) return r;
        const copy = { ...r, sessions: [...r.sessions], mornings: [...r.mornings] };
        copy[kind][i] = !copy[kind][i];
        return copy;
      });
      const row = next.find((r) => r.week_start === thisWeek);
      if (row) void save(row);
      return next;
    });
  }

  if (loading) return <p className="muted" style={{ padding: 40 }}>One moment…</p>;

  if (!token) {
    return (
      <div className="wrap">
        <div className="card" style={{ marginTop: 60 }}>
          <span className="lbl">Nothing to show</span>
          <h2>This link is missing its key</h2>
          <p className="muted">Use the full link, the one ending in a long code. Ask Dad.</p>
        </div>
      </div>
    );
  }

  const done = current ? current.sessions.filter(Boolean).length : 0;
  const full = done === 5;
  const earned = rows.filter((r) => r.sessions.filter(Boolean).length === 5).length;

  return (
    <div className="wrap">
      <div className="boardhead">
        <span className="lbl">
          Week of {pretty(thisWeek)} to {pretty(thisWeek, 6)}
        </span>
        <h1>Murphy&rsquo;s board</h1>
      </div>

      {error ? (
        <div className="card tight" style={{ borderLeft: '3px solid var(--red)' }}>
          <b>That tick did not save.</b>
          <p className="muted" style={{ margin: '4px 0 0' }}>{error}</p>
        </div>
      ) : null}

      <div className="bticks">
        {SESSIONS.map((s, i) => (
          <button
            key={i}
            className="btick"
            aria-pressed={current?.sessions[i] ? 'true' : 'false'}
            onClick={() => toggle('sessions', i)}
          >
            <span className="bbox" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="blabel">
              <span className="bday">
                {s.day}, {s.when}
              </span>
              <span className="bwhat">{s.what}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={`bstatus${full ? ' full' : ''}`}>
        {full ? (
          <>
            <b>That is the week. Print earned.</b>
            <span className="muted">It stays earned whatever happens next.</span>
          </>
        ) : (
          <>
            <b>{done} of 5</b>
            <span className="muted">All five and the week earns a print.</span>
          </>
        )}
        <span className="bsave">{note}</span>
      </div>

      <div className="bsection">
        <span className="lbl">Mornings, not counted</span>
        <div className="bmorn">
          {MORNINGS.map((d, i) => (
            <button
              key={d}
              className="bm"
              aria-pressed={current?.mornings[i] ? 'true' : 'false'}
              onClick={() => toggle('mornings', i)}
            >
              <span className="bmd">{d}</span>
              <span className="bmdot" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div className="bsection">
        <span className="lbl">Prints earned: {earned}</span>
        <div className="brun">
          {rows.map((r) => {
            const c = r.sessions.filter(Boolean).length === 5;
            return (
              <div
                key={r.week_start}
                className={`bcell${c ? ' on' : ''}${r.week_start === thisWeek ? ' now' : ''}`}
                title={pretty(r.week_start)}
              >
                {pretty(r.week_start)}
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>
          Nothing here ever comes off.
        </p>
      </div>
    </div>
  );
}
