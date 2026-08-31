'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local.'
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export interface Profile {
  id: string;
  household_id: string;
  role: 'parent' | 'learner';
  display_name: string;
  programme_week: number;
}

export interface MasteryRow {
  learner_id: string;
  objective_id: string;
  status: 'locked' | 'available' | 'learning' | 'gated' | 'retained';
  p_known: number;
  rung: number;
  consecutive_correct: number;
  consecutive_wrong: number;
  attempts_count: number;
  correct_count: number;
  misconceptions: Record<string, number>;
  gate_fails: number;
  halted: boolean;
  first_gated_at: string | null;
  last_seen_at: string | null;
}

export function blankMastery(learnerId: string, objectiveId: string): MasteryRow {
  return {
    learner_id: learnerId,
    objective_id: objectiveId,
    status: 'available',
    p_known: 0.25,
    rung: 0,
    consecutive_correct: 0,
    consecutive_wrong: 0,
    attempts_count: 0,
    correct_count: 0,
    misconceptions: {},
    gate_fails: 0,
    halted: false,
    first_gated_at: null,
    last_seen_at: null,
  };
}
