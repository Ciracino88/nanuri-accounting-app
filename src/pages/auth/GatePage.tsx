import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "motion/react";
import { Star, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/authStore";
import LoadingScreen from "../../components/LoadingScreen";
import Button from "../../components/ui/Button";

export default function GatePage() {
  const navigate = useNavigate();
  const { user, isAnonymous, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;
  if (user && !isAnonymous) return <Navigate to="/worship" replace />;

  return (
    <div className="min-h-dvh flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-12">
        {/* 로고 */}
        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 24 }}
        >
          <h1 className="text-display font-bold text-fg-strong" style={{ letterSpacing: "-0.02em" }}>나누리</h1>
          <p className="text-caption font-semibold text-fg-muted" style={{ letterSpacing: "0.2em" }}>YOUTH COMMUNITY</p>
        </motion.div>

        {/* 버튼 */}
        <motion.div
          className="w-full flex flex-col gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 280, damping: 26 }}
        >
          <Button
            className="flex items-center justify-center gap-2"
            onClick={() => navigate("/member/login")}
          >
            <Star size={17} strokeWidth={2.5} />
            나누리 멤버입니다
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => toast("외부 사용자 기능은 준비 중이에요", { icon: "🚧" })}
          >
            <Users size={17} strokeWidth={2} />
            외부 사용자입니다
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
