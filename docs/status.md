# 기능 진행 상태

2026-08-28 기준. 코드를 읽어 확인한 사실만 적었습니다.

## 이 앱이 하는 일

**찬양팀 일정 조율 하나입니다.** 멤버가 주일마다 자기 포지션에 "설 수 있음"을 토글로 표시하고,
누가 어느 자리에 서는지 함께 봅니다. 그 외 기능은 폐기됐거나 관리자 iOS 앱으로 넘어갔습니다.

| 기능 | 상태 | 근거 |
| --- | --- | --- |
| 인증 (구글 OAuth) | 동작 | `authStore` + `ProtectedRoute` |
| 찬양팀 일정 | **핵심 기능** | `/worship`, Realtime 반영 |
| 프로필 (이름·팀·포지션·연락처) | 동작 | `/member/setup`, `/profile` |
| 하단 탭바 (찬양팀·내정보) | 동작 | `Layout`이 `TAB_BAR_ROUTES`에서 렌더 |
| 소모임 | **폐기** | 2026-08-28 코드 제거 |
| 비용 청구 | **폐기** | 관리자 앱 + 공개 청구 폼(`nanuri-form`)으로 이관 |
| 행사 · 갤러리 · 회계 · 통계 · 순서별 평가 | **폐기** | 2026-07 중 제거 |
| 웹 푸시 알림 | 미구현 | 관련 코드 없음 |

## ⚠ 2026-08-13 스키마 삭제 사고

**이 저장소의 DB 테이블이 전부 지워졌고 데이터는 복구하지 못했습니다.** 앞으로의 판단에
계속 영향을 주는 사실이라 맨 앞에 둡니다.

### 무슨 일이 있었나

이 웹앱은 관리자 iOS 앱 **NanuriAdmin**(`~/Desktop/SwiftUI-Project/NanuriAdmin`)과 **같은
Supabase 프로젝트**(`ciszaukmnglepvqpulya`)를 씁니다. 그쪽 저장소의
`20260813120000_reset_schema.sql` 이 이렇게 시작합니다:

```sql
-- 주의: public 스키마의 모든 객체(과거 설문 테이블 등 포함)를 삭제한다.
drop schema public cascade;
create schema public;
```

그 파일의 전제는 **"멤버용 웹은 폐지"** 였습니다. 사고가 아니라 의도적인 재설계였고, 다만
이 웹앱이 살아 있다는 사실이 그 전제에서 빠져 있었습니다. 결과로 `user_profiles`,
`worship_schedules`, `worship_availability`, `gatherings*` 가 전부 사라졌습니다.

### 잃은 것과 남은 것

- ❌ **모든 행 데이터.** 백업 보존 기간(7일)이 지나 복구 불가. 과거 찬양팀 참여 기록·프로필은
  영구 소실입니다.
- ❌ **`worship_*` 테이블 정의.** 이 저장소엔 원래 마이그레이션이 없었습니다(원격에만 존재).
  코드의 쿼리에서 역추정해 다시 썼습니다.
- ✅ **`auth.users` 계정 전부.** `auth` 스키마는 `public` 이 아니라 안 지워졌습니다.
  사람들은 다시 로그인할 수 있습니다.
- ✅ **`supabase_migrations` 이력.** 역시 별도 스키마라 살아남았습니다 — 그래서 **옛
  마이그레이션은 "적용됨"으로 남아 있고 `db push` 로 다시 돌릴 수 없습니다.** 복구를 새
  파일로 앞으로 감은 이유입니다.

### 복구 마이그레이션

[`20260828000000_restore_worship_schema.sql`](../supabase/migrations/20260828000000_restore_worship_schema.sql)
한 장이 `user_profiles` · `public_profiles` 뷰 · `worship_schedules` · `worship_availability` 를
다시 세우고, `auth.users` 로부터 프로필 행을 백필하고, 가입 트리거를 고칩니다.
뒤이어 [`20260828010000_avatar_storage_policy.sql`](../supabase/migrations/20260828010000_avatar_storage_policy.sql)
이 아바타용 Storage 정책을 얹습니다(Cloudflare 를 끊으면서 필요해졌습니다). **순서대로 둘 다**
적용해야 합니다 — 뒤 파일이 `user_profiles` 를 참조합니다.

> **⚠ 아직 원격에 적용하지 않았습니다.** 이 작업 환경에서 원격 DB 로 직접 연결이 안 됩니다
> (`db.<ref>.supabase.co` 가 IPv6 전용). 적용 방법은 아래 "복구 마이그레이션 적용하기".

### 다시 안 겪으려면

**`public` 스키마는 두 앱의 공유 공간입니다.** 어느 쪽 저장소에서든 `drop`·`db reset` 을 하기
전에 반대쪽이 쓰는 테이블인지 확인하세요. 두 저장소의 `supabase/migrations/` 는 서로를 모르지만
**원격의 마이그레이션 이력은 하나로 섞입니다.**

지금 각자의 몫은 이렇습니다.

| 테이블 | 주인 |
| --- | --- |
| `user_profiles` · `public_profiles` · `worship_schedules` · `worship_availability` | **이 웹앱** |
| `admins` · `profiles` · `bills` · `finance_*` · `device_tokens` | **NanuriAdmin** — 건드리지 말 것 |
| `auth.users` · `public.handle_new_user()` | **공유** — 고칠 땐 양쪽 다 확인 |

## 복구 마이그레이션 적용하기

`--dry-run` 으로 목록을 먼저 보세요. 뜨는 파일이 **`20260828` 로 시작하는 둘**이어야 정상입니다.

```bash
set -a; . ./.env.local; set +a; npx supabase db push --dry-run
```

```bash
set -a; . ./.env.local; set +a; npx supabase db push
```

연결이 안 되면(이 저장소의 샌드박스에서 그렇습니다) 대시보드 SQL 에디터에 파일 내용을 붙여
실행해도 됩니다. 다만 그렇게 하면 `supabase_migrations` 이력에 안 남으므로, 다음 `db push` 가
같은 파일을 다시 밀려고 합니다 — 파일이 `if not exists` · `drop policy if exists` ·
`on conflict do nothing` 으로 재실행에 견디게 쓰여 있어 두 번 돌아도 안전합니다.

### 적용한 뒤 사람이 해야 하는 일

**포지션과 팀은 되살아나지 않습니다.** `auth.users` 에 없던 값이라 백필이 못 채웁니다.
둘 중 하나를 하세요.

- **각자 채우기** — 로그인하면 `ProtectedRoute` 가 `/member/setup` 으로 보내고, 그 화면이
  이름·팀·포지션을 한 번에 받습니다. 아무 조치 없이도 도는 경로입니다.
- **대시보드에서 채우기** — 백필이 행을 미리 만들어 두므로 `user_profiles` 에서
  `position` · `team` 만 채우면 됩니다. UUID 를 손으로 옮길 필요가 없습니다.

`position` 이 비면 그 사람은 **찬양팀 시트에 아예 안 뜹니다**(쿼리가
`.not("position", "is", null)` 로 거릅니다). 내정보 화면이 이 상태를 안내하도록 해뒀습니다.

### 적용 후 확인할 것

로그인 뒤에만 밟히는 경로라 프리뷰로는 확인할 수 없습니다.

1. 신규 계정 로그인 → 가입이 되는가 (옛 트리거는 "관리자 계정이 아닙니다" 로 막았습니다)
2. `/member/setup` 저장 → `user_profiles` 에 행이 남는가
3. `/worship` 에서 내 슬롯 토글 → `worship_availability` 에 반영되는가
4. **교체** — 남이 이미 선 자리를 누르면 확인창이 뜨고, 확인하면 그 사람이 내려가는가
   (RLS 를 좁혔습니다. 아래 참고)
5. 다른 기기 둘로 열어 토글 → Realtime 으로 즉시 반영되는가

## 찬양팀 RLS — 옛 구멍을 좁혔습니다

옛 DB 에는 `worship_availability` UPDATE 정책이 둘이었고 하나가
`qual = (auth.uid() is not null)` 이라 **로그인한 누구나 남의 참여 행을 아무 값으로나 바꿀 수**
있었습니다. 다시 만들면서 좁혔습니다.

```sql
using      (멤버면 남의 행도 집을 수 있다)
with check (user_id = auth.uid() or available = false)
```

**"본인 행만" 으로 막으면 안 됩니다.** [`useToggleAvailability`](../src/hooks/useToggleAvailability.ts)의
"교체" 가 같은 포지션에 먼저 등록된 사람의 행을 `available: false` 로 내리기 때문입니다.
새 정책은 남의 행을 **내리는 것만** 허용합니다 — 올리거나 다른 값으로 바꾸는 건 막힙니다.

⚠ 원격에 적용해 실제로 눌러본 적은 아직 없습니다. 교체가 안 되면 여기부터 의심하세요.

## 원티드 디자인 시스템 개편 — 사실상 완료

기능(훅·쿼리·RLS)은 두고 시각 레이어만 원티드 디자인 시스템으로 옮기는 작업이었습니다.
남아 있던 옛 디자인 화면(홈·비용 청구·관리자·소모임)이 **범위 축소로 통째로 사라져서**,
지금 살아 있는 화면은 전부 새 디자인입니다.

디자인 룰·토큰·측정값은 [design.md](design.md)에 있습니다. **화면을 손대기 전에 먼저 보세요.**

| 화면 | 상태 |
| --- | --- |
| 찬양팀 시트 (`WorshipSchedulePage` · `PositionSlot`) | 완료 |
| 내정보 (`ProfilePage`) | 완료 — 포지션 카드로 재작성 |
| 프로필 편집 (`MemberProfileSetupPage`) | 완료 — 은행·계좌 제거 |
| 하단 탭바 · 상단 바 (`TopBar`) | 완료 |
| `ui/` 프리미티브 6종 + `BackButton` | 완료 |
| 게이트 · 로그인 (`GatePage` · `MemberLoginPage`) | **미완** — 옛 토큰 6건 |
| `LoadingScreen` · `LoadingSpinner` | **미완** — 옛 토큰 3건 |

남은 잔재는 이제 이만큼입니다(`index.css` 17건은 폐기 예정 블록 자체라 오탐,
`DevPreviewPage` 6건은 개발 전용 화면).

```bash
# 옛 토큰
grep -rnE "text-fg|bg-card|bg-surface|bg-sunken|text-accent|bg-accent|rounded-tile|rounded-panel|shadow-card|shadow-lift|shadow-accent|text-caption[^0-9]|text-body[^0-9]|text-heading|text-emphasis|text-micro|text-title[^0-9]|text-display|text-info|text-danger|text-success|border-line[^-]|bg-inverse" src/

# 다크 잔재 (폐기된 다크 재디자인의 하드코딩 hex)
grep -rnE "#f0f2f8|#8892a0|#6b7785|#0f1117|#4a5568|#c0c8d4|#363d47|rgba\(255,\s*255,\s*255,\s*0\.|colorScheme:\s*\"dark\"" src/
```

다크 잔재는 `main.tsx` 1건과 `nav/creatures.tsx` 1건(주석이라 오탐)뿐입니다.

### 옛 토큰 블록 지우는 법

`index.css` 의 `@theme` 안에 폐기 예정 블록이 남아 있습니다. 위 두 화면을 옮기고 나면
블록째 지울 수 있습니다.

⚠ **토큰을 지워도 빌드는 통과합니다.** Tailwind 가 클래스를 조용히 안 만들 뿐이라 화면이
무스타일로 뜹니다.

⚠ **그 블록이 파일 뒤쪽이라 새 토큰을 덮을 수 있습니다.** 실제로 옛 `--radius-card`(20)가
새 값(16)을 덮고 있었습니다. 같은 이름을 양쪽에 두지 마세요.

## 화면 확인하는 법

바꾼 화면은 눈으로 확인할 수 있습니다. 앱 안의 브라우저 도구로 `localhost:5173` 을 열거나,
**Claude in Chrome** 확장이 연결돼 있으면 로그인된 세션을 그대로 씁니다.

반대로 게이트·로그인은 **로그인돼 있으면** 리다이렉트돼 볼 수 없습니다. 방향이 반대인 두
문제라 개발 전용 미리보기를 뒀습니다 — [`src/pages/dev/DevPreviewPage.tsx`](../src/pages/dev/DevPreviewPage.tsx)가
`main.tsx` 에서 앱 라우터 **대신** 마운트되고, `authStore` 와 쿼리 캐시를 원하는 상태로 꾸며
띄웁니다. `import.meta.env.DEV` 게이트라 프로덕션 번들에는 들어가지 않습니다.

현재 화면: `nav` · `topbar` · `gate` · `login` · `worship` · `profile` ·
`profile-empty`(포지션 없는 상태) · `profile-setup`. 경로 없이 `/__dev/` 로 가면 목록이 뜹니다.

목 데이터를 추가할 때 주의할 점:

- **`Seed` 가 `staleTime: Infinity` 를 같이 박는 게 핵심입니다.** 캐시에 심기만 하면, 훅에
  `staleTime` 이 없는 쿼리는 마운트하자마자 재조회하고 로그인이 없어 **빈 배열이 성공으로**
  돌아오면서 목 데이터를 조용히 덮어씁니다. 화면이 계속 "빈 상태"로 보이면 십중팔구 이겁니다.
- **화면이 읽는 쿼리를 다 심어야 합니다.**
- 상대 시각 데이터는 **오늘 기준으로 만드세요.** 고정 날짜로 두면 시간이 지나 과거로 굳습니다.
- **`Phone` 래퍼는 실제 셸(`Layout`)의 스크롤 구조를 흉내 냅니다** — 바깥 `h-dvh overflow-hidden`
  + 안쪽 `flex-1 overflow-y-auto`. 그래야 `sticky` 가 실제 앱과 똑같이 스크롤 영역에 붙습니다.

**스크린샷 함정 둘**:

1. 화면마다 등장 애니메이션(`initial={{ opacity: 0 }}`)이 있어 **첫 장이 빈 화면·반투명으로
   찍힙니다.** 한 번 더 찍으세요. 빈 화면을 보고 "렌더가 안 된다"고 진단하지 마세요.
2. 창 크기가 스크린샷 사이에 바뀔 수 있습니다. 클릭 좌표는 **바로 직전 장** 기준으로 잡으세요.

**DOM 을 잴 때 함정 하나 더**: 상태가 바뀐 직후 값을 읽으면 React 커밋 전이거나
`transition-colors` 전환 중이라 **옛 값이 잡힙니다.** 넉넉히 기다리고 재세요.

## 알려진 정리 대상

- **마이그레이션 공백** — `admins`·`profiles`·`bills`·`finance_*` 는 NanuriAdmin 저장소에
  정의가 있습니다. 이 저장소 것은 이제 복구 마이그레이션에 다 있습니다.
- ~~**Worker 인증 없음**~~ — 2026-08-28 **이 앱 기준으로는** 해결. 아바타를 Supabase Storage
  로 옮기고 Cloudflare 를 끊었습니다([architecture.md](architecture.md#cloudflare-를-끊은-이유)).
  ⛔ **다만 Cloudflare 자원은 하나도 지우면 안 됩니다** — Worker `nanuri-bill` 과 R2 버킷
  `nanuri-bills` 를 관리자 앱이 아직 씁니다(배포된 `nanuri-form` 이 `nanuri-bill` 을 서비스
  바인딩으로 부릅니다). 그 무인증 Worker 는 관리자 앱 쪽 숙제로 남습니다.
- **`line-solid` 대비 1.19** — 인풋 테두리가 흰 면에서 거의 안 보입니다(WCAG 1.4.11 은 3:1
  요구). 원티드 원본값이라 미해결로 뒀습니다. ([design.md](design.md))
- **린트 3건** — `ConfirmDialog`·`main.tsx` 에 있으며 리디자인 이전부터입니다(`npm run lint`).
- **`nav/creatures.tsx` 에 안 쓰는 크리처 4종** — 탭이 둘로 줄면서 `home`·`schedule`·
  `gallery`·`admin` 이 놀고 있습니다. 그림이라 지우진 않았습니다.
