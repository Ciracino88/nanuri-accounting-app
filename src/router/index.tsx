// src/router/index.tsx
import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/auth/LoginPage";
import MemberProfileSetupPage from "../pages/MemberProfileSetupPage";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/Layout";
import ProfilePage from "../pages/ProfilePage";
import WorshipSchedulePage from "../pages/worship/WorshipSchedulePage";

// 이 앱이 하는 일은 찬양팀 일정 조율 하나다. 화면 흐름도 한 줄이다.
//
//   비로그인            → "/"            구글 로그인 버튼 하나
//   로그인 · 포지션 없음 → "/member/setup" 프로필 수정
//   로그인 · 포지션 있음 → "/worship"      시트(홈)
//
// 갈림길은 ProtectedRoute 가 만든다. 옛 게이트("나누리 멤버" / "외부 사용자")는
// 없앴다 — 외부 사용자 경로가 안내 토스트뿐이라 고를 것이 없는 선택지였다.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute memberOnly>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/worship", element: <WorshipSchedulePage /> },
      { path: "/profile", element: <ProfilePage /> },
    ],
  },
  {
    // 프로필이 덜 찼으면 ProtectedRoute 가 여기로 보낸다. 그래서 이 라우트만
    // 프로필 검사를 건너뛴다(setupPage) — 아니면 자기 자신으로 무한 리다이렉트한다.
    element: (
      <ProtectedRoute memberOnly setupPage>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/member/setup", element: <MemberProfileSetupPage /> },
    ],
  },
]);
