import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Bell, Menu } from "lucide-react";

/** 앱 상단 바 — 나누리 로고(좌) + 버튼 그룹(알림·메뉴, 우).
 *
 *  원티드 커뮤니티 상단 바(social.wanted.co.kr)를 기준으로 삼았다: 흰 면, 왼쪽 워드마크,
 *  오른쪽 아이콘 버튼 묶음. 로고는 이미지가 아니라 "Nanuri" 워드마크다 — 원티드가 "wanted"
 *  워드마크를 쓰는 것과 같다(아직 로고 에셋이 없다).
 *
 *  BottomNav(떠 있는 유리 캡슐)와 달리 이건 콘텐츠 위에 뜨지 않고 flex 행으로 자리를 차지한다.
 *  그래서 페이지가 상단 여백을 따로 비워둘 필요가 없다(하단의 PAGE_BOTTOM_PAD 같은 처리 불필요).
 *  탭 화면에서만 뜨고, 상세·개설 같은 하위 화면은 BackButton 흐름이라 Layout 이 숨긴다. */

/** 아이콘 버튼. 아이콘 색은 label-normal(원티드 상단 바의 짙은 아이콘과 같다).
 *  알림·메뉴는 아직 도착지(알림 화면·메뉴 드로어)가 없어 눌러도 동작은 없다 — 자리만 잡는다. */
function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      className="flex items-center justify-center p-2 rounded-full text-label-normal"
    >
      {children}
    </motion.button>
  );
}

export default function TopBar() {
  return (
    // 흰 바. 밑에 흰 카드가 스쳐 지나갈 때 서로 묻히지 않도록 line-solid 하이라인을 둔다
    // (불투명 구분선 — 겹치는 선에 쓰는 토큰, docs/design.md). 안전영역은 이 바가 떠안는다.
    <header
      className="shrink-0 bg-bg-normal border-b border-line-solid"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-14 px-4 flex items-center justify-between">
        {/* 로고 = 워드마크. 찬양팀(주 탭)으로 간다. Primary 는 상호작용 전용이라 로고엔 안 쓴다. */}
        <Link
          to="/worship"
          aria-label="나누리 홈"
          className="text-[20px] font-medium text-label-normal"
        >
          nanuri
        </Link>

        {/* 버튼 그룹: 알림 · 메뉴. -mr-2 로 마지막 아이콘 시각 가장자리를 px-4 에 맞춘다. */}
        <div className="flex items-center gap-1 -mr-2">
          <IconButton label="알림">
            <Bell size={22} strokeWidth={2} />
          </IconButton>
          <IconButton label="메뉴">
            <Menu size={22} strokeWidth={2} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
