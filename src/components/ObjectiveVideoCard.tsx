'use client';

// The optional explanation video for an objective.
//
// Two rules built into this component rather than left to whoever edits it next.
// It is never shown during a question, and it is never shown as a consequence of
// getting something wrong. It is offered when something is new, and it stays
// available afterwards for as long as she is on that objective.
//
// Oak National Academy, Open Government Licence v3.0. Attribution is a licence
// condition, not decoration, so it is not optional and does not come off.
//
// Oak serve their video from Mux with a signed playback policy, so it cannot be
// embedded without an Oak API key and a token. Until there is one, this opens
// their page in a new tab. If a key arrives, this file is the only thing that
// has to change.

import type { ObjectiveVideo } from '@/lib/engine';

export function VideoOffer({ video }: { video: ObjectiveVideo }) {
  return (
    <div className="videocard">
      <span className="lbl">Before you start, if you want it</span>
      <p className="vtitle">{video.title}</p>
      <p className="vwhy">{video.why}</p>
      <div className="row">
        <a className="btn ghost" href={video.url} target="_blank" rel="noopener noreferrer">
          Watch it first
        </a>
        <span className="vmeta">
          Oak National Academy &middot; {video.year} &middot; opens in a new tab
        </span>
      </div>
    </div>
  );
}

/** The quiet version, for when she is already working and wants it again. */
export function VideoAgain({ video }: { video: ObjectiveVideo }) {
  return (
    <a className="videoagain" href={video.url} target="_blank" rel="noopener noreferrer">
      Watch the explanation again
    </a>
  );
}
