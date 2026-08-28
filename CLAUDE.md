# CLAUDE.md

나누리(Nanuri) — 청년부 **찬양팀 일정 조율** 웹앱. React + TypeScript + Vite,
Supabase(Postgres·Auth·Realtime), Tailwind v4, TanStack Query, Zustand, motion/react.

멤버가 주일마다 자기 포지션에 "설 수 있음"을 토글로 표시하고, 누가 어느 자리에 서는지 함께
봅니다. **앱이 하는 일은 이거 하나입니다.** 소모임·행사·비용 청구·회계·갤러리는 폐기됐거나
관리자 iOS 앱으로 넘어갔습니다 — 옛 커밋이나 문서에서 보더라도 지금은 없는 기능입니다.

## ⚠ 이 DB 는 우리 것만이 아닙니다

관리자 iOS 앱 **NanuriAdmin**(`~/Desktop/SwiftUI-Project/NanuriAdmin`)과 **같은 Supabase
프로젝트**(`ciszaukmnglepvqpulya`)를 씁니다. 두 저장소가 각자 `supabase/migrations/` 를 갖고
서로를 모르지만, **원격의 마이그레이션 이력은 하나로 섞입니다.**

2026-08-13 에 그쪽의 `drop schema public cascade` 가 이 앱의 테이블을 전부 지웠고 백업 기간이
지나 **데이터는 영구 소실**됐습니다. 스키마를 건드리기 전에
[docs/status.md의 사고 기록](docs/status.md#-2026-08-13-스키마-삭제-사고)을 읽으세요.

| 테이블 | 주인 |
| --- | --- |
| `user_profiles` · `public_profiles` · `worship_schedules` · `worship_availability` | **이 웹앱** |
| `admins` · `profiles` · `bills` · `finance_*` · `device_tokens` | **NanuriAdmin** — 건드리지 말 것 |
| `auth.users` · `public.handle_new_user()` | **공유** — 고칠 땐 양쪽 다 확인 |

같은 함정이 Cloudflare 에도 있습니다. **R2 버킷 `nanuri-bills` 는 관리자 앱과 공유**하므로
지우면 그쪽 영수증이 깨집니다([docs/architecture.md](docs/architecture.md#남은-정리--버킷은-지우면-안-됩니다)).

## 먼저 읽을 것

**[docs/README.md](docs/README.md)가 문서 인덱스입니다.** 이 프로젝트는 설계 근거를 `docs/`에
의도적으로 관리합니다 — 방치된 문서가 아니니 추측하기 전에 찾아보세요.

| 하려는 일 | 먼저 볼 것 |
| --- | --- |
| **화면을 손댄다** | [docs/design.md](docs/design.md) — 필수. 아래 참고 |
| 부품을 만든다 | [docs/conventions.md](docs/conventions.md) — 이미 있는 걸 또 만들지 않기 위해 |
| DB·RLS를 건드린다 | [docs/data-model.md](docs/data-model.md) — 위 경고를 먼저 |
| 지금 상태가 궁금하다 | [docs/status.md](docs/status.md) |

### 화면 작업 전 design.md를 보는 이유

값마다 **"원티드 확인값"인지 "우리 값"인지** 구분해 두었습니다. 그게 판단 근거입니다.

**코드 주석보다 design.md가 상위 근거입니다.** 실제로 `ui/Button.tsx` 주석이 "플로팅 버튼은
알약 예외"라는 근거 없는 규칙을 만들어 뒀고, design.md(칩·배지·아바타만 `rounded-full`)가
맞았습니다. 코드와 문서가 어긋나면 대개 코드가 틀린 쪽입니다.

하단 탭바는 **떠 있는 글래스 캡슐**입니다(홈·프로필 둘). 상단 바는 없습니다 — 안전영역
상단은 `Layout` 의 `main` 이 떠안습니다. 화면 하단에 캡슐이 떠서 콘텐츠
위에 겹치므로, 새 화면을 그릴 땐 `PAGE_BOTTOM_PAD`로 하단을 비우세요.

## 명령

```bash
npm run dev      # Vite 개발 서버 (5173)
npm run build    # tsc -b && vite build — 타입 에러면 실패
npm run lint     # eslint. 기존 3건(에러 2·경고 1)이 남아 있습니다 — 리디자인 이전부터입니다
```

⚠ **CSS 토큰이 없어지는 건 타입 에러가 아닙니다.** Tailwind가 클래스를 조용히 안 만들 뿐이라
빌드는 통과하고 화면만 무스타일로 뜹니다.

로그인 뒤 화면은 `/__dev/<key>` 로 확인합니다(`worship` · `profile` · `profile-empty` ·
`profile-setup` · `login` · `nav`). 자세한 건
[docs/status.md](docs/status.md#화면-확인하는-법).

## 이 작업 환경의 제약

**Docker도 psql도 없습니다.** `supabase db reset`·`db dump`가 안 돌아갑니다.

⚠ `db dump`는 Docker가 없으면 **빈 파일을 남기고 실패**합니다. 그 파일을 세면 "0행"이 나와
"데이터 없음"으로 오독하기 쉽습니다. 원격 데이터 확인이 필요하면 대시보드 SQL 에디터를
쓰세요.

**원격 DB 직접 연결도 안 될 수 있습니다** — `db.<ref>.supabase.co` 가 IPv6 전용이라
샌드박스에서 `db push`·`migration list` 가 `Failed to connect` 로 떨어집니다. 그럴 땐
대시보드 SQL 에디터로 마이그레이션 내용을 실행하세요.

### DB 비밀번호

`db push`·`db pull`은 `SUPABASE_DB_PASSWORD`를 요구합니다. `.env.local`에 있습니다
(`.gitignore`의 `.env*`에 걸립니다). **셸이 읽어 CLI에 넘기는 이 패턴으로만** 씁니다:

```bash
set -a; . ./.env.local; set +a; npx supabase db push --dry-run
```

**파일을 열거나 값을 출력하지 마세요** — `cat`·`echo`·`set -x` 전부. 한 번이라도 출력하면
프로덕션 DB 평문 비밀번호가 터미널 기록과 에이전트 대화 로그에 남습니다. AI 에이전트에게
시킬 때 특히 그렇습니다 — 컨텍스트가 요약되고 저장됩니다.

### db push 전에

**`--dry-run`을 먼저 보세요.** 이 저장소엔 `drop cascade` 후 재생성하는 파괴적 마이그레이션이
둘(`events_v2` · `gatherings_v2`) 있습니다. 둘 다 적용됐으니 정상이면 목록에 안 뜹니다 —
**뜬다면 데이터가 날아간다는 신호입니다.**

지금은 미적용 마이그레이션이 **둘** 있는 게 정상입니다 — `20260828000000_restore_worship_schema.sql`
(스키마 복구)과 `20260828010000_avatar_storage_policy.sql`(아바타 Storage 정책). 순서대로
적용해야 합니다. 그 외가 뜨면 멈추고 확인하세요.

## 코드 규칙

주석과 UI 문자열은 **한국어**입니다. 나머지는 [docs/conventions.md](docs/conventions.md).

## 문서를 같이 갱신하세요

코드를 바꿨으면 해당 문서도 고칩니다. 특히 [docs/status.md](docs/status.md)가 가장 빨리 낡습니다.
**"적용됨/미적용" 같은 시점 서술은 드리프트하니 문서를 믿지 말고 확인하세요** — 실제로
status.md가 이미 적용된 마이그레이션을 "미적용"이라고 한 채 남아 있었습니다.
