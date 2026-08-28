import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import LoadingScreen from "./LoadingScreen";

interface Props {
  children: React.ReactNode;
  memberOnly?: boolean;
  setupPage?: boolean;
}

export default function ProtectedRoute({ children, memberOnly, setupPage }: Props) {
  const { user, isAnonymous, userProfile, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/" />;

  if (memberOnly && isAnonymous) return <Navigate to="/" />;

  // 프로필이 없거나 이름이 비면 먼저 채우게 한다. 찬양팀 시트는 포지션·팀을 읽어
  // 슬롯을 그리므로, 프로필이 빈 채로 들어오면 화면이 비어 보인다.
  // setupPage 면 이 검사를 건너뛴다 — 아니면 설정 화면이 자기 자신으로 무한 리다이렉트한다.
  if (!setupPage && memberOnly && !isAnonymous && (!userProfile || !userProfile.name)) {
    return <Navigate to="/member/setup" />;
  }

  return <>{children}</>;
}
