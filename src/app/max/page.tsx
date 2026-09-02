'use client';

// MAX'S BOARD — battle-pass redesign.
// File: src/app/board/page.tsx   (route: /board?k=<max's token>)
// Needs: public/board/max-hero.png
//
// Same rules as Murph's board, nothing loosened:
//   - five challenges carry the week, flat. Nothing is scaled to how well he did
//   - piano and Rock Stars are tickable but earn nothing. They are a habit
//   - the run of past weeks only ever grows. Nothing already earned comes off
//   - no streak, no score, no total, no comparison to anyone
//   - the week rolls over on its own every Monday. Nothing to reset
//
// Reads the same `board` table as Murph's, keyed by his own token, so the two
// boards can live side by side on one deploy with different links.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SESSIONS = [
  { day: 'Mon', when: 'after school', what: 'CENTURY', rarityName: 'Rare', rarity: '#4ea8ff' },
  { day: 'Tue', when: 'after piano', what: 'CENTURY', rarityName: 'Rare', rarity: '#4ee2ff' },
  { day: 'Wed', when: 'after school', what: 'CENTURY', rarityName: 'Epic', rarity: '#a97bff' },
  { day: 'Sat', when: 'or Sunday', what: 'CENTURY', rarityName: 'Epic', rarity: '#d264ff' },
  { day: 'Sun', when: 'with Dad or Mum', what: 'Money and thinking', rarityName: 'Legendary', rarity: '#ffa63d' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FIVE = [false, false, false, false, false];

const XP = '#c8ff3d';
const CYAN = '#4ee2ff';
const VIOLET = '#a97bff';
const NAVY = '#0a0b1e';
const PANEL = 'rgba(26,26,82,.75)';
const EDGE = '#33337a';
const DIM = '#9c9cdb';

const LINES = ['DROP IN', 'FIRST WIN', 'ON A RUN', 'THREE DOWN', 'ONE TO GO', 'PRINT UNLOCKED'];
const SUBS = [
  'Five challenges this week. Finish all five and a 3D print is yours.',
  'Four left. Keep the streak alive.',
  'Three left. You are over the hump soon.',
  'Two left. This is the easy part now.',
  'One challenge between you and a 3D print.',
  'All five done. The print is banked.',
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
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,700&family=Archivo+Black&display=swap');
.xb-page { min-height: 100vh; padding: 44px 20px 72px; background: radial-gradient(120% 80% at 50% 0%, #241a5c 0%, #12123a 46%, #0a0b1e 100%); }
.xb-page * { box-sizing: border-box; }
.xb-btn { -webkit-tap-highlight-color: transparent; }
.xb-card { transition: transform .14s ease, background .25s ease, box-shadow .25s ease; }
.xb-card:hover { transform: translateX(4px); }
.xb-card:active { transform: scale(.985); }
@keyframes xb-pop { 0% { transform: scale(.3) rotate(-12deg); opacity: 0 } 60% { transform: scale(1.3) rotate(4deg) } 100% { transform: scale(1) rotate(0); opacity: 1 } }
@keyframes xb-sheen { 0% { transform: translateX(-120%) } 100% { transform: translateX(320%) } }
.xb-tick { animation: xb-pop .34s cubic-bezier(.2,1.5,.4,1) both; }
.xb-sheen { animation: xb-sheen 2.4s linear infinite; }
`;

const HEX = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';
const SLANT = 'polygon(7px 0, 100% 0, calc(100% - 7px) 100%, 0 100%)';

function Tick() {
  return (
    <svg className="xb-tick" width="30" height="30" viewBox="0 0 24 24" style={{ position: 'absolute' }}>
      <path d="M4 12.5l5 5L20 6" fill="none" stroke={NAVY} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
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
      <div className="xb-page">
        <style>{CSS}</style>
        <p style={{ fontFamily: "'Chakra Petch', sans-serif", color: DIM, textAlign: 'center' }}>Loading…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="xb-page">
        <style>{CSS}</style>
        <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px 22px', border: `2px solid ${EDGE}`, borderRadius: 6, background: PANEL }}>
          <p style={kicker}>No key</p>
          <h1 style={{ ...heading, fontSize: 30 }}>THIS LINK IS MISSING ITS KEY</h1>
          <p style={{ margin: '10px 0 0', fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, color: DIM }}>
            Use the full link, the one ending in a long code. Ask Dad.
          </p>
        </div>
      </div>
    );
  }

  const earnedWeeks = rows.filter((r) => r.sessions.filter(Boolean).length === 5);

  return (
    <div className="xb-page">
      <style>{CSS}</style>
      <div style={{ width: '100%', maxWidth: 540, margin: '0 auto', fontFamily: "'Chakra Petch', sans-serif" }}>
        {/* hero */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: 420,
            marginBottom: 20,
            border: `2px solid #3a3a86`,
            borderRadius: 6,
            background: '#12123a',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/board/max-hero.png"
            alt="Max"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 16%' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(10,11,30,.55) 0%, rgba(10,11,30,0) 32%, rgba(10,11,30,.72) 72%, #0d0e26 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(78,226,255,.14), transparent 45%, rgba(169,123,255,.16))',
            }}
          />
          <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <p
              style={{
                margin: 0,
                padding: '5px 10px',
                border: '2px solid rgba(78,226,255,.5)',
                borderRadius: 3,
                background: 'rgba(10,11,30,.62)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.24em',
                textTransform: 'uppercase',
                color: '#9de9ff',
              }}
            >
              Week {pretty(thisWeek)} &ndash; {pretty(thisWeek, 6)}
            </p>
            <div
              style={{
                flex: 'none',
                textAlign: 'center',
                padding: '7px 13px',
                border: `2px solid ${CYAN}`,
                borderRadius: 4,
                background: 'rgba(10,11,30,.72)',
                boxShadow: '0 0 18px rgba(78,226,255,.3)',
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: '#7f7fd0' }}>TIER</p>
              <p style={{ margin: 0, fontFamily: "'Archivo Black', sans-serif", fontSize: 24, lineHeight: 1, color: XP }}>{done + 1}</p>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={heading}>MAX&rsquo;S WEEK</h1>
            <span
              style={{
                flex: 'none',
                padding: '4px 9px',
                borderRadius: 3,
                background: '#ffa63d',
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 11,
                letterSpacing: '.1em',
                color: '#2a1400',
              }}
            >
              LEGENDARY
            </span>
          </div>
        </div>

        {error ? (
          <div
            style={{
              margin: '0 0 18px',
              padding: '12px 14px',
              border: '2px solid #ff5c7a',
              borderRadius: 5,
              background: 'rgba(255,92,122,.12)',
              fontSize: 14,
              color: '#ffd0da',
            }}
          >
            <b style={{ display: 'block' }}>That tick did not save.</b>
            <span style={{ color: '#ff9db0' }}>{error}</span>
          </div>
        ) : null}

        {/* progress */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '18px 20px 20px',
            border: '2px solid #3a3a86',
            borderRadius: 6,
            background: 'linear-gradient(180deg, rgba(58,58,134,.32), rgba(10,11,30,.5))',
            marginBottom: 26,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontStyle: 'italic', fontSize: 19, color: '#fff' }}>
              {LINES[done]}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: CYAN }}>
              {done} / 5{note ? <span style={{ marginLeft: 8, color: '#7f7fd0' }}>{note}</span> : null}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, height: 18, marginBottom: 12 }} aria-label={`${done} of 5 done`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  clipPath: SLANT,
                  transition: 'background .3s ease, box-shadow .3s ease',
                  background: i < done ? XP : '#26265e',
                  boxShadow: i < done ? '0 0 14px rgba(200,255,61,.65)' : 'none',
                }}
              />
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: DIM }}>{SUBS[done]}</p>
          {full ? (
            <div
              className="xb-sheen"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background: 'linear-gradient(90deg, transparent, rgba(200,255,61,.22), transparent)',
              }}
            />
          ) : null}
        </div>

        <p style={kicker}>Weekly challenges</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SESSIONS.map((s, i) => {
            const on = !!current?.sessions[i];
            return (
              <button
                key={i}
                className="xb-btn xb-card"
                aria-pressed={on}
                onClick={() => toggle('sessions', i)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '14px 18px',
                  borderRadius: 5,
                  border: `2px solid ${on ? XP : EDGE}`,
                  fontFamily: "'Chakra Petch', sans-serif",
                  background: on ? 'rgba(200,255,61,.1)' : PANEL,
                  boxShadow: on ? '0 0 20px rgba(200,255,61,.22)' : 'none',
                }}
              >
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: s.rarity }} />
                <span
                  style={{
                    position: 'relative',
                    flex: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    clipPath: HEX,
                    background: on ? XP : 'rgba(255,255,255,.07)',
                  }}
                >
                  <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: s.rarity, opacity: on ? 0 : 1 }}>
                    {s.day}
                  </span>
                  {on ? <Tick /> : null}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: s.rarity }}>
                    {s.rarityName} &middot; {s.when}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontStyle: 'italic',
                      fontSize: 21,
                      letterSpacing: '-.01em',
                      color: '#fff',
                    }}
                  >
                    {s.what}
                  </span>
                </span>
                <span style={{ flex: 'none', fontSize: 13, fontWeight: 700, letterSpacing: '.1em', color: on ? XP : '#6f6fb8' }}>
                  {on ? 'CLAIMED' : '+1 TIER'}
                </span>
              </button>
            );
          })}
        </div>

        <section style={{ marginTop: 30, paddingTop: 22, borderTop: '2px solid #2a2a60' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontFamily: "'Archivo Black', sans-serif", fontStyle: 'italic', fontSize: 20, color: '#fff' }}>
              DAILY QUESTS
            </h2>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7f7fd0' }}>no XP &mdash; still worth doing</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '96px repeat(5, 1fr)', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: CYAN }}>PIANO</span>
            {DAYS.map((d, i) => {
              const on = !!current?.piano[i];
              return (
                <button
                  key={`p${d}`}
                  className="xb-btn"
                  aria-pressed={on}
                  aria-label={`Piano, ${d}`}
                  onClick={() => toggle('piano', i)}
                  style={{
                    ...quest,
                    background: on ? CYAN : 'transparent',
                    border: `2px solid ${on ? CYAN : '#2f2f70'}`,
                    color: on ? NAVY : '#8686c8',
                    outline: i === todayIdx ? `2px solid ${XP}` : 'none',
                    outlineOffset: 2,
                  }}
                >
                  {d}
                </button>
              );
            })}
            <span style={{ fontSize: 13, fontWeight: 700, color: VIOLET }}>ROCK STARS</span>
            {DAYS.map((d, i) => {
              const on = !!current?.ttrs[i];
              return (
                <button
                  key={`t${d}`}
                  className="xb-btn"
                  aria-pressed={on}
                  aria-label={`Times Tables Rock Stars, ${d}`}
                  onClick={() => toggle('ttrs', i)}
                  style={{
                    ...quest,
                    background: on ? VIOLET : 'transparent',
                    border: `2px solid ${on ? VIOLET : '#2f2f70'}`,
                    color: on ? NAVY : '#8686c8',
                    outline: i === todayIdx ? `2px solid ${XP}` : 'none',
                    outlineOffset: 2,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            marginTop: 30,
            padding: '18px 20px',
            border: '2px solid #3a3a86',
            borderRadius: 6,
            background: 'rgba(10,11,30,.55)',
          }}
        >
          <h2 style={{ margin: 0, fontFamily: "'Archivo Black', sans-serif", fontStyle: 'italic', fontSize: 19, color: XP }}>
            {earnedWeeks.length} PRINTS BANKED
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {rows.map((r) => {
              const c = r.sessions.filter(Boolean).length === 5;
              const now = r.week_start === thisWeek;
              return (
                <span
                  key={r.week_start}
                  title={now ? 'this week' : pretty(r.week_start)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 3,
                    fontSize: 12,
                    fontWeight: 700,
                    background: c ? XP : 'transparent',
                    border: `2px solid ${c ? XP : '#2a2a60'}`,
                    color: c ? NAVY : '#6f6fb8',
                  }}
                >
                  {now ? 'this week' : pretty(r.week_start)}
                </span>
              );
            })}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 600, color: DIM }}>
            Once it&rsquo;s earned it never comes off.
          </p>
        </section>
      </div>
    </div>
  );
}

const heading: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Archivo Black', sans-serif",
  fontStyle: 'italic',
  fontSize: 42,
  lineHeight: .9,
  letterSpacing: '-.025em',
  color: '#fff',
  textShadow: '0 3px 22px rgba(10,11,30,.9), 0 0 26px rgba(78,226,255,.4)',
};

const kicker: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '.28em',
  textTransform: 'uppercase',
  color: '#7f7fd0',
};

const quest: React.CSSProperties = {
  cursor: 'pointer',
  padding: '11px 0',
  borderRadius: 3,
  clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
  fontFamily: "'Chakra Petch', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  transition: 'background .2s ease',
};
