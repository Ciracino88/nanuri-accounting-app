import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";

// 탭바를 띄우는 화면. 이 앱은 찬양팀 일정 조율 하나만 하므로 탭은 둘이다.
// 프로필 편집(/member/setup)은 BackButton 으로 돌아가는 하위 화면이라 탭바를 숨긴다.
const TAB_BAR_ROUTES = ["/worship", "/profile"];

/** 앱 셸: 앱 프레임(max-w-md) + 스크롤 영역. 배경은 전역(index.css).
 *
 *  탭바는 "떠 있는 글래스 캡슐"이라 자리를 차지하지 않고 콘텐츠 위에 뜬다(docs/design.md).
 *  그래서 하단 여백은 탭바가 아니라 각 페이지가 확보한다 — PAGE_BOTTOM_PAD 를 쓴다.
 *  캡슐 위치(중앙·바닥 띄움)는 여기서 잡고, 캡슐 모양은 BottomNav 가 그린다. */
export default function Layout() {
  const { pathname } = useLocation();
  const showTabBar = TAB_BAR_ROUTES.includes(pathname);

  return (
    <div className="relative h-dvh mx-auto w-full max-w-md flex flex-col overflow-hidden">
      {/* 상단 바는 탭 화면에서만. 자리를 차지하는 flex 행이라 안전영역 상단 여백을 스스로 떠안는다 —
          그래서 이때 main 은 상단 패딩을 주지 않는다(주면 이중이 된다). 하위 화면은 반대로 main 이 진다. */}
      {showTabBar && <TopBar />}

      <main
        className="flex-1 flex flex-col overflow-y-auto min-h-0"
        style={showTabBar ? undefined : { paddingTop: "env(safe-area-inset-top)" }}
      >
        <Outlet />
      </main>

      {showTabBar && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <BottomNav />
        </div>
      )}
    </div>
  );
}
