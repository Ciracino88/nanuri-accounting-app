import type { ReactNode } from "react";

interface Props {
  width?: "narrow" | "default" | "wide" | "full";
  /** true(기본): flex flex-col gap-6 적용. false: 자식이 직접 간격(margin) 관리 */
  stack?: boolean;
  children: ReactNode;
  className?: string;
}

const WIDTHS = {
  narrow: "max-w-md",   // 폼 (프로필)
  default: "max-w-lg",  // 홈, 설문, 투표
  wide: "max-w-2xl",    // 워십, 회계 목록
  full: "max-w-5xl",    // 회계 상세/보고서 (표·영수증)
};

export default function PageContainer({ width = "default", stack = true, children, className = "" }: Props) {
  return (
    <div
      className={`${WIDTHS[width]} mx-auto w-full px-5 pt-8 ${stack ? "flex flex-col gap-6" : ""} ${className}`}
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  );
}
