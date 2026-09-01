'use client';

// Murphy's board — sticker-book redesign.
//
// Same rules as before, nothing loosened:
//   - five sessions carry the week, flat. Nothing is scaled to how well she did
//   - piano and Rock Stars are tickable but earn nothing. They are a habit
//   - the run of past weeks only ever grows. Nothing already earned comes off
//   - no streak, no score, no total, no comparison to anyone
//   - the week rolls over on its own every Monday. Nothing to reset
//
// All presentation is inline or in the one <style> block below, so this file
// drops in without touching globals.css.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SESSIONS = [
  { day: 'Mon', when: 'after school', what: 'CENTURY' },
  { day: 'Tue', when: 'after piano', what: 'CENTURY' },
  { day: 'Wed', when: 'after school', what: 'CENTURY' },
  { day: 'Sat', when: 'or Sunday', what: 'CENTURY' },
  { day: 'Sun', when: 'with Dad', what: 'Money and thinking' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FIVE = [false, false, false, false, false];

// Pastels in rainbow order, one per session.
const HUES = ['#ffc4bb', '#ffd9b3', '#fff2ad', '#cfeabb', '#bfd8f5'];
const PIANO_ON = '#bfe6f5';
const TTRS_ON = '#ffc4bb';

const INK = '#17150f';
const PAPER = '#fdf6e8';
const MUTED = '#8a7f6b';

const LINES = [
  'Blank week. Nice and quiet.',
  'One down. That was the hard one.',
  'Two ticks. Halfway is close.',
  'Three! Do not stop now.',
  'One more and the print is yours.',
  'All five. That is a print.',
];

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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;800&display=swap');
.mb-page { min-height: 100vh; background: #efe7d6; padding: 64px 20px 96px; }
.mb-page * { box-sizing: border-box; }
.mb-btn { -webkit-tap-highlight-color: transparent; }
.mb-card { transition: transform .15s ease, box-shadow .15s ease, background .2s ease; }
.mb-card:hover { transform: translate(-1px, -2px); }
.mb-card:active { transform: translate(2px, 2px); }
@keyframes mb-pop { 0% { transform: scale(.4); opacity: 0 } 60% { transform: scale(1.25) } 100% { transform: scale(1); opacity: 1 } }
@keyframes mb-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
.mb-tick { animation: mb-pop .35s cubic-bezier(.2,1.4,.4,1) both; }
.mb-bob { animation: mb-bob 3.4s ease-in-out infinite; }
.mb-bob-slow { animation: mb-bob 4s ease-in-out infinite; }
.mb-bob-slower { animation: mb-bob 5.2s ease-in-out infinite; }
`;

function Tick({ size = 34, stroke = INK }: { size?: number; stroke?: string }) {
  return (
    <svg className="mb-tick" width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute' }}>
      <path d="M4 12.5l5 5L20 6" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Board() {
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [thisWeek, setThisWeek] = useState<string>(() => mondayOf(new Date()));
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  // If the tab is left open across midnight, or she comes back on Monday,
  // roll the week over without anybody reloading anything.
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

  if (loading) {
    return (
      <div className="mb-page">
        <style>{CSS}</style>
        <p style={{ fontFamily: 'Nunito, sans-serif', color: MUTED, textAlign: 'center' }}>One moment…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mb-page">
        <style>{CSS}</style>
        <div style={shell}>
          <p style={kicker}>Nothing to show</p>
          <h2 style={{ ...title, fontSize: 30 }}>This link is missing its key</h2>
          <p style={{ margin: '10px 0 0', fontFamily: 'Nunito, sans-serif', fontSize: 15, color: MUTED }}>
            Use the full link, the one ending in a long code. Ask Dad.
          </p>
        </div>
      </div>
    );
  }

  const earnedWeeks = rows.filter((r) => r.sessions.filter(Boolean).length === 5);

  return (
    <div className="mb-page">
      <style>{CSS}</style>
      <div style={shell}>
        {/* capybaras, peeking */}
        <div className="mb-bob-slow" style={{ position: 'absolute', top: -46, right: 30 }} aria-hidden="true">
          <svg width="86" height="52" viewBox="0 0 86 52">
            <ellipse cx="20" cy="14" rx="8" ry="7" fill="#a9805c" stroke={INK} strokeWidth="3" />
            <ellipse cx="66" cy="14" rx="8" ry="7" fill="#a9805c" stroke={INK} strokeWidth="3" />
            <rect x="6" y="10" width="74" height="46" rx="24" fill="#c19a72" stroke={INK} strokeWidth="3" />
            <circle cx="30" cy="31" r="4" fill={INK} />
            <circle cx="56" cy="31" r="4" fill={INK} />
            <ellipse cx="43" cy="43" rx="11" ry="7" fill="#8a6647" />
            <circle cx="38" cy="42" r="2" fill={INK} />
            <circle cx="48" cy="42" r="2" fill={INK} />
          </svg>
        </div>
        <div className="mb-bob-slower" style={{ position: 'absolute', left: -30, bottom: 96 }} aria-hidden="true">
          <svg width="64" height="40" viewBox="0 0 64 40">
            <ellipse cx="16" cy="11" rx="6.5" ry="5.5" fill="#a9805c" stroke={INK} strokeWidth="3" />
            <ellipse cx="48" cy="11" rx="6.5" ry="5.5" fill="#a9805c" stroke={INK} strokeWidth="3" />
            <rect x="5" y="8" width="54" height="34" rx="18" fill="#c19a72" stroke={INK} strokeWidth="3" />
            <circle cx="23" cy="24" r="3.2" fill={INK} />
            <circle cx="41" cy="24" r="3.2" fill={INK} />
            <ellipse cx="32" cy="34" rx="8.5" ry="5" fill="#8a6647" />
            <circle cx="28" cy="33" r="1.6" fill={INK} />
            <circle cx="36" cy="33" r="1.6" fill={INK} />
          </svg>
        </div>

        <header style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className="mb-bob" style={{ flex: 'none' }} aria-hidden="true">
            <svg width="62" height="62" viewBox="0 0 62 62">
              <circle cx="31" cy="31" r="27" fill="#ffd8a8" stroke={INK} strokeWidth="3" />
              <circle cx="22" cy="26" r="4" fill={INK} />
              <circle cx="40" cy="26" r="4" fill={INK} />
              <path d="M22 37 q9 6 18 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <circle cx="15" cy="36" r="3.4" fill="#ffb3b3" />
              <circle cx="47" cy="36" r="3.4" fill="#ffb3b3" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={kicker}>
              {pretty(thisWeek)} to {pretty(thisWeek, 6)}
            </p>
            <h1 style={title}>
              Here we go,
              <br />
              Murph
            </h1>
          </div>
        </header>

        {error ? (
          <div
            style={{
              margin: '18px 0 0',
              padding: '12px 14px',
              border: `3px solid ${INK}`,
              borderRadius: 16,
              background: '#ffd9d9',
              fontFamily: 'Nunito, sans-serif',
              fontSize: 14,
            }}
          >
            <b style={{ display: 'block' }}>That tick did not save.</b>
            <span style={{ color: '#6b4a4a' }}>{error}</span>
          </div>
        ) : null}

        <p
          style={{
            margin: '16px 0 8px',
            fontFamily: "'Baloo 2', cursive",
            fontSize: 19,
            fontWeight: 700,
            color: '#2b2118',
          }}
        >
          {LINES[done]}
        </p>

        <div
          style={{
            height: 20,
            border: `3px solid ${INK}`,
            borderRadius: 999,
            background: '#fff',
            overflow: 'hidden',
            marginBottom: 4,
          }}
          aria-label={`${done} of 5 done`}
        >
          <div
            style={{
              height: '100%',
              width: `${(done / 5) * 100}%`,
              background: '#cfeabb',
              borderRadius: 999,
              transition: 'width .45s cubic-bezier(.2,.9,.3,1)',
            }}
          />
        </div>
        <p style={{ margin: '0 0 20px', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700, color: MUTED }}>
          {full ? 'It stays yours whatever happens next.' : `${5 - done} to go. Five fills the week and earns a 3D print.`}
          {note ? <span style={{ marginLeft: 8, color: '#a1927a' }}>{note}</span> : null}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SESSIONS.map((s, i) => {
            const on = !!current?.sessions[i];
            return (
              <button
                key={i}
                className="mb-btn mb-card"
                aria-pressed={on}
                onClick={() => toggle('sessions', i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '12px 14px',
                  border: `3px solid ${INK}`,
                  borderRadius: 18,
                  fontFamily: 'Nunito, sans-serif',
                  background: on ? HUES[i] : '#fffdf6',
                  boxShadow: on ? `4px 4px 0 ${INK}` : `0 0 0 ${INK}`,
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    flex: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 46,
                    height: 46,
                    border: `3px solid ${INK}`,
                    borderRadius: 14,
                    background: '#fff',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Baloo 2', cursive",
                      fontSize: 15,
                      fontWeight: 800,
                      color: INK,
                      opacity: on ? 0 : 1,
                    }}
                  >
                    {s.day}
                  </span>
                  {on ? <Tick /> : null}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: MUTED,
                    }}
                  >
                    {s.when}
                  </span>
                  <span style={{ fontFamily: "'Baloo 2', cursive", fontSize: 21, fontWeight: 700, color: INK }}>
                    {s.what}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <section style={{ marginTop: 24, paddingTop: 20, borderTop: '3px dashed #e0d3b8' }}>
          <h2 style={{ margin: '0 0 2px', fontFamily: "'Baloo 2', cursive", fontSize: 22, fontWeight: 700, color: INK }}>
            Mornings
          </h2>
          <p style={{ margin: '0 0 12px', fontFamily: 'Nunito, sans-serif', fontSize: 13, color: MUTED }}>
            No print for these. Tick them anyway.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '78px repeat(5, 1fr)', gap: 7, alignItems: 'center' }}>
            <span style={rowLabel}>Piano</span>
            {DAYS.map((d, i) => (
              <button
                key={`p${d}`}
                className="mb-btn"
                aria-pressed={!!current?.piano[i]}
                aria-label={`Piano, ${d}`}
                onClick={() => toggle('piano', i)}
                style={{ ...pill, background: current?.piano[i] ? PIANO_ON : '#fff', outline: i === todayIdx ? `2px solid ${INK}` : 'none', outlineOffset: 2 }}
              >
                {d}
              </button>
            ))}
            <span style={rowLabel}>Rock Stars</span>
            {DAYS.map((d, i) => (
              <button
                key={`t${d}`}
                className="mb-btn"
                aria-pressed={!!current?.ttrs[i]}
                aria-label={`Times Tables Rock Stars, ${d}`}
                onClick={() => toggle('ttrs', i)}
                style={{ ...pill, background: current?.ttrs[i] ? TTRS_ON : '#fff', outline: i === todayIdx ? `2px solid ${INK}` : 'none', outlineOffset: 2 }}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 22,
            padding: '14px 16px',
            border: `3px solid ${INK}`,
            borderRadius: 18,
            background: '#fff',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontFamily: "'Baloo 2', cursive", fontSize: 18, fontWeight: 700, color: INK }}>
            Prints earned: {earnedWeeks.length}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rows.map((r) => {
              const c = r.sessions.filter(Boolean).length === 5;
              const now = r.week_start === thisWeek;
              return (
                <span
                  key={r.week_start}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: 12,
                    fontWeight: 800,
                    background: c ? '#cfeabb' : '#f4ecd8',
                    border: c ? `2px solid ${INK}` : '2px dashed #b8a985',
                    color: c ? INK : MUTED,
                  }}
                >
                  {now ? 'this week' : pretty(r.week_start)}
                </span>
              );
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontFamily: 'Nunito, sans-serif', fontSize: 13, color: MUTED }}>
            Nothing here ever comes off.
          </p>
        </section>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  position: 'relative',
  maxWidth: 460,
  margin: '0 auto',
  background: PAPER,
  border: `3px solid ${INK}`,
  borderRadius: 26,
  padding: '26px 24px 28px',
  boxShadow: '8px 8px 0 rgba(23,21,15,.14)',
  color: '#2b2118',
};

const kicker: React.CSSProperties = {
  margin: '0 0 2px',
  fontFamily: 'Nunito, sans-serif',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: '#a1927a',
};

const title: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Baloo 2', cursive",
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 800,
  color: INK,
};

const rowLabel: React.CSSProperties = {
  fontFamily: 'Nunito, sans-serif',
  fontSize: 13,
  fontWeight: 800,
  color: '#2b2118',
};

const pill: React.CSSProperties = {
  cursor: 'pointer',
  padding: '9px 0',
  border: `3px solid ${INK}`,
  borderRadius: 12,
  fontFamily: 'Nunito, sans-serif',
  fontSize: 12,
  fontWeight: 800,
  color: INK,
  transition: 'background .2s ease',
};
