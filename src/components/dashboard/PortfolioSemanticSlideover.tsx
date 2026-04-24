"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function PortfolioSemanticSlideover({ open, onClose, title, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div
        className="fixed inset-0 z-[40]"
        style={{ background: "rgba(10,10,8,0.4)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-[50] flex flex-col overflow-hidden"
        style={{
          width: "min(480px, 100vw)",
          maxWidth: "100%",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border-mid)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.12)",
          animation: "slideInRight 0.2s ease",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-semantic-slide-title"
      >
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "var(--sidebar)", borderBottom: "1px solid var(--border)" }}
        >
          <div
            id="portfolio-semantic-slide-title"
            className="font-semibold text-sm tracking-tight"
            style={{ color: "var(--text)", fontFamily: "var(--font-body)" }}
          >
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-lg leading-none"
            style={{
              background: "var(--raised)",
              border: "1px solid var(--border-mid)",
              color: "var(--t2)",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-6 pt-2">{children}</div>
      </div>
    </>
  );
}
