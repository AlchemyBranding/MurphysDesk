'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeneratedItem, Objective, MarkResult } from '@/lib/engine';
import type { StepMode } from '@/lib/session';
import { RAPID_MS } from '@/lib/bkt';
import Keypad from './Keypad';

interface Props {
  item: GeneratedItem;
  objective: Objective;
  mode: StepMode;
  gateIndex?: number;
  gateLength?: number;
  onAnswered: (r: {
    result: MarkResult;
    response: string;
    latencyMs: number;
    rapid: boolean;
  }) => void;
  onNext: () => void;
  onFlag: (note: string) => void;
}

/** How many lines of working stay visible. The fading ladder. */
function visibleWorking(mode: StepMode, total: number): number {
  if (mode === 'teach') return Math.max(1, total - 1);
  if (mode === 'complete') return Math.max(1, total - 2);
  return 0;
}

export default function Item({
  item,
  objective,
  mode,
  gateIndex,
  gateLength,
  onAnswered,
  onNext,
  onFlag,
}: Props) {
  const [value, setValue] = useState('');
  const [marked, setMarked] = useState<MarkResult | null>(null);
  const started = useRef<number>(Date.now());
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    started.current = Date.now();
    setValue('');
    setMarked(null);
    if (item.input === 'text') setTimeout(() => textRef.current?.focus(), 60);
    if (item.speak) speak(item.speak);
  }, [item.templateId, item.seed, item.input, item.speak]);

  const shown = useMemo(() => visibleWorking(mode, item.working.length), [mode, item.working.length]);

  function submit(raw: string) {
    if (marked) return;
    const latencyMs = Date.now() - started.current;
    const result = item.mark(raw);
    setMarked(result);
    onAnswered({
      result,
      response: raw,
      latencyMs,
      rapid: latencyMs < RAPID_MS,
    });
  }

  const misconceptionText =
    marked && !marked.correct && marked.misconceptionId
      ? objective.misconceptions[marked.misconceptionId]
      : undefined;

  return (
    <div>
      <div className="crumb">
        <span className={`tag ${objective.strand}`}>{objective.title}</span>
        {mode === 'gate' && gateIndex ? (
          <span className="tag gate">
            Check {gateIndex} of {gateLength}
          </span>
        ) : null}
        {mode === 'retention' ? <span className="tag">From a while ago</span> : null}
      </div>

      <div className="card">
        <p className="stem">{item.stem}</p>
        {item.note ? <p className="note">{item.note}</p> : null}

        {item.speak ? (
          <button type="button" className="btn ghost" onClick={() => speak(item.speak!)} style={{ marginBottom: 16 }}>
            Say it again
          </button>
        ) : null}

        {shown > 0 && !marked ? (
          <div className="working">
            <ol>
              {item.working.slice(0, shown).map((w, i) => (
                <li key={i}>{w.say}</li>
              ))}
              <li className="blank">…now you finish it.</li>
            </ol>
          </div>
        ) : null}

        {marked ? (
          <>
            <div className={`verdict ${marked.correct ? 'right' : 'wrong'}`}>
              <b>{marked.correct ? 'Yes.' : 'Not that one.'}</b>
              <p>
                {marked.correct
                  ? `The answer is ${item.canonical}.`
                  : misconceptionText
                    ? misconceptionText
                    : `The answer is ${item.canonical}.`}
              </p>
            </div>
            <div className="working">
              <ol>
                {item.working.map((w, i) => (
                  <li key={i}>{w.say}</li>
                ))}
              </ol>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={onNext} autoFocus>
                Next
              </button>
              <button
                type="button"
                className="btn quiet"
                onClick={() => {
                  const note = window.prompt('What looks wrong with this question?') ?? '';
                  if (note.trim()) onFlag(note.trim());
                }}
              >
                This looks wrong
              </button>
            </div>
          </>
        ) : item.input === 'choice' ? (
          <div className="opts">
            {(item.options ?? []).map((o) => (
              <button
                key={o.label}
                type="button"
                className="opt"
                onClick={() => {
                  setValue(o.label);
                  submit(o.label);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : item.input === 'text' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) submit(value);
            }}
          >
            <input
              ref={textRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="type it here"
            />
            <div className="spacer" />
            <button type="submit" className="btn" disabled={!value.trim()}>
              Check
            </button>
          </form>
        ) : (
          <Keypad
            value={value}
            onChange={setValue}
            onSubmit={() => submit(value)}
            unit={item.unit}
          />
        )}
      </div>
    </div>
  );
}

function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch {
    // Silent. The note gives the first letter and length as a fallback.
  }
}
