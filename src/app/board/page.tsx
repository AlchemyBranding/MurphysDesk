'use client';

// Murphy's board.
//
// A link she opens each morning. No login, because she does not have one and
// should not need one. The secret is the ?k= token in the URL: anyone holding
// the link can tick the board, which is the correct trade-off for a tick sheet
// on a family fridge and the wrong one for anything else. Nothing personal is
// stored here beyond a handful of booleans a week.
//
// The rules this page enforces, all of them deliberate:
//   - five sessions carry the week, flat. Nothing is scaled to how well she did
//   - piano and Rock Stars are tickable but earn nothing. They are a habit
//   - the run of past weeks only ever grows. Nothing already earned comes off
//   - no streak, no score, no total, no comparison to anyone
//   - the week rolls over on its own every Monday. Nothing to reset

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SESSIONS = [
  { day: 'Mon', when: 'after school', what: 'CENTURY', hue: 'a' },
  { day: 'Tue', when: 'after piano', what: 'CENTURY', hue: 'b' },
  { day: 'Wed', when: 'after school', what: 'CENTURY', hue: 'c' },
  { day: 'Sat', when: 'or Sunday', what: 'CENTURY', hue: 'd' },
  { day: 'Sun', when: 'with Dad', what: 'Money and thinking', hue: 'e' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FIVE = [false, false, false, false, false];

type Strand = 'sessions' | 'piano' | 'ttrs';

interface WeekRow {
  week_start: string;
  sessions: boolean[];
  piano: boolean[];
  ttrs: boolean[];
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
function blank(week: string): WeekRow {
  return { week_start: week, sessions: [...FIVE], piano: [...FIVE], ttrs: [...FIVE] };
}

const HELLOS = [
  'Right then.',
  'Morning.',
  'Here we go.',
  'What is left?',
  'Good to see you.',
];

export default function Board() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [thisWeek, setThisWeek] = useState<string>(() => mondayOf(new Date()));
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hello = useMemo(() => HELLOS[new Date().getDay() % HELLOS.length], []);
  const todayIdx = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  const load = useCallback(async (k: string, week: string) => {
    const { data, error: e } = await supabase()
      .from('board')
      .select('week_start, sessions, piano, ttrs')
      .eq('token', k)
      .order('week_start');
    if (e) {
      setError(e.message);
      return;
    }
    const list: WeekRow[] = (data ?? []).map((r) => ({
      week_start: r.week_start as string,
      sessions: five(r.sessions),
      piano: five(r.piano),
      ttrs: five(r.ttrs),
    }));
    if (!list.some((r) => r.week_start === week)) list.push(blank(week));
    setError(null);
    setRows(list);
  }, []);

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('k');
    setToken(k);
    if (!k) {
      setLoading(false);
      return;
    }
    void load(k, thisWeek).then(() => setLoading(false));
  }, [load, thisWeek]);

  // Automation: if the tab is left open across midnight, or she comes back to
  // it on Monday, roll the week over without anybody reloading anything.
  useEffect(() => {
    function check() {
      const now = mondayOf(new Date());
      if (now !== thisWeek) {
        setThisWeek(now);
        setRows((prev) => (prev.some((r) => r.week_start === now) ? prev : [...prev, blank(now)]));
      }
    }
    const id = window.setInterval(check, 60000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [thisWeek]);

  const current = rows.find((r) => r.week_start === thisWeek);
  const done = current ? current.sessions.filter(Boolean).length : 0;
  const full = done === 5;

  const save = useCallback(
    async (row: WeekRow) => {
      if (!token) return;
      setNote('saving');
      const { error: e } = await supabase()
        .from('board')
        .upsert(
          {
            token,
            week_start: row.week_start,
            sessions: row.sessions,
            piano: row.piano,
            ttrs: row.ttrs,
          },
          { onConflict: 'token,week_start' }
        );
      if (e) {
        setNote('');
        setError(e.message);
      } else {
        setError(null);
        setNote('saved');
        window.setTimeout(() => setNote(''), 1500);
      }
    },
    [token]
  );

  function toggle(kind: Strand, i: number) {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.week_start !== thisWeek) return r;
        const copy: WeekRow = {
          ...r,
          sessions: [...r.sessions],
          piano: [...r.piano],
          ttrs: [...r.ttrs],
        };
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

  const earnedWeeks = rows.filter((r) => r.sessions.filter(Boolean).length === 5);

  return (
    <div className="bp">
      <div className="bwrap">
        <header className="bhead">
          <p className="bkicker">{pretty(thisWeek)} to {pretty(thisWeek, 6)}</p>
          <h1>
            {hello}
            <br />
            <span>Murphy&rsquo;s week</span>
          </h1>
          <div className="bpips" aria-label={`${done} of 5 done`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={i < done ? 'on' : ''} />
            ))}
          </div>
        </header>

        {error ? (
          <div className="berr">
            <b>That tick did not save.</b>
            <span>{error}</span>
          </div>
        ) : null}

        <div className="bcards">
          {SESSIONS.map((s, i) => {
            const on = !!current?.sessions[i];
            return (
              <button
                key={i}
                className={`bcard h-${s.hue}${on ? ' on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle('sessions', i)}
              >
                <span className="bring" aria-hidden="true">
                  <span className="bringday">{s.day}</span>
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="btext">
                  <span className="bwhen">{s.when}</span>
                  <span className="bwhat">{s.what}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className={`bbig${full ? ' full' : ''}`}>
          {full ? (
            <>
              <strong>All five. That is a print.</strong>
              <span>It stays yours whatever happens next.</span>
            </>
          ) : (
            <>
              <strong>{5 - done} to go</strong>
              <span>Five fills the week and earns a print.</span>
            </>
          )}
          <span className="bsave">{note}</span>
        </div>

        <section className="bhabits">
          <h2>Mornings</h2>
          <p>These do not count towards the print. Tick them anyway.</p>
          <div className="bgrid">
            <span className="brow-label">Piano</span>
            {DAYS.map((d, i) => (
              <button
                key={`p${d}`}
                className={`bpill piano${current?.piano[i] ? ' on' : ''}${i === todayIdx ? ' today' : ''}`}
                aria-pressed={!!current?.piano[i]}
                aria-label={`Piano, ${d}`}
                onClick={() => toggle('piano', i)}
              >
                {d}
              </button>
            ))}
            <span className="brow-label">Rock Stars</span>
            {DAYS.map((d, i) => (
              <button
                key={`t${d}`}
                className={`bpill ttrs${current?.ttrs[i] ? ' on' : ''}${i === todayIdx ? ' today' : ''}`}
                aria-pressed={!!current?.ttrs[i]}
                aria-label={`Times Tables Rock Stars, ${d}`}
                onClick={() => toggle('ttrs', i)}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section className="bhabits">
          <h2>Prints earned: {earnedWeeks.length}</h2>
          <p>Nothing here ever comes off.</p>
          <div className="btokens">
            {rows.map((r) => {
              const c = r.sessions.filter(Boolean).length === 5;
              return (
                <span
                  key={r.week_start}
                  className={`btok${c ? ' on' : ''}${r.week_start === thisWeek ? ' now' : ''}`}
                >
                  {pretty(r.week_start)}
                </span>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
