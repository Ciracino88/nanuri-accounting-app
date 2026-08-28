import { useNavigate } from "react-router-dom";
import { LogOut, Pencil } from "lucide-react";
import { confirmDialog } from "../components/ConfirmDialog";
import { useAuthStore } from "../store/authStore";
import { PAGE_BOTTOM_PAD } from "../constants/layout";

const INTRO = "나누리 청년부와 함께하고 있어요";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuthStore();
  const name = userProfile?.name ?? "이름 없음";
  const avatar = userProfile?.avatar_url;
  const team = userProfile?.team ?? "나누리";
  const positions = userProfile?.position ?? [];

  return (
    <div className="flex-1 flex flex-col">
      <div
        className="w-full max-w-md mx-auto px-4 pt-6 flex flex-col gap-6"
        style={{ paddingBottom: PAGE_BOTTOM_PAD }}
      >
        <h1 className="sr-only">내 정보</h1>

        {/* 프로필 헤더 */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-status-bg-active text-primary-normal text-title3 font-bold shrink-0">
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-title3 font-bold text-label-normal truncate">{name}</p>
            <p className="text-label2 text-label-neutral truncate">{INTRO}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/member/setup")}
            aria-label="프로필 편집"
            className="w-9 h-9 rounded-full bg-bg-normal shadow-xsmall text-label-neutral flex items-center justify-center shrink-0 active:scale-90 transition"
          >
            <Pencil size={16} />
          </button>
        </div>

        {/* 내 포지션 — 이 값이 비면 찬양팀 시트에 아예 안 뜬다. 그래서 여기서 보여준다. */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2 px-1">
            <h2 className="text-headline2 font-bold text-label-normal">내 포지션</h2>
            <span className="text-label2 font-semibold text-label-neutral">{team}</span>
          </div>

          {positions.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/member/setup")}
              className="w-full text-left rounded-card bg-bg-normal shadow-small px-4 py-5 active:scale-[0.99] transition"
            >
              <p className="text-label1 text-label-normal">아직 포지션을 고르지 않았어요</p>
              <p className="text-label2 text-label-neutral mt-1">
                포지션을 골라야 찬양팀 시트에 이름이 떠요. 눌러서 설정하기
              </p>
            </button>
          ) : (
            <div className="rounded-card bg-bg-normal shadow-small px-4 py-4 flex flex-wrap gap-2">
              {positions.map((p) => (
                <span
                  key={p}
                  className="text-label2 font-semibold px-3 py-1.5 rounded-full bg-status-bg-active text-primary-normal"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* 로그아웃 */}
        <button
          type="button"
          onClick={async () => {
            const ok = await confirmDialog({
              title: "로그아웃할까요?",
              message: "다시 로그인하려면 구글 계정 인증이 필요해요.",
              confirmLabel: "로그아웃",
              danger: true,
            });
            if (!ok) return;
            await signOut();
            navigate("/");
          }}
          className="w-full py-3.5 rounded-field flex items-center justify-center gap-2 text-body1 font-semibold text-label-neutral bg-bg-normal shadow-xsmall active:bg-bg-alternative transition"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </div>
  );
}
