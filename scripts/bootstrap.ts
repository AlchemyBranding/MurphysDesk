/**
 * One-time setup. Creates the two auth users, the household and the two profile
 * rows, then writes .env.local. Idempotent: safe to run again.
 *
 * Run supabase/schema.sql in the SQL editor FIRST.
 *
 *   export SUPABASE_URL="https://xxxx.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   export SUPABASE_ANON_KEY="eyJ..."
 *   export PARENT_EMAIL="..."   PARENT_PASSWORD="..."   PARENT_NAME="Dad"
 *   export LEARNER_EMAIL="..."  LEARNER_PASSWORD="..."  LEARNER_NAME="Murphy"
 *   npm run bootstrap
 *
 * The service role key bypasses row level security. It is read from the shell,
 * it is never written to a file by this script, and it must never be given a
 * NEXT_PUBLIC_ prefix, because anything with that prefix ends up in the browser.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`\nMissing ${name}. See the block at the top of this file.\n`);
    process.exit(1);
  }
  return v;
}

const URL = need('SUPABASE_URL');
const SERVICE = need('SUPABASE_SERVICE_ROLE_KEY');
const ANON = need('SUPABASE_ANON_KEY');
const PARENT_EMAIL = need('PARENT_EMAIL');
const PARENT_PASSWORD = need('PARENT_PASSWORD');
const LEARNER_EMAIL = need('LEARNER_EMAIL');
const LEARNER_PASSWORD = need('LEARNER_PASSWORD');
const PARENT_NAME = process.env.PARENT_NAME ?? 'Dad';
const LEARNER_NAME = process.env.LEARNER_NAME ?? 'Murphy';

if (SERVICE === ANON) {
  console.error('\nThose two keys are the same. The service role key is the secret one.\n');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function findOrCreateUser(email: string, password: string): Promise<string> {
  // The admin list endpoint has no email filter, so page until we find it.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) {
      console.log(`  user exists: ${email}`);
      return hit.id;
    }
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`  created user: ${email}`);
  return data.user.id;
}

async function main() {
  console.log('\nChecking the schema is there…');
  const probe = await admin.from('households').select('id').limit(1);
  if (probe.error) {
    console.error(
      `\nCould not read the households table: ${probe.error.message}\n` +
        'Run supabase/schema.sql in the Supabase SQL editor first.\n'
    );
    process.exit(1);
  }

  console.log('Users…');
  const parentId = await findOrCreateUser(PARENT_EMAIL, PARENT_PASSWORD);
  const learnerId = await findOrCreateUser(LEARNER_EMAIL, LEARNER_PASSWORD);

  console.log('Household…');
  let householdId: string;
  const existing = await admin.from('households').select('id').limit(1).maybeSingle();
  if (existing.data?.id) {
    householdId = existing.data.id;
    console.log('  household exists');
  } else {
    const { data, error } = await admin
      .from('households')
      .insert({ name: 'Home' })
      .select('id')
      .single();
    if (error) throw error;
    householdId = data.id;
    console.log('  created household');
  }

  console.log('Profiles…');
  const { error: pErr } = await admin.from('profiles').upsert([
    {
      id: parentId,
      household_id: householdId,
      role: 'parent',
      display_name: PARENT_NAME,
    },
    {
      id: learnerId,
      household_id: householdId,
      role: 'learner',
      display_name: LEARNER_NAME,
      programme_week: 1,
    },
  ]);
  if (pErr) throw pErr;
  console.log('  profiles set');

  // .env.local gets the public pair only. Never the service role key.
  const env = `NEXT_PUBLIC_SUPABASE_URL=${URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}\n`;
  if (existsSync('.env.local') && readFileSync('.env.local', 'utf8').trim() === env.trim()) {
    console.log('.env.local already correct');
  } else {
    writeFileSync('.env.local', env);
    console.log('.env.local written');
  }

  console.log(`
Done.

  parent   ${PARENT_EMAIL}
  learner  ${LEARNER_EMAIL}
  week     1

Next: npm run dev, sign in as the learner, and check /preview before she does.
Deploying? Put the same two NEXT_PUBLIC_ variables in Vercel. Not the service
role key.
`);
}

main().catch((e) => {
  console.error('\n' + (e instanceof Error ? e.message : String(e)) + '\n');
  process.exit(1);
});
