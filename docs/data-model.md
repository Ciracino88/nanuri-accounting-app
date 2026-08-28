# 데이터 모델

Supabase(Postgres) 스키마·RLS·Realtime 정리입니다. 프로젝트 ref 는 `ciszaukmnglepvqpulya`.

## ⚠ 먼저 알아야 할 것: DB 를 혼자 쓰지 않습니다

이 프로젝트는 관리자 iOS 앱 **NanuriAdmin**(`~/Desktop/SwiftUI-Project/NanuriAdmin`)과
**같은 Supabase 프로젝트를 공유**합니다. 두 저장소가 각자 `supabase/migrations/` 를 갖고 있고
서로를 모르지만, **원격의 마이그레이션 이력은 하나로 섞입니다.**

2026-08-13 에 그쪽 마이그레이션이 `drop schema public cascade` 를 실행해 이 앱의 테이블이
전부 지워졌습니다([status.md](status.md#-2026-08-13-스키마-삭제-사고)). 데이터는 복구하지
못했습니다.

| 테이블 | 주인 |
| --- | --- |
| `user_profiles` · `public_profiles` · `worship_schedules` · `worship_availability` | **이 웹앱** |
| `admins` · `profiles` · `bills` · `finance_*` · `device_tokens` | **NanuriAdmin** — 건드리지 말 것 |
| `auth.users` · `public.handle_new_user()` | **공유** — 고칠 땐 양쪽 다 확인 |

`public.profiles`(관리자 앱)와 `public.user_profiles`(이 앱)는 **이름이 비슷한 다른
테이블**입니다. 헷갈리지 마세요.

## 테이블

전부 [`20260828000000_restore_worship_schema.sql`](../supabase/migrations/20260828000000_restore_worship_schema.sql)
한 파일에 정의돼 있습니다. 그 이전 마이그레이션들은 삭제된 기능(행사·소모임)의 기록이라
지금 스키마와 무관합니다.

### `user_profiles`

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | `auth.users(id)` 참조, `on delete cascade` |
| `name` | text NOT NULL | 기본값 `''`. 비면 `/member/setup` 으로 보내진다 |
| `team` | text | 기본값 `'나누리'`. 값은 `나누리` · `섬김이` |
| `position` | text[] | 찬양 포지션. **null 이면 시트에 안 뜬다** |
| `phone` | text | |
| `avatar_url` | text | |
| `role` | text NOT NULL | 기본값 `'member'`. **이 앱은 읽지 않는다** |
| `created_at` | timestamptz NOT NULL | |

포지션 값은 [`src/constants/worship.ts`](../src/constants/worship.ts)의 `POSITIONS` 10종입니다
(인도자 · 싱어1 · 싱어2 · 메인 피아노 · 세컨 피아노 · 어쿠스틱 · 베이스 · 일렉 · 드럼 · PPT).

> **은행·계좌 컬럼은 없습니다.** 비용 청구가 관리자 앱으로 넘어가 웹이 받을 이유가 없어졌고,
> 2026-08-28 재생성 때 아예 만들지 않았습니다.

### `public_profiles` (뷰)

```sql
select id, name, avatar_url, position, team from public.user_profiles
```

**타인의 프로필은 이 뷰로만 읽습니다.** `security_invoker = off`(기본값)라 소유자(postgres)
권한으로 실행되어 밑단 RLS 를 우회하고, 노출 범위는 **뷰의 컬럼 목록**이 정합니다.
`phone` · `role` 은 뷰에 없으므로 조회 경로가 없습니다.

⚠ RLS 를 우회하는 뷰라 `anon` 에 권한이 붙으면 anon key 만으로 전원의 이름·포지션이 새어
나갑니다. 마이그레이션에서 명시적으로 회수했습니다.

### `worship_schedules`

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `date` | date NOT NULL **UNIQUE** | 주일 날짜 |
| `created_at` | timestamptz NOT NULL | |

**클라이언트가 채웁니다.** 화면이 열릴 때마다 [`useWorshipSchedule`](../src/hooks/useWorshipSchedule.ts)이
앞뒤 넉 달치 주일을 `upsert(onConflict: "date", ignoreDuplicates: true)` 로 밀어 넣습니다.
그래서 `date` 에 unique 가 필요하고 멤버에게 insert 권한이 있어야 합니다. 이 테이블이 비어
있어도 화면을 한 번 열면 다시 채워집니다.

### `worship_availability`

| 컬럼 | 타입 | 비고 |
| --- | --- | --- |
| `id` | uuid PK | |
| `schedule_id` | uuid NOT NULL | `worship_schedules(id)` cascade |
| `user_id` | uuid NOT NULL | `auth.users(id)` cascade |
| `position` | text NOT NULL | |
| `available` | boolean NOT NULL | 기본값 `true` |
| `created_at` | timestamptz NOT NULL | |

**`unique (schedule_id, user_id, position)`** 이 중요합니다.
[`useToggleAvailability`](../src/hooks/useToggleAvailability.ts)가 이 세 값으로 행을 집어
`update` 하므로, 같은 조합이 둘이면 토글이 갈라집니다.

## RLS 정책

모든 테이블에 RLS 가 켜져 있습니다.

| 테이블 | 조회 | 쓰기 |
| --- | --- | --- |
| `user_profiles` | **본인 행만** | 본인 행만 insert/update |
| `worship_schedules` | 멤버 | 멤버 insert. **수정·삭제 없음** |
| `worship_availability` | 멤버 | 본인만 insert/delete, update 는 아래 참고 |

**"멤버"는 `to authenticated` 로 판별할 수 없습니다.** Supabase 익명 로그인도 `authenticated`
롤을 받기 때문입니다. 대신 `user_profiles` 행의 존재로 판별합니다.

```sql
exists (select 1 from public.user_profiles p where p.id = auth.uid())
```

그래서 가입 트리거가 **익명 계정에는 프로필 행을 만들지 않습니다.** 이 규칙이 깨지면 게스트가
멤버가 됩니다.

### `worship_availability` UPDATE — 좁혔지만 완전히 막진 않았습니다

옛 DB 에는 정책이 둘이었고 하나가 `qual = (auth.uid() is not null)` 이라 로그인한 누구나 남의
행을 아무 값으로나 바꿀 수 있었습니다. 재생성하면서 좁혔습니다.

```sql
using      (멤버)
with check (user_id = auth.uid() or available = false)
```

**"본인 행만" 으로 막으면 안 됩니다.** "교체" 기능이 같은 포지션에 먼저 등록된 사람의 행을
`available: false` 로 내리기 때문입니다(확인창을 거칩니다). 새 정책은 남의 행을 **내리는
것만** 허용합니다.

## 컬럼 권한 — 이 프로젝트의 함정

`user_profiles` 는 RLS 만으로 부족합니다. **RLS 는 행을 막고 컬럼은 못 막습니다.** 예전에
아무 멤버나 자기 `role` 을 `'admin'` 으로 바꿀 수 있었던 게 이 때문입니다.

두 가지를 같이 알아야 합니다.

1. **테이블 단위 권한이 컬럼 단위 REVOKE 를 삼킵니다.** 테이블 단위 권한(`arwdDxtm`)은 모든
   컬럼을 포함하므로, 그게 붙은 채로 컬럼만 REVOKE 하면 조용히 무시됩니다. **테이블 단위로
   회수한 뒤 컬럼별로 다시 부여**해야 합니다.
2. **새 테이블에는 권한이 자동으로 붙습니다.** NanuriAdmin 의
   `20260815130000_restore_public_grants.sql` 이 `alter default privileges` 로 "앞으로 만들
   테이블에 anon·authenticated 전권"을 걸어 뒀습니다. 즉 `create table` 만으로 이미 전권이
   붙어 있습니다.

그래서 복구 마이그레이션이 이 순서를 밟습니다.

```sql
revoke all on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to authenticated;
grant insert (id, name, team, position, phone, avatar_url) on public.user_profiles to authenticated;
grant update (id, name, team, position, phone, avatar_url) on public.user_profiles to authenticated;
```

`role` 은 어느 롤에도 주지 않습니다. 역할 변경은 대시보드(postgres)에서 합니다.

⚠ **`public` 에 새 테이블을 만들면 반드시 `enable row level security` 를 같이 쓰세요.**
안 켜면 anon key 만으로 읽힙니다.

## 가입 트리거 (`handle_new_user`)

`auth.users` INSERT 에 걸린 트리거입니다. **두 앱이 공유하는 함수**라 고칠 때 양쪽을 봐야
합니다. 원본은 NanuriAdmin 의 `20260813120000_reset_schema.sql` 이 만들었고, 이 저장소의
복구 마이그레이션이 덮어썼습니다.

고치기 전에는 `admins` 화이트리스트에 없는 이메일을 `raise exception` 으로 막아 **신규 멤버
가입이 전부 실패**했습니다(GoTrue 가 `Database error saving new user` 500 을 돌려줍니다).

지금은 이렇게 갈라집니다.

| 계정 | 하는 일 |
| --- | --- |
| 익명(게스트) | 아무 프로필도 안 만든다 |
| 일반 계정 | `user_profiles` 행 생성 |
| `admins` 에 있는 계정 | `user_profiles` + `profiles`(관리자 앱용) 둘 다 |

**관리자 데이터의 방어선은 트리거가 아니라 각 테이블 정책의 `is_admin()`** 입니다. 트리거를
푼 것이 관리자 앱 보안을 낮추지 않는 이유입니다.

## Realtime

`supabase_realtime` 퍼블리케이션에 `worship_availability` 가 등록돼 있습니다.
[`useWorshipSchedule`](../src/hooks/useWorshipSchedule.ts)이 `postgres_changes` 로 구독해,
이벤트를 받으면 `["worship", year, month]` 쿼리 캐시를 무효화합니다.

⚠ `drop table cascade` 로 지우면 퍼블리케이션에서도 빠집니다. 재생성하는 테이블은 다시
넣어야 합니다.

## 마이그레이션 다루기

**`--dry-run` 을 먼저 보세요.**

```bash
set -a; . ./.env.local; set +a; npx supabase db push --dry-run
```

`SUPABASE_DB_PASSWORD` 는 `.env.local` 에 있습니다. **파일을 열거나 값을 출력하지 마세요** —
`cat`·`echo`·`set -x` 전부. 한 번이라도 출력하면 프로덕션 DB 평문 비밀번호가 터미널 기록과
에이전트 대화 로그에 남습니다.

이 저장소엔 `drop cascade` 후 재생성하는 파괴적 마이그레이션이 둘(`events_v2` · `gatherings_v2`)
있습니다. 둘 다 이미 적용됐으니 정상이면 목록에 안 뜹니다 — **뜬다면 신호입니다.**

로컬 `supabase db reset` 은 못 돌립니다 — 이 작업 환경에 psql/Docker 가 없습니다.
`db dump` 는 Docker 없이 돌리면 **빈 파일을 남기고 실패**하니 "데이터 없음"으로 오독하지
마세요. 원격 확인이 필요하면 대시보드 SQL 에디터를 쓰세요.
