# 라우팅과 권한

라우트 정의: [src/router/index.tsx](../src/router/index.tsx) · 가드: [src/components/ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx)

> `/__dev/*`는 이 라우터에 없습니다. [main.tsx](../src/main.tsx)가 개발 서버에서만 `RouterProvider` **대신** [`DevPreviewPage`](../src/pages/dev/DevPreviewPage.tsx)를 마운트하는 별도 분기입니다 — 라우터 바깥이어야 미리보기가 `MemoryRouter`로 경로와 인증 상태를 꾸밀 수 있기 때문입니다(라우터는 중첩이 안 됩니다). 자세한 용도는 [status.md](status.md)의 "화면 확인하는 법"을 보세요.

이 앱이 하는 일은 **찬양팀 일정 조율 하나**입니다. 라우트가 다섯 개뿐인 건 그래서입니다.

## 라우트 목록

### 공개

| 경로 | 페이지 | 설명 |
| --- | --- | --- |
| `/` | `GatePage` | 진입점. 멤버 로그인/외부 사용자 선택 |
| `/member/login` | `MemberLoginPage` | 구글 OAuth 로그인 |

### 멤버 전용 (`memberOnly` + `Layout`)

| 경로 | 페이지 | 설명 |
| --- | --- | --- |
| `/worship` | `WorshipSchedulePage` | 찬양팀 일정. **로그인 착지점** |
| `/profile` | `ProfilePage` | 내 정보 — 포지션 확인·로그아웃 |

### 프로필 설정 (`memberOnly` + `setupPage`)

| 경로 | 페이지 |
| --- | --- |
| `/member/setup` | `MemberProfileSetupPage` |

`setupPage` 플래그는 프로필 미완성 검사를 건너뛰기 위한 것입니다. 이게 없으면 설정 페이지 자신이 무한 리다이렉트에 빠집니다.

> **관리자 라우트는 없습니다.** `/admin`은 청구·회계 "준비 중" 플레이스홀더뿐이었고 그 두 기능은
> 관리자 iOS 앱(NanuriAdmin)으로 넘어갔습니다. `adminOnly` 가드도 함께 지웠습니다.
> `user_profiles.role` 컬럼은 DB 에 남아 있지만 이 앱은 읽지 않습니다.

## 가드 규칙

`ProtectedRoute`는 위에서부터 순서대로 검사하며, 먼저 걸리는 조건이 이깁니다.

1. `isLoading` → `LoadingScreen` (세션 복원 중 깜빡임 방지)
2. `!user` → `/`
3. `memberOnly && isAnonymous` → `/` (게스트 차단)
4. `!setupPage && memberOnly && 프로필 이름 없음` → `/member/setup`

4번이 이 앱에서 특히 중요합니다. 찬양팀 시트는 `position`·`team`을 읽어 슬롯을 그리므로
**프로필이 비면 화면이 텅 빈 채로 뜹니다.** 그래서 먼저 채우게 보냅니다.

⚠ 4번은 저장할 테이블이 있어야 성립합니다. `user_profiles`가 없으면 설정 화면에서 저장이
실패하고 → 프로필이 여전히 없고 → 다시 설정 화면으로 오는 **무한 루프**가 됩니다. 2026-08-13
스키마 삭제 사고 때 실제로 이 증상이 났습니다([status.md](status.md#2026-08-13-스키마-삭제-사고)).

권한의 근거인 `userProfile`은 클라이언트 상태이므로 **UI 가드일 뿐 보안 경계가 아닙니다.**
실제 차단은 RLS 가 합니다([data-model.md](data-model.md)).

## 익명(게스트) 로그인

Supabase 익명 로그인을 쓰며 `user.is_anonymous`로 구분합니다. 게스트가 들어갈 수 있는 보호
라우트는 없습니다 — `Layout` 하위가 전부 `memberOnly`입니다. 게이트의 "외부 사용자입니다"는
지금 안내 토스트만 띄웁니다.

**게스트를 "멤버"로 착각하지 않게 하는 건 DB 쪽 규칙입니다.** 익명 로그인도 `authenticated`
롤을 받으므로 `to authenticated` 로는 구분이 안 됩니다. 멤버 판별은 `user_profiles` 행의
존재로 합니다 — 그래서 가입 트리거가 익명 계정에는 프로필 행을 만들지 않습니다.

## 하단 탭바와 착지점

`Layout`이 **떠 있는 글래스 캡슐** 탭바를 `TAB_BAR_ROUTES`(`/worship` · `/profile`)에서
렌더합니다. 탭은 둘입니다: **찬양팀 · 내정보**. 프로필 편집은 `BackButton` 으로 돌아가는
하위 화면이라 탭바를 숨깁니다.

**로그인 착지점은 `/worship`입니다.** 게이트·로그인 페이지의 리다이렉트와 구글 OAuth 의
`redirectTo` 가 모두 이 경로를 가리킵니다. 셋 중 하나만 고치면 로그인 직후에만 엉뚱한 곳으로
가는, 눈에 잘 안 띄는 버그가 됩니다.

색은 **활성=Primary 파랑, 비활성=회색**입니다. 비활성 탭은 `color` prop 자체를 회색으로
넘기는데, 캐릭터 눈동자가 이 prop을 쓰기 때문에 Primary 를 항상 넘기면 비활성 탭에도 파란
눈동자가 남아 "Primary=상호작용" 규칙이 깨지기 때문입니다.
