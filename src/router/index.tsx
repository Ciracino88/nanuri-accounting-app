// src/router/index.tsx
import { createBrowserRouter } from "react-router-dom";
import GatePage from "../pages/auth/GatePage";
import MemberLoginPage from "../pages/auth/MemberLoginPage";
import MemberProfileSetupPage from "../pages/MemberProfileSetupPage";
import ProtectedRoute from "../components/ProtectedRoute";
import Layout from "../components/Layout";
import ProfilePage from "../pages/ProfilePage";
import WorshipSchedulePage from "../pages/worship/WorshipSchedulePage";

// 이 앱이 하는 일은 찬양팀 일정 조율 하나다. 로그인 착지점은 /worship 이다.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <GatePage />,
  },
  {
    path: "/member/login",
    element: <MemberLoginPage />,
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
    // 프로필이 없으면 ProtectedRoute 가 여기로 보낸다. 그래서 이 라우트만 프로필 검사를
    // 건너뛴다(setupPage) — 아니면 자기 자신으로 무한 리다이렉트한다.
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
