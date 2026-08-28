import { Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import LoadingScreen from "../../components/LoadingScreen";
import Button from "../../components/ui/Button";

const isAndroid = /android/i.test(navigator.userAgent);
const isInAppBrowser = /KAKAOTALK|Instagram|NAVER|FB_IAB|FBAN|FBAV/i.test(navigator.userAgent);
const shouldRedirectToBrowser = isAndroid && isInAppBrowser;

function openInChrome() {
  const url = window.location.href;
  window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.6 9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5 0 9.5-1.9 12.9-5l-6-5.2C29.2 36.5 26.7 37.5 24 37.5c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.5 41 16.3 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6 5.2C41.4 36.5 44 31 44 25c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, isAnonymous, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;
  if (user && !isAnonymous) return <Navigate to="/worship" replace />;

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/worship` },
    });
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-10">
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 24 }}
        >
          <h1 className="text-title1 font-bold text-label-normal" style={{ letterSpacing: "-0.02em" }}>나누리</h1>
          <p className="text-caption1 font-semibold text-label-neutral" style={{ letterSpacing: "0.2em" }}>
            WORSHIP TEAM
          </p>
          <p className="text-label2 text-label-neutral mt-3">Google 계정으로 로그인해요</p>
        </motion.div>

        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 320, damping: 28 }}
        >
          {shouldRedirectToBrowser ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-card px-4 py-3.5 text-caption leading-relaxed bg-warning-subtle border border-warning-soft text-warning-strong">
                카카오톡 내부 브라우저에서는 Google 로그인이 제한돼요. 크롬 브라우저에서 열어주세요.
              </div>
              <Button onClick={openInChrome}>크롬으로 열기</Button>
            </div>
          ) : (
            // 구글 로그인은 흰 면 + 테두리가 관례라 outline 을 쓴다. 이 화면의 유일한
            // 액션이지만 퍼플 pill 로 칠하면 구글 로고가 퍼플 위에 뜬다.
            <Button
              variant="outline"
              className="flex items-center justify-center gap-3"
              onClick={handleGoogleLogin}
            >
              <GoogleLogo />
              Google 계정으로 로그인
            </Button>
          )}
        </motion.div>
      </div>

      <motion.p
        className="text-center text-caption pb-10 px-8 text-fg-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        로그인하면 나누리 서비스 이용약관 및<br />개인정보 처리방침에 동의하는 것으로 간주돼요
      </motion.p>
    </div>
  );
}
