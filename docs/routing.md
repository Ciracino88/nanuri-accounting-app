# 라우팅과 권한

라우트 정의: [src/router/index.tsx](../src/router/index.tsx) · 가드: [src/components/ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx)

> `/__dev/*`는 이 라우터에 없습니다. [main.tsx](../src/main.tsx)가 개발 서버에서만 `RouterProvider` **대신** [`DevPreviewPage`](../src/pages/dev/DevPreviewPage.tsx)를 마운트하는 별도 분기입니다 — 라우터 바깥이어야 미리보기가 `MemoryRouter`로 경로와 인증 상태를 꾸밀 수 있기 때문입니다(라우터는 중첩이 안 됩니다).

## 화면 흐름은 한 줄입니다

이 앱이 하는 일이 찬양팀 일정 조율 하나라, 갈림길도 하나뿐입니다.

```
비로그인             →  /               구글 로그인 버튼 하나
로그인 · 포지션 없음  →  /member/setup   프로필 편집
로그인 · 포지션 있음  →  /worship        시트 (= 홈)
```

갈림길은 전부 `ProtectedRoute`가 만듭니다.

## 라우트 목록

| 경로 | 페이지 | 가드 | 설명 |
| --- | --- | --- | --- |
| `/` | `LoginPage` | 없음 | 구글 OAuth 버튼 하나 |
| `/worship` | `WorshipSchedulePage` | `memberOnly` | 찬양팀 시트. **로그인 착지점**이자 탭바의 "홈" |
| `/profile` | `ProfilePage` | `memberOnly` | 프로필 — 포지션 확인·로그아웃 |
| `/member/setup` | `MemberProfileSetupPage` | `memberOnly` + `setupPage` | 프로필 편집 |

`setupPage` 플래그는 프로필 미완성 검사를 건너뛰기 위한 것입니다. 이게 없으면 설정 페이지 자신이 무한 리다이렉트에 빠집니다.

> **옛 게이트(`GatePage`)는 없앴습니다.** "나누리 멤버입니다 / 외부 사용자입니다"를 묻던
> 화면인데, 외부 사용자 쪽이 "준비 중" 토스트만 띄워 **고를 것이 없는 선택지**였습니다.
> 이제 `/`가 곧 로그인 화면입니다.
>
> **관리자 라우트도 없습니다.** 청구·회계는 관리자 iOS 앱으로 넘어갔습니다.
> `user_profiles.role` 컬럼은 DB 에 남아 있지만 이 앱은 읽지 않습니다.

## 가드 규칙

`ProtectedRoute`는 위에서부터 순서대로 검사하며, 먼저 걸리는 조건이 이깁니다.

1. `isLoading` → `LoadingScreen` (세션 복원 중 깜빡임 방지)
2. `!user` → `/`
3. `memberOnly && isAnonymous` → `/` (게스트 차단)
4. `!setupPage && memberOnly && (이름 없음 || 포지션 없음)` → `/member/setup`

### 4번이 **포지션까지** 보는 이유

찬양팀 시트는 `position` 이 null 인 사람을 쿼리에서 아예 거릅니다
(`.not("position", "is", null)`). 포지션 없이 들어오면 **자기 자리가 없는 화면**을 보게 되고,
화면 어디에도 이유가 안 나오니 고장으로 읽힙니다.

이름만 검사하면 이 구멍이 열립니다. 실제로 2026-08-13 스키마 삭제 뒤 백필이 구글 메타데이터의
이름만 채워서 **전원이 그 상태**였습니다.

⚠ 그래서 [`MemberProfileSetupPage`](../src/pages/MemberProfileSetupPage.tsx)는 포지션을
**필수**로 받습니다. 비운 채 저장하게 두면 저장 → 가드가 되돌려보냄 → 저장의 무한 루프입니다.

⚠ 4번은 저장할 테이블이 있어야 성립합니다. `user_profiles`가 없으면 저장이 실패하고 →
프로필이 여전히 없고 → 다시 설정 화면으로 오는 무한 루프가 됩니다. 2026-08-13 사고 때 실제로
이 증상이 났습니다([status.md](status.md#-2026-08-13-스키마-삭제-사고)).

권한의 근거인 `userProfile`은 클라이언트 상태이므로 **UI 가드일 뿐 보안 경계가 아닙니다.**
실제 차단은 RLS 가 합니다([data-model.md](data-model.md)).

## 익명(게스트) 로그인

Supabase 익명 로그인을 쓰며 `user.is_anonymous`로 구분합니다. 게스트가 들어갈 수 있는 보호
라우트는 없습니다 — `Layout` 하위가 전부 `memberOnly`입니다. 게스트를 만드는 진입로도 이제
없습니다(게이트와 함께 사라졌습니다).

**게스트를 "멤버"로 착각하지 않게 하는 건 DB 쪽 규칙입니다.** 익명 로그인도 `authenticated`
롤을 받으므로 `to authenticated` 로는 구분이 안 됩니다. 멤버 판별은 `user_profiles` 행의
존재로 합니다 — 그래서 가입 트리거가 익명 계정에는 프로필 행을 만들지 않습니다.

## 셸과 착지점

`Layout`이 **떠 있는 글래스 캡슐** 탭바를 `TAB_BAR_ROUTES`(`/worship` · `/profile`)에서
렌더합니다. 탭은 둘입니다: **홈 · 프로필**. 홈은 `/worship`(시트)입니다 — 경로 이름은 그대로
뒀습니다. 바꿔서 얻을 게 없고 옛 링크만 깨집니다.

**상단 바는 없앴습니다.** 로고·알림·메뉴가 있었는데 알림과 메뉴는 도착지가 없는 자리만이었고,
화면이 둘뿐인 앱에서 로고 하나를 위해 세로 공간을 내줄 이유가 없었습니다. 그래서
**안전영역 상단은 이제 `main` 이 떠안습니다** — 예전엔 상단 바가 졌습니다.

**로그인 착지점은 `/worship`입니다.** 두 군데에 적혀 있습니다 — `LoginPage` 의 로그인 상태
리다이렉트와 구글 OAuth 의 `redirectTo`. 하나만 고치면 로그인 직후에만 엉뚱한 곳으로 가는,
눈에 잘 안 띄는 버그가 됩니다.

탭 색은 **활성=Primary 파랑, 비활성=회색**입니다. 비활성 탭은 `color` prop 자체를 회색으로
넘기는데, 캐릭터 눈동자가 이 prop을 쓰기 때문에 Primary 를 항상 넘기면 비활성 탭에도 파란
눈동자가 남아 "Primary=상호작용" 규칙이 깨지기 때문입니다.
