# 코드 규칙과 재사용 카탈로그

새로 만들기 전에 여기 있는 걸 먼저 찾아보세요.

**색·타입·반경·그림자 같은 디자인 규칙은 여기 없습니다** — [design.md](design.md)로 갔습니다.
이 문서는 "어떤 부품이 이미 있는가"와 "코드를 어떻게 쓰는가"만 다룹니다.

## 공용 컴포넌트

| 컴포넌트 | 용도 |
| --- | --- |
| `Layout` | 보호 라우트의 셸. **탭바를 렌더하지 않습니다** ([status.md](status.md)) |
| `ProtectedRoute` | 인증·권한 가드 ([routing.md](routing.md)) |
| `BottomNav` | 옛 하단 5탭. **`DevPreviewPage`만 씁니다** — 앱에서는 죽은 코드 |
| `BackButton` | 뒤로가기 — 페이지마다 제각각이던 걸 통일한 공용 버전 |
| `PageContainer` | 페이지 래퍼 |
| `LoadingScreen` / `LoadingSpinner` | 전체 화면 / 인라인 로딩. `LoadingScreen`은 `LoadingSpinner`를 감싸기만 합니다 — 스피너를 또 만들지 마세요 |
| `ConfirmDialog` | `confirmDialog()` 명령형 호출로 확인 모달 |
| `worship/PositionSlot` | 찬양팀 포지션 슬롯 |

### `ui/` 프리미티브

`Button`, `TextField`, `TextArea`, `SelectField`, `ActionRow`, `BottomSheet`.
**여섯 다 원티드로 이식됐습니다** — 아직 안 그린 옛 화면에도 새 인풋·버튼이 이미 뜹니다.
섞여 보이는 건 버그가 아니라 이 순서 때문입니다.

- **`ActionRow`가 앱 표준 리스트 아이템입니다** — 아이콘 타일 + 제목/설명 + 화살표.
  **목록 UI를 새로 만들지 말고 이걸 쓰세요.** 리스트가 정갈해 보이는 건 아이콘이 아니라
  왼쪽 사각형이 같은 크기로 반복되기 때문입니다. 타일 색은 하나뿐입니다(카테고리 색 폐기).
- `Button` variant는 `primary` / `outline` / `danger`. **한 화면에 `primary`는 하나만** 둡니다.
  `loading`을 주면 스피너가 붙고 문구는 남습니다 — 다른 문구를 쓰려면 `loadingText`를 주세요.
- `TextField`/`TextArea`/`SelectField`는 **주제(라벨) → 인풋 → 메시지(헬퍼)** 3단 구조입니다.
  `error`를 주면 빨간 테두리 + (!) 아이콘 + 빨간 문구가 같이 뜹니다 — **색 하나에 의미를
  걸지 않는 게 의도**입니다. `helper`는 `error`가 있으면 가려집니다.
- **`SelectField`는 `multiple`로 다중 선택이 됩니다** — `multiple`을 주면 `value`/`onChange`가
  `string[]`로 바뀌는 판별 유니온입니다(안 주면 기존 단일 선택 그대로). 다중일 때 트리거는 고른
  값을 **선택 순서대로 ` & `로 이어** 보여주고(예: `어쿠스틱 & 싱어1`), 목록은 골라도 안 닫힙니다.
  프로필 편집의 포지션 선택이 이걸 씁니다.
- **`BottomSheet`가 아래에서 올라오는 시트의 껍데기입니다** (딤·손잡이·제목·닫기).
  안쪽 폼만 children으로 넣으세요. **`AnimatePresence` 안에서 조건부로 렌더해야** 닫힘
  애니메이션이 돕니다.

## 훅

훅은 셋뿐입니다. 앱이 하는 일이 하나라서입니다.

| 훅 | 용도 |
| --- | --- |
| `useWorshipSchedule` | 월별 주일 일정 + 멤버 + 참여 현황, Realtime 구독. 쿼리 키는 `["worship", year, month]` |
| `useToggleAvailability` | 포지션 참여 토글 (낙관적 캐시 갱신 + 중복 시 교체 확인) |
| `useCalendar` | 달력 월 이동 상태 (`useReducer`) |

## 유틸

| 파일 | 내용 |
| --- | --- |
| `lib/supabase.ts` | Supabase 클라이언트 (단일 인스턴스) |
| `lib/uploadAvatar.ts` | 압축 + Supabase Storage 업로드 → 공개 URL. 경로 첫 폴더가 본인 uid 여야 정책을 통과합니다 |

## 상수

| 파일 | 내용 |
| --- | --- |
| `constants/theme.ts` | `ACCENT`(Primary) · `MUTED`. **Tailwind 클래스를 못 쓰는 자리(인라인 `style`, SVG `fill`)에서만** 씁니다 |
| `constants/layout.ts` | `PAGE_BOTTOM_PAD` — 떠 있는 탭바에 가리지 않도록 페이지가 확보하는 하단 여백 |
| `constants/worship.ts` | `POSITIONS` — 포지션 10종. 프로필 편집 셀렉터와 찬양팀 시트 슬롯이 같은 배열을 씁니다 |

## 찬양팀 데이터는 한 쿼리에 셋이 붙어 있습니다

`useWorshipSchedule` 하나가 **주일 목록 · 멤버 · 참여 현황**을 같이 읽어
`{ schedules, members, availability }` 로 돌려줍니다. 쪼개지 않은 이유는 셋이 항상 같이
쓰이고(슬롯 하나를 그리는 데 셋 다 필요) 캐시 무효화도 같이 일어나기 때문입니다.

주의할 점 둘입니다.

- **`members` 는 `user_profiles` 가 아니라 `public_profiles` 뷰에서 옵니다.** 타인의 연락처가
  새지 않게 하는 경계입니다([data-model.md](data-model.md)). 바꾸지 마세요.
- **이 훅은 읽기만 하지 않습니다.** 호출될 때마다 앞뒤 넉 달치 주일을 `worship_schedules` 에
  upsert 합니다. 화면을 여는 것이 곧 일정 테이블을 채우는 것이라, 이 테이블이 비어도
  저절로 복구됩니다.

## 코드 규칙

- 주석과 UI 문자열은 한국어입니다.
- 굵기는 `font-semibold`(600) 기준, 헤드라인은 `font-bold`(700).
- 페이지는 도메인별 폴더(`pages/<domain>/`)로 묶습니다.
- 파일 상단 경로 주석(`// src/router/index.tsx`)은 일부 파일에만 있습니다 — 일관된 규칙이 아닙니다.
- 애니메이션은 `motion/react`, 토스트는 `react-hot-toast`, 아이콘은 `lucide-react`
  (+ 일부 `@heroicons/react`)를 씁니다.
- `npm run build`는 `tsc -b` 후 `vite build`라 **타입 에러가 있으면 빌드가 실패**합니다.
  다만 **CSS 토큰이 없어지는 건 타입 에러가 아니라** 조용히 통과합니다([design.md](design.md)).
