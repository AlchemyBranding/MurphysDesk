'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generate, OBJ_BY_ID } from '@/content';
import type { GeneratedItem, MarkResult } from '@/lib/engine';
import { supabase, type MasteryRow, type Profile, blankMastery } from '@/lib/supabase';
import { updateBkt } from '@/lib/bkt';
import { emptyReview, review, deriveRating, Rating, type ReviewRow } from '@/lib/schedule';
import {
  nextStep,
  masteryThreshold,
  weakestPrereq,
  GATE_LENGTH,
  GATE_PASS,
  type Step,
} from '@/lib/session';
import Item from './Item';
import { VideoOffer, VideoAgain } from './ObjectiveVideoCard';

const TARGET_ITEMS = 18; // roughly fifteen minutes. Hard capped, with no "just one more".

interface GateState {
  objectiveId: string;
  index: number;
  correct: number;
  rapid: number;
  latencies: number[];
  hinted: boolean;
}

export default function Session({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const db = useMemo(() => supabase(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mastery, setMastery] = useState<Record<string, MasteryRow>>({});
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [step, setStep] = useState<Step | null>(null);
  const [item, setItem] = useState<GeneratedItem | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [gate, setGate] = useState<GateState | null>(null);
  const [wallOffer, setWallOffer] = useState<{ objectiveId: string; text: string } | null>(null);
  const [halt, setHalt] = useState<string | null>(null);
  const [parked, setParked] = useState<string | null>(null);

  const history = useRef<string[]>([]);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  // ---------------------------------------------------------------- load

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [m, r, s] = await Promise.all([
          db.from('mastery').select('*').eq('learner_id', profile.id),
          db.from('review_state').select('*').eq('learner_id', profile.id),
          db
            .from('sessions')
            .insert({ learner_id: profile.id, planned_minutes: 15 })
            .select('id')
            .single(),
        ]);
        if (!live) return;
        if (m.error) throw m.error;
        if (r.error) throw r.error;
        setMastery(Object.fromEntries((m.data ?? []).map((x) => [x.objective_id, x as MasteryRow])));
        setReviews(Object.fromEntries((r.data ?? []).map((x) => [x.objective_id, x as ReviewRow])));
        setSessionId(s.data?.id ?? null);
        setLoading(false);
      } catch (e) {
        if (live) {
          setError(e instanceof Error ? e.message : 'Could not load your work.');
          setLoading(false);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [db, profile.id]);

  // ---------------------------------------------------------------- advance

  const advance = useCallback(() => {
    if (done >= TARGET_ITEMS) {
      setFinished(true);
      return;
    }
    const next = nextStep({
      mastery,
      reviews,
      week: profile.programme_week,
      history: history.current,
      gate: gate ? { objectiveId: gate.objectiveId, index: gate.index } : null,
    });
    if (!next) {
      setFinished(true);
      return;
    }
    const generated = generate(next.templateId, next.seed);
    if (!generated) {
      setError('A question failed to build. That is a bug, not you.');
      return;
    }
    const m = mastery[next.objectiveId];
    setShowIntro(!m || m.attempts_count === 0);
    setStep(next);
    setItem(generated);
  }, [done, gate, mastery, profile.programme_week, reviews]);

  useEffect(() => {
    if (!loading && !step && !finished && !wallOffer && !halt && !parked) advance();
  }, [loading, step, finished, wallOffer, halt, parked, advance]);

  // ---------------------------------------------------------------- answering

  async function handleAnswered(payload: {
    result: MarkResult;
    response: string;
    latencyMs: number;
    rapid: boolean;
  }) {
    if (!step || !item) return;
    const { result, response, latencyMs, rapid } = payload;

    setDone((d) => d + 1);
    if (result.correct) setCorrect((c) => c + 1);
    history.current = [...history.current, step.objectiveId].slice(-12);

    // Record the attempt. Fire and forget: a failed write must never block her.
    void db.from('attempts').insert({
      learner_id: profile.id,
      session_id: sessionId,
      objective_id: step.objectiveId,
      template_id: step.templateId,
      seed: step.seed,
      mode: step.mode,
      response,
      is_correct: result.correct,
      misconception_id: result.misconceptionId ?? null,
      latency_ms: latencyMs,
      rapid,
    });

    const current = mastery[step.objectiveId] ?? blankMastery(profile.id, step.objectiveId);
    const typed = item.input !== 'choice';
    const updated = applyAnswer(current, result, typed, rapid, step.mode);
    setMastery((prev) => ({ ...prev, [step.objectiveId]: updated }));
    void db.from('mastery').upsert(updated);

    if (step.mode === 'gate') {
      const g: GateState = gate ?? {
        objectiveId: step.objectiveId,
        index: 1,
        correct: 0,
        rapid: 0,
        latencies: [],
        hinted: false,
      };
      const nextGate: GateState = {
        ...g,
        correct: g.correct + (result.correct ? 1 : 0),
        rapid: g.rapid + (rapid ? 1 : 0),
        latencies: [...g.latencies, latencyMs],
        index: g.index + 1,
      };
      if (nextGate.rapid >= 2) {
        setGate(null);
        setHalt('rapid');
        return;
      }
      if (nextGate.index > GATE_LENGTH) {
        await settleGate(nextGate, updated);
        return;
      }
      setGate(nextGate);
    } else if (step.mode === 'retention') {
      const row = reviews[step.objectiveId] ?? emptyReview();
      const rating = result.correct ? Rating.Good : Rating.Again;
      const updatedReview = review(row, rating);
      setReviews((prev) => ({ ...prev, [step.objectiveId]: updatedReview }));
      void db.from('review_state').upsert({
        learner_id: profile.id,
        objective_id: step.objectiveId,
        ...updatedReview,
      });
    }
  }

  async function settleGate(g: GateState, m: MasteryRow) {
    const threshold = masteryThreshold(g.objectiveId);
    const passed = g.correct >= GATE_PASS && m.p_known >= threshold && g.rapid === 0;
    setGate(null);

    if (passed) {
      const gated: MasteryRow = {
        ...m,
        status: 'gated',
        first_gated_at: m.first_gated_at ?? new Date().toISOString(),
        consecutive_wrong: 0,
        gate_fails: 0,
      };
      setMastery((prev) => ({ ...prev, [g.objectiveId]: gated }));
      void db.from('mastery').upsert(gated);

      const meanMs = g.latencies.reduce((a, b) => a + b, 0) / Math.max(1, g.latencies.length);
      const fresh = review(emptyReview(), deriveRating(g.correct, GATE_LENGTH, meanMs, g.hinted));
      setReviews((prev) => ({ ...prev, [g.objectiveId]: fresh }));
      void db
        .from('review_state')
        .upsert({ learner_id: profile.id, objective_id: g.objectiveId, ...fresh });

      setWallOffer({ objectiveId: g.objectiveId, text: OBJ_BY_ID[g.objectiveId].canDo });
      setStep(null);
      setItem(null);
      return;
    }

    // Failed. Diagnose, walk backwards, and never grind her against the same wall twice.
    const fails = m.gate_fails + 1;
    const failed: MasteryRow = {
      ...m,
      gate_fails: fails,
      halted: fails >= 2,
      rung: Math.max(0, m.rung - 1),
      consecutive_correct: 0,
      consecutive_wrong: 0,
      status: 'learning',
    };
    setMastery((prev) => ({ ...prev, [g.objectiveId]: failed }));
    void db.from('mastery').upsert(failed);

    if (fails >= 2) {
      // Parked, not stopped. She carries on with something else; this one is
      // flagged for a conversation rather than another quiz.
      setParked(OBJ_BY_ID[g.objectiveId].title);
      setStep(null);
      setItem(null);
      return;
    }
    const prereq = weakestPrereq(g.objectiveId, mastery);
    if (prereq) history.current = [...history.current, prereq];
    setStep(null);
    setItem(null);
  }

  // ---------------------------------------------------------------- render

  if (loading) return <p className="muted">Getting your work…</p>;

  if (error) {
    return (
      <div className="card">
        <h2>Something broke</h2>
        <p className="muted">{error}</p>
        <button className="btn ghost" onClick={onDone}>
          Back
        </button>
      </div>
    );
  }

  if (halt === 'rapid') {
    return (
      <div className="card">
        <h2>Let&rsquo;s come back to this</h2>
        <p>
          Those went by very fast. That is not a fail and nothing has been recorded against you. Have
          a break and we will pick it up next time.
        </p>
        <button className="btn" onClick={onDone}>
          Done for now
        </button>
      </div>
    );
  }

  if (parked) {
    return (
      <div className="card">
        <h2>Parking that one</h2>
        <p>
          <b>{parked}</b> is not clicking yet, and more questions on it right now will not help. It
          is put aside for a conversation instead. Nothing about that is a fail.
        </p>
        <button className="btn" onClick={() => setParked(null)} autoFocus>
          Carry on with something else
        </button>
      </div>
    );
  }

  if (wallOffer) {
    return <WallOffer offer={wallOffer} onSave={saveWall} />;
  }

  if (finished) {
    return (
      <div className="card">
        <h2>That is the session</h2>
        <p>
          {done} question{done === 1 ? '' : 's'}. {correct} right.
        </p>
        <p className="muted">
          Nothing is lost if you stop here, and nothing runs out if you miss a day. Come back when
          you feel like it.
        </p>
        <button className="btn" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  if (!step || !item) return <p className="muted">Choosing something…</p>;

  const objective = OBJ_BY_ID[step.objectiveId];

  if (showIntro) {
    return (
      <div className="card">
        <span className="lbl">Something new</span>
        <h2>{objective.title}</h2>
        <p style={{ fontSize: '1.05rem' }}>{objective.teach}</p>
        {objective.video ? <VideoOffer video={objective.video} /> : null}
        <button className="btn" onClick={() => setShowIntro(false)} autoFocus>
          Right, got it
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="progress" aria-hidden="true">
        <i style={{ width: `${Math.min(100, (done / TARGET_ITEMS) * 100)}%` }} />
      </div>
      <div className="spacer" />
      {objective.video ? <VideoAgain video={objective.video} /> : null}
      <Item
        key={`${step.templateId}-${step.seed}`}
        item={item}
        objective={objective}
        mode={step.mode}
        gateIndex={step.gateIndex}
        gateLength={GATE_LENGTH}
        onAnswered={handleAnswered}
        onNext={() => {
          setStep(null);
          setItem(null);
        }}
        onFlag={(note) => {
          void db.from('flags').insert({
            learner_id: profile.id,
            template_id: step.templateId,
            seed: step.seed,
            stem: item.stem,
            expected: item.canonical,
            note,
          });
        }}
      />
    </>
  );

  function saveWall(text: string) {
    if (!wallOffer) return;
    void db.from('wall').upsert(
      { learner_id: profile.id, objective_id: wallOffer.objectiveId, text },
      { onConflict: 'learner_id,objective_id' }
    );
    setWallOffer(null);
  }
}

// ---------------------------------------------------------------- mastery update

function applyAnswer(
  m: MasteryRow,
  result: MarkResult,
  typed: boolean,
  rapid: boolean,
  mode: string
): MasteryRow {
  const now = new Date().toISOString();

  // A tap is not an answer. It counts for nothing in either direction.
  if (rapid) return { ...m, last_seen_at: now };

  const misconceptions = { ...(m.misconceptions ?? {}) };
  if (!result.correct && result.misconceptionId) {
    misconceptions[result.misconceptionId] = (misconceptions[result.misconceptionId] ?? 0) + 1;
  }

  // The worked example rungs are a reading check, not evidence of knowing it,
  // so they move the ladder but not the belief.
  const pKnown = mode === 'teach' ? m.p_known : updateBkt(m.p_known, result.correct, typed);

  let rung = m.rung;
  let cc = result.correct ? m.consecutive_correct + 1 : 0;
  let cw = result.correct ? 0 : m.consecutive_wrong + 1;

  if (cc >= 2 && rung < 2) {
    rung += 1;
    cc = 0;
  } else if (cw >= 2 && rung > 0) {
    // The demotion path matters more than the promotion path. It is what stops
    // her being stuck on something with no support.
    rung -= 1;
    cw = 0;
  }

  return {
    ...m,
    status: m.status === 'available' ? 'learning' : m.status,
    p_known: pKnown,
    rung,
    consecutive_correct: cc,
    consecutive_wrong: cw,
    attempts_count: m.attempts_count + 1,
    correct_count: m.correct_count + (result.correct ? 1 : 0),
    misconceptions,
    last_seen_at: now,
  };
}

// ---------------------------------------------------------------- wall offer

function WallOffer({
  offer,
  onSave,
}: {
  offer: { objectiveId: string; text: string };
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(offer.text);
  return (
    <div className="card">
      <span className="lbl">New on the wall</span>
      <h2>You can do this now</h2>
      <p className="muted">
        Put it in your own words if you like. It goes on the wall and it stays there.
      </p>
      <label className="field">
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="btn" onClick={() => onSave(text.trim() || offer.text)} autoFocus>
        Put it on the wall
      </button>
    </div>
  );
}
