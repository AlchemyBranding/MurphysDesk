'use client';

// A database-free look at the real question components. Useful for judging the
// content before setting Supabase up, and for working instances by hand.
// Nothing here is recorded anywhere.

import { useState } from 'react';
import { generate, OBJ_BY_ID, TEMPLATES } from '@/content';
import Item from '@/components/Item';
import type { StepMode } from '@/lib/session';

const MODES: StepMode[] = ['teach', 'complete', 'solo'];

export default function Preview() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [mode, setMode] = useState<StepMode>('solo');
  const [seed, setSeed] = useState(1);
  const [log, setLog] = useState<string[]>([]);

  const item = generate(templateId, seed);
  const objective = item ? OBJ_BY_ID[item.objectiveId] : null;

  return (
    <div className="wrap">
      <div className="top">
        <h1>Preview</h1>
        <span className="who">no database, nothing recorded</span>
      </div>

      <div className="card tight">
        <div className="row">
          <label style={{ flex: '1 1 260px' }}>
            <span className="lbl">Template</span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              style={{ width: '100%', padding: 8 }}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="lbl">Rung</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as StepMode)} style={{ padding: 8 }}>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m === 'teach' ? 'worked example' : m === 'complete' ? 'completion' : 'on her own'}
                </option>
              ))}
            </select>
          </label>
          <button className="btn ghost" onClick={() => setSeed((s) => s + 1)}>
            New numbers
          </button>
        </div>
      </div>

      {item && objective ? (
        <Item
          key={`${templateId}-${seed}-${mode}`}
          item={item}
          objective={objective}
          mode={mode}
          onAnswered={({ result, response }) =>
            setLog((l) => [
              `${result.correct ? 'right' : 'wrong'}  "${response}"  ${result.misconceptionId ?? ''}`,
              ...l,
            ].slice(0, 8))
          }
          onNext={() => setSeed((s) => s + 1)}
          onFlag={(note) => setLog((l) => [`flagged: ${note}`, ...l])}
        />
      ) : (
        <p className="muted">That template failed to build.</p>
      )}

      {log.length ? (
        <div className="card tight">
          <span className="lbl">What would have been recorded</span>
          <ul className="mono" style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
