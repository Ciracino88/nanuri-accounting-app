import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "../../components/BottomNav";
import TopBar from "../../components/TopBar";
import GatePage from "../auth/GatePage";
import MemberLoginPage from "../auth/MemberLoginPage";
import WorshipSchedulePage from "../worship/WorshipSchedulePage";
import ProfilePage from "../ProfilePage";
import MemberProfileSetupPage from "../MemberProfileSetupPage";
import { ConfirmHost } from "../../components/ConfirmDialog";
import { useAuthStore } from "../../store/authStore";
import type { WorshipData } from "../../hooks/useWorshipSchedule";

// 개발 전용 미리보기. 앱 라우터 바깥에서 마운트된다(main.tsx) — 그래야 여기서
// MemoryRouter 로 원하는 경로·상태를 꾸며 띄울 수 있다. 라우터는 중첩이 안 된다.
//
// 왜 필요한가: 화면 대부분이 로그인 뒤에 있어 UI 만 손봐도 확인이 막힌다. 반대로
// 게이트/로그인은 로그인'된' 브라우저에서는 리다이렉트돼 볼 수 없다.
// 여기서는 authStore 를 원하는 상태로 고정해 어느 쪽이든 띄운다.

// 게이트/로그인은 "로그아웃 + 로딩 끝" 이어야 보인다. isLoading 기본값이 true 라
// 그냥 띄우면 LoadingScreen 만 나온다.
function asLoggedOut() {
  useAuthStore.setState({ user: null, userProfile: null, isAnonymous: false, isLoading: false });
}

const ME = "dev-user-1";

// 포지션·팀이 있어야 내 슬롯(점선)과 토글 가능 여부가 화면에 드러난다.
function asWorshipMember() {
  useAuthStore.setState({
    user: { id: ME } as never,
    userProfile: { id: ME, name: "미리보기", position: ["인도자", "일렉"], team: "나누리" } as never,
    isAnonymous: false,
    isLoading: false,
  });
}

// 포지션이 비었을 때 내정보가 어떻게 안내하는지 보는 상태.
function asMemberWithoutPosition() {
  useAuthStore.setState({
    user: { id: ME } as never,
    userProfile: { id: ME, name: "미리보기", position: null, team: "나누리" } as never,
    isAnonymous: false,
    isLoading: false,
  });
}

/**
 * 쿼리 캐시를 미리 채워 네트워크 없이 페이지를 띄운다.
 * useState 초기화 함수라 자식이 마운트되기 전(이 컴포넌트의 첫 렌더 중)에 딱 한 번 심긴다 —
 * 그래야 안쪽 useQuery 가 캐시 히트로 시작하고 로그인 없는 요청으로 새지 않는다.
 *
 * setQueryDefaults 로 staleTime 을 무한대로 박는 게 핵심이다. 심어만 두면 훅에 staleTime 이
 * 없는 쿼리는 마운트하자마자 재조회하고, 로그인이 없어 빈 배열이 성공으로 돌아오면서
 * 목 데이터를 덮어쓴다.
 */
function Seed({ entries, children }: {
  entries: [readonly unknown[], unknown][];
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  useState(() => {
    entries.forEach(([key, value]) => {
      queryClient.setQueryDefaults(key, {
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: false,
      });
      queryClient.setQueryData(key, value);
    });
    return null;
  });
  return <>{children}</>;
}

// ── 목 데이터 ────────────────────────────────────────────
function getSundaysInMonth(year: number, month: number): Date[] {
  const sundays: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month) {
    sundays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return sundays;
}

// 상대 시각이라 오늘 기준으로 만든다 — 고정 날짜면 시간이 지나 화면이 과거로 굳는다.
const today = new Date();
const wsSundays = getSundaysInMonth(today.getFullYear(), today.getMonth());
const wsActive = wsSundays.find((d) => d >= today) ?? wsSundays[wsSundays.length - 1];
const wsActiveId = "ws-active";

const MOCK_WORSHIP: WorshipData = {
  schedules: wsSundays.map((d, i) => ({
    id: d === wsActive ? wsActiveId : `ws-${i}`,
    date: d.toISOString().slice(0, 10),
  })),
  members: [
    { id: ME, name: "미리보기", position: ["인도자", "일렉"], avatar_url: null, team: "나누리" },
    { id: "m2", name: "김하늘", position: ["싱어1"], avatar_url: null, team: "나누리" },
    { id: "m3", name: "이바다", position: ["메인 피아노"], avatar_url: null, team: "나누리" },
    { id: "m4", name: "박믿음", position: ["드럼"], avatar_url: null, team: "나누리" },
    { id: "m5", name: "정소망", position: ["베이스"], avatar_url: null, team: "섬김이" },
  ],
  availability: [
    { schedule_id: wsActiveId, user_id: "m2", position: "싱어1", available: true },
    { schedule_id: wsActiveId, user_id: "m3", position: "메인 피아노", available: true },
    { schedule_id: wsActiveId, user_id: "m4", position: "드럼", available: true },
  ],
};

// ── 껍데기 ──────────────────────────────────────────────
/** 실제 셸(Layout)의 스크롤 구조를 흉내 낸다 — 바깥 h-dvh overflow-hidden +
 *  안쪽 flex-1 overflow-y-auto. 그래야 sticky 가 실제 앱과 똑같이 붙는다.
 *  min-h-dvh(윈도우 스크롤)로 두면 sticky 가 붙을 컨테이너가 없어 미리보기에서만 안 먹는다. */
function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md h-dvh border-x border-line flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0">{children}</div>
    </div>
  );
}

const NAV_ROUTES = ["/worship", "/profile"];

function NavPreview() {
  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-heading font-bold">BottomNav — 탭별 활성 상태</h1>
      {NAV_ROUTES.map((route) => (
        <div key={route}>
          <p className="text-caption text-fg-muted mb-1">활성: {route}</p>
          {/* 캡슐은 떠 있는 조각이라 실제처럼 캔버스 위에 중앙 정렬해 띄운다. */}
          <div className="mx-auto w-full max-w-md flex justify-center bg-bg-alternative rounded-card py-6">
            <MemoryRouter initialEntries={[route]}>
              <BottomNav />
            </MemoryRouter>
          </div>
        </div>
      ))}
    </div>
  );
}

const SCREENS: Record<string, () => React.ReactElement> = {
  nav: () => <NavPreview />,

  // 상단 바. 실제 앱처럼 캔버스 위에 얹고, 밑에 흰 카드를 하나 둬 하이라인 분리를 확인한다.
  topbar: () => (
    <MemoryRouter initialEntries={["/worship"]}>
      <div className="mx-auto w-full max-w-md min-h-dvh bg-bg-alternative flex flex-col">
        <TopBar />
        <div className="p-4 flex flex-col gap-3">
          <div className="rounded-card bg-bg-normal shadow-small p-4 text-body1 text-label-neutral">
            바 밑을 스치는 흰 카드
          </div>
        </div>
      </div>
    </MemoryRouter>
  ),

  gate: () => {
    asLoggedOut();
    return (
      <MemoryRouter initialEntries={["/"]}>
        <Phone><GatePage /></Phone>
      </MemoryRouter>
    );
  },

  login: () => {
    asLoggedOut();
    return (
      <MemoryRouter initialEntries={["/member/login"]}>
        <Phone><MemberLoginPage /></Phone>
      </MemoryRouter>
    );
  },

  worship: () => {
    asWorshipMember();
    // 쿼리 키가 ["worship", year, month] 라 이번 달로 심는다(useCalendar 기본값과 같은 today 기준).
    return (
      <Seed entries={[[["worship", today.getFullYear(), today.getMonth()], MOCK_WORSHIP]]}>
        <MemoryRouter initialEntries={["/worship"]}>
          <Phone><WorshipSchedulePage /></Phone>
        </MemoryRouter>
      </Seed>
    );
  },

  profile: () => {
    asWorshipMember();
    return (
      <MemoryRouter initialEntries={["/profile"]}>
        <Phone><ProfilePage /></Phone>
      </MemoryRouter>
    );
  },

  // 포지션이 비었을 때의 안내. 스키마 복구 직후 모든 멤버가 이 상태다.
  "profile-empty": () => {
    asMemberWithoutPosition();
    return (
      <MemoryRouter initialEntries={["/profile"]}>
        <Phone><ProfilePage /></Phone>
      </MemoryRouter>
    );
  },

  "profile-setup": () => {
    asWorshipMember();
    return (
      <MemoryRouter initialEntries={["/member/setup"]}>
        <Phone><MemberProfileSetupPage /></Phone>
      </MemoryRouter>
    );
  },
};

export default function DevPreviewPage() {
  const key = window.location.pathname.replace("/__dev/", "");
  const screen = SCREENS[key];
  if (!screen) {
    return (
      <div className="p-4">
        <h1 className="text-heading font-bold mb-2">개발 미리보기</h1>
        <ul className="list-disc pl-5 text-body">
          {Object.keys(SCREENS).map((k) => (
            <li key={k}><a className="text-accent underline" href={`/__dev/${k}`}>/__dev/{k}</a></li>
          ))}
        </ul>
      </div>
    );
  }
  // ConfirmHost 를 같이 마운트한다 — 앱 루트(main.tsx Root)에만 있어서, 그냥 두면
  // 미리보기에서 confirmDialog() 가 아무것도 안 띄운다(로그아웃 확인이 안 보인다).
  return (
    <>
      {screen()}
      <ConfirmHost />
    </>
  );
}
