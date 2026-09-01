-- Fixes the "new row violates row-level security policy" error, and adds the
-- two morning columns. Run this once in the Supabase SQL editor.
--
-- Why the first version failed: the policy was granted to the anon role only.
-- If you are signed in to Murphy's Desk in the same browser, Supabase attaches
-- that session and the request arrives as `authenticated`, which the policy did
-- not cover. Omitting the role makes the policy apply to everyone.

alter table board add column if not exists piano boolean[] not null
  default '{false,false,false,false,false}';
alter table board add column if not exists ttrs  boolean[] not null
  default '{false,false,false,false,false}';

drop policy if exists board_anon on board;
drop policy if exists board_all  on board;

create policy board_all on board for all
  using (true)
  with check (true);

grant select, insert, update on table board to anon, authenticated;
