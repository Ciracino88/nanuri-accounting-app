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

  // 이름과 포지션이 다 있어야 시트로 보낸다.
  //
  // **포지션까지 보는 게 핵심이다.** 찬양팀 시트는 position 이 null 인 사람을
  // 쿼리에서 아예 거르므로(`.not("position","is",null)`), 포지션 없이 들어오면
  // 자기 자리가 없는 화면을 보게 된다. 이름만 검사하면 이 구멍이 열린다 —
  // 2026-08-13 스키마 삭제 뒤 백필이 이름만 채워서 전원이 그 상태였다.
  //
  // setupPage 면 건너뛴다. 아니면 설정 화면이 자기 자신으로 무한 리다이렉트한다.
  const profileReady = !!userProfile?.name && (userProfile?.position?.length ?? 0) > 0;

  if (!setupPage && memberOnly && !isAnonymous && !profileReady) {
    return <Navigate to="/member/setup" />;
  }

  return <>{children}</>;
}
