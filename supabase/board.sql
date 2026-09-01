-- Murphy's board: the no-login tick sheet at /board?k=<token>
--
-- Run this once in the Supabase SQL editor, after schema.sql.
--
-- SECURITY, STATED PLAINLY. This table is readable and writable by the
-- anonymous role, because Murphy has no login and should not need one. The
-- only thing protecting it is the token in the URL. Anyone holding that link
-- can tick the board. That is the right trade-off for a tick sheet and the
-- wrong one for anything else, so never put anything else in this table.
-- To revoke access, change the token: update board set token = '<new>';

create table if not exists board (
  token       text        not null,
  week_start  date        not null,
  sessions    boolean[]   not null default '{false,false,false,false,false}',
  mornings    boolean[]   not null default '{false,false,false,false,false}',
  updated_at  timestamptz not null default now(),
  primary key (token, week_start)
);

alter table board enable row level security;

drop policy if exists board_anon on board;
create policy board_anon on board for all
  to anon
  using (true)
  with check (true);

grant select, insert, update on table board to anon;
