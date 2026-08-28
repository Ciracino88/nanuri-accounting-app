-- 찬양팀 스키마 복구 (2026-08-28)
--
-- 무슨 일이 있었나
--   2026-08-13 관리자 앱(NanuriAdmin) 저장소의 20260813120000_reset_schema.sql 이
--   `drop schema public cascade` 를 실행했다. 그 파일의 전제는 "멤버용 웹은 폐지" 였고,
--   같은 Supabase 프로젝트(ciszaukmnglepvqpulya)를 쓰는 이 웹앱의 테이블이 전부 사라졌다.
--   백업 보존 기간(7일)이 지나 데이터는 복구할 수 없다.
--
-- 이 파일이 되살리는 것
--   user_profiles · public_profiles 뷰 · worship_schedules · worship_availability.
--   구조만 되살아나고 과거 참여 기록은 돌아오지 않는다.
--
-- 왜 옛 마이그레이션을 다시 돌리지 않았나
--   supabase_migrations 스키마는 public 이 아니라서 안 지워졌다. 원격 이력에는 옛
--   마이그레이션이 전부 "적용됨"으로 남아 있어 db push 가 아무것도 하지 않는다.
--   그래서 오늘 날짜의 새 파일로 앞으로 감는다.
--
-- 이 저장소는 이제 찬양팀 일정 조율 전용이다. 소모임·행사·비용 청구는 폐기했고
-- 계좌·은행 컬럼도 만들지 않는다(청구 기능이 없으므로 받을 이유가 없다).

-- ═══════════════════════════════════════════════════════════════════
-- 1. user_profiles
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.user_profiles (
    id           uuid        primary key references auth.users(id) on delete cascade,
    name         text        not null default '',
    team         text        default '나누리',
    position     text[],                                  -- 찬양 포지션. null 이면 시트에 안 뜬다
    phone        text,
    avatar_url   text,
    role         text        not null default 'member',   -- 'admin' 이 관리자
    created_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- ─────────────────────────────────────────────
-- 1-1. 테이블 권한 — 반드시 회수 후 컬럼별 재부여
-- ─────────────────────────────────────────────
-- ⚠ 20260815130000_restore_public_grants.sql(관리자 앱 저장소)이 default privileges 로
--   "앞으로 만들 테이블에 anon·authenticated 전권"을 걸어 뒀다. 즉 위 create table 만으로
--   이 테이블에 테이블 단위 권한(arwdDxtm)이 이미 붙어 있다.
--   테이블 단위 권한은 모든 컬럼을 포함하므로 컬럼 단위 REVOKE 는 조용히 무시된다.
--   role 자가 승격을 막으려면 테이블 단위로 걷어낸 뒤 컬럼별로 다시 줘야 한다.
revoke all on public.user_profiles from anon, authenticated;

-- 본인 행 조회용. 어느 행이 보이는지는 아래 RLS 가 정한다.
grant select on public.user_profiles to authenticated;

-- role 을 뺀 나머지만 쓰기 허용. role 변경은 대시보드(postgres)에서만 한다.
-- id 는 upsert(on conflict do update)가 갱신 대상에 포함시키므로 update 에도 필요하다.
grant insert (id, name, team, position, phone, avatar_url)
  on public.user_profiles to authenticated;

grant update (id, name, team, position, phone, avatar_url)
  on public.user_profiles to authenticated;

-- anon 에는 아무것도 주지 않는다. 프로필은 로그인 후에만 다룬다.

-- ─────────────────────────────────────────────
-- 1-2. RLS — 본인 행만
-- ─────────────────────────────────────────────
-- 타인의 이름·아바타·포지션은 아래 public_profiles 뷰로만 나간다.
-- 여기에 "로그인 유저 전체 조회" 정책을 다시 만들지 말 것 — 연락처가 새어 나간다.
drop policy if exists "본인 프로필 조회" on public.user_profiles;
create policy "본인 프로필 조회" on public.user_profiles
    for select to authenticated using (auth.uid() = id);

drop policy if exists "본인 프로필 생성" on public.user_profiles;
create policy "본인 프로필 생성" on public.user_profiles
    for insert to authenticated with check (auth.uid() = id);

drop policy if exists "본인 프로필 수정" on public.user_profiles;
create policy "본인 프로필 수정" on public.user_profiles
    for update to authenticated
    using (auth.uid() = id) with check (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════
-- 2. public_profiles 뷰 — 서로에게 보여도 되는 컬럼만
-- ═══════════════════════════════════════════════════════════════════
-- security_invoker = off (기본값) → 소유자(postgres) 권한으로 실행되어 밑단 RLS 를
-- 우회한다. 노출 범위는 뷰의 컬럼 목록이 정한다. phone·role 은 여기에 없다.
create or replace view public.public_profiles as
  select id, name, avatar_url, position, team
  from public.user_profiles;

alter view public.public_profiles set (security_invoker = off);

-- ⚠ default privileges 때문에 뷰에도 anon 권한이 자동으로 붙는다. RLS 를 우회하는
--   뷰이므로 anon 이 읽으면 전원의 이름·포지션이 anon key 만으로 새어 나간다.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 3. 기존 계정 백필
-- ═══════════════════════════════════════════════════════════════════
-- auth.users 는 auth 스키마라 drop schema public cascade 에서 살아남았다.
-- 계정은 그대로 있으니 프로필 행만 이어 붙인다. 구글이 준 이름·아바타까지는 되살아나고,
-- 포지션·팀은 auth.users 에 없던 값이라 사람이 채워야 한다.
--
-- 익명 로그인(게스트)은 제외한다. "멤버" 판별이 user_profiles 행의 존재이므로
-- 게스트에게 행을 만들면 멤버가 되어 버린다.
insert into public.user_profiles (id, name, avatar_url)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name',
                u.raw_user_meta_data ->> 'name',
                ''),
       u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where coalesce(u.is_anonymous, false) = false
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- 4. worship_schedules — 주일 날짜
-- ═══════════════════════════════════════════════════════════════════
-- 화면이 열릴 때마다 useWorshipSchedule 이 앞뒤 넉 달치 주일을 upsert 한다
-- (onConflict: "date", ignoreDuplicates: true). 그래서 date 에 unique 가 필요하고
-- 멤버에게 insert 권한이 있어야 한다. 데이터가 비어 있어도 화면을 열면 다시 채워진다.
create table if not exists public.worship_schedules (
    id         uuid        primary key default gen_random_uuid(),
    date       date        not null unique,
    created_at timestamptz not null default now()
);

alter table public.worship_schedules enable row level security;

revoke all on public.worship_schedules from anon;

drop policy if exists "멤버는 주일 조회" on public.worship_schedules;
create policy "멤버는 주일 조회" on public.worship_schedules
    for select to authenticated
    using (exists (select 1 from public.user_profiles p where p.id = auth.uid()));

drop policy if exists "멤버는 주일 생성" on public.worship_schedules;
create policy "멤버는 주일 생성" on public.worship_schedules
    for insert to authenticated
    with check (exists (select 1 from public.user_profiles p where p.id = auth.uid()));

-- 수정·삭제 정책은 두지 않는다. 주일 날짜는 만들어지기만 하면 된다.

-- ═══════════════════════════════════════════════════════════════════
-- 5. worship_availability — 누가 어느 주일 어느 포지션에 서는가
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.worship_availability (
    id          uuid        primary key default gen_random_uuid(),
    schedule_id uuid        not null references public.worship_schedules(id) on delete cascade,
    user_id     uuid        not null references auth.users(id) on delete cascade,
    position    text        not null,
    available   boolean     not null default true,
    created_at  timestamptz not null default now(),

    -- useToggleAvailability 가 (schedule_id, user_id, position) 세 값으로 행을 집어
    -- update 한다. 같은 조합이 둘이면 토글이 갈라진다.
    unique (schedule_id, user_id, position)
);

create index if not exists worship_availability_schedule_idx
    on public.worship_availability (schedule_id);

alter table public.worship_availability enable row level security;

revoke all on public.worship_availability from anon;

drop policy if exists "멤버는 참여 조회" on public.worship_availability;
create policy "멤버는 참여 조회" on public.worship_availability
    for select to authenticated
    using (exists (select 1 from public.user_profiles p where p.id = auth.uid()));

drop policy if exists "본인 참여 등록" on public.worship_availability;
create policy "본인 참여 등록" on public.worship_availability
    for insert to authenticated with check (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 5-1. UPDATE — "교체"가 남의 행을 내리는 것까지 허용한다
-- ─────────────────────────────────────────────
-- 옛 DB 에는 qual = (auth.uid() is not null) 인 정책이 섞여 있어 로그인한 누구나 남의
-- 참여 행을 아무 값으로나 바꿀 수 있었다(data-model.md "알려진 구멍"). 다시 만들면서
-- 좁혔다. 그냥 "본인 행만" 으로 막으면 안 된다 — useToggleAvailability 의 "교체"가
-- 같은 포지션에 먼저 등록된 사람의 행을 available: false 로 내리기 때문이다.
--
-- using      : 멤버면 남의 행도 집을 수 있다 (교체 대상)
-- with check : 남의 행은 **내리는 것만** 된다. 남을 올리거나 다른 값으로 바꾸는 건 막힌다.
drop policy if exists "참여 수정" on public.worship_availability;
create policy "참여 수정" on public.worship_availability
    for update to authenticated
    using (exists (select 1 from public.user_profiles p where p.id = auth.uid()))
    with check (user_id = auth.uid() or available = false);

drop policy if exists "본인 참여 삭제" on public.worship_availability;
create policy "본인 참여 삭제" on public.worship_availability
    for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 5-2. Realtime
-- ─────────────────────────────────────────────
-- useWorshipSchedule 이 postgres_changes 로 구독한다. drop 될 때 퍼블리케이션에서도
-- 빠졌으므로 다시 넣는다.
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'worship_availability'
    ) then
        alter publication supabase_realtime add table public.worship_availability;
    end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. 가입 트리거 — 멤버를 통과시킨다
-- ═══════════════════════════════════════════════════════════════════
-- ⚠ 이 함수는 관리자 앱 저장소(20260813120000_reset_schema.sql)가 만든 것이다.
--   두 앱이 한 auth.users 를 공유하므로 여기서 고친다. 관리자 앱 쪽에도 같은 사실을
--   적어 둘 것.
--
-- 고치기 전: admins 화이트리스트에 없는 이메일은 raise exception 으로 **계정 생성 자체가
--   거부**됐다. 청년부 멤버는 아무도 그 명단에 없으므로 신규 가입이 전부 막혔다
--   (GoTrue 가 "Database error saving new user" 500 을 돌려준다).
--
-- 고친 뒤: 예외를 없애고 역할에 맞는 프로필 행을 만든다. 관리자 데이터의 방어선은
--   각 테이블 정책의 is_admin() 이고 그건 손대지 않았으므로, 명단 밖 계정이 로그인해도
--   admins·bills·finance_* 는 여전히 못 읽는다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    display_name text := coalesce(new.raw_user_meta_data ->> 'full_name',
                                  new.raw_user_meta_data ->> 'name',
                                  '');
begin
    -- 익명 로그인(게스트)은 어느 프로필도 만들지 않는다.
    -- "멤버" 판별이 user_profiles 행의 존재라서, 행을 만들면 게스트가 멤버가 된다.
    if coalesce(new.is_anonymous, false) then
        return new;
    end if;

    -- 웹(찬양팀) 프로필. 모든 로그인 계정이 갖는다.
    insert into public.user_profiles (id, name, avatar_url)
    values (new.id, display_name, new.raw_user_meta_data ->> 'avatar_url')
    on conflict (id) do nothing;

    -- 관리자 앱 프로필. 그 앱은 UPDATE 만 하므로 행이 미리 있어야 한다.
    if exists (select 1 from public.admins where email = lower(new.email)) then
        insert into public.profiles (id, name)
        values (new.id, display_name)
        on conflict (id) do nothing;
    end if;

    return new;
end;
$$;
