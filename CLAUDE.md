# Working on this repo

A Year 6 maths and English app for one child, used by her alone. Read the README
first. This file is the standing brief for whoever picks the repo up next,
including you.

## Setting it up from cold

```bash
npm install

# 1. Create a Supabase project in the dashboard (two minutes, needs a human).
# 2. Paste supabase/schema.sql into the SQL editor and run it.
# 3. Then, with the service role key in the shell and NOT in a file:

export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export SUPABASE_ANON_KEY="eyJ..."
export PARENT_EMAIL="dad@example.com"
export PARENT_PASSWORD="..."
export LEARNER_EMAIL="murphy@example.com"
export LEARNER_PASSWORD="..."

npm run bootstrap     # creates the two users, the household and the profiles
npm run dev
```

`bootstrap` is idempotent. Running it twice is safe.

### The one security rule

`SUPABASE_SERVICE_ROLE_KEY` **bypasses row level security**. It must never be
written into `.env.local`, never be given a `NEXT_PUBLIC_` prefix, and never be
committed. Anything with that prefix is compiled into the browser bundle and is
public. Only the URL and the anon key belong in `.env.local`.

## Before any content change ships

```bash
npm run check-content   # ~20,000 generated questions, property tested
npm run simulate        # three synthetic learners through 40 sessions each
npm run sample 5        # prints instances to work by hand
```

`check-content` must pass. It asserts, among other things, that the app's own
answer marks as correct, that no distractor marks as correct, and that **every
incorrect option carries a misconception declared on its objective**. That last
one is Craig Barton's rule 4 as a build-time assertion, and it is not optional.

**Passing these does not mean the maths is right.** It means the app agrees with
itself. Five random instances of every new template get worked by hand, on paper,
before a child sees them. There is no way round this and no tool that does it.

## Rules that are deliberate, not accidental

Do not "improve" any of the following without a conversation. Each one is there
because of a specific finding, and the reasoning is in the code comments.

1. **No points, badges, leaderboards, streaks, coins or lives.** Completion-contingent rewards are the worst category in the motivation literature, and worse for children than adults.
2. **No total score, grade, level or rating of her.** Feedback directed at the self rather than the task is the mechanism that makes feedback harmful.
3. **No comparison to anyone.** Not classmates, not year-group expectations, not her brother.
4. **Nothing on the wall ever comes off**, and nothing displayed to her can decrease.
5. **Answers are computed in code, with exact rationals.** Never floats, never an LLM, never hand-written.
6. **No LLM at runtime.** Explanations were written and reviewed once, offline. The failure mode of a model marking a correct answer wrong is not recoverable.
7. **The gate is four conditions, never a streak.** Threshold, belief, a typed construction item, and no sub-three-second taps.
8. **BKT parameters are hand-set and live in one file.** Never fit them to her; with one learner that is fitting noise.
9. **Never run the FSRS optimiser.** Same reason.
10. **The week is a fixed pace set by the parent.** Mastery gates ordering and repetition; the week gates overall progress. Purely self-paced mastery learning is the version the evidence says works least well.
11. **`teach` rung answers move the ladder but not the belief.** Copying a worked answer is a reading check.
12. **Extended writing is out of scope.** Nothing grades a ten-year-old's composition reliably.

## After it is in daily use

**No feature work. Content and bug fixes only.** The way projects like this die is
not a bad build, it is running out of prepared material in week six while
somebody adds a nice-to-have. Content sits in `src/content`, and the next thing
it needs is weeks 13 onwards, authored a half term at a time.

## Layout

```
src/content/objectives.ts   the spine: what she learns, in what order, and the named misconceptions
src/content/maths.ts        23 objectives of templates
src/content/english.ts      16 objectives of templates
src/lib/engine.ts           template types, marking, misconception detection
src/lib/rational.ts         exact fractions. The reason nothing is marked wrong for 0.1 + 0.2
src/lib/bkt.ts              the mastery parameters, in one place, so they can be argued with
src/lib/schedule.ts         FSRS-6 at objective level
src/lib/session.ts          what she gets next, and why
src/components/             the question player, the keypad, the session, the two homes
supabase/schema.sql         tables and row level security
scripts/                    the checks
```
