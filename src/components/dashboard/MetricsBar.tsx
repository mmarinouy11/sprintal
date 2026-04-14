"use client";
import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";

function Counter({ target }: { target: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let start = 0;
    const duration = 700;
    const startTime = performance.now();
    function step(now: number) {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      if (ref.current) ref.current.textContent = String(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target]);
  return <div ref={ref} className="font-mono text-5xl font-semibold text-ink leading-none">0</div>;
}

export default function MetricsBar() {
  const { sprints, bets } = useStore();
  const active = sprints.find(s => s.status === "Active");
  const ab = bets.filter(b => b.sprint_id === active?.id && b.status === "Active");

  const metrics = [
    { label: "Active Sprint", value: active ? 1 : 0, sub: active?.name || "—" },
    { label: "Bets in Sprint", value: ab.length, sub: "currently testing" },
    { label: "Strong Signal", value: ab.filter(b => b.signal === "Strong").length, sub: "candidates to scale" },
    { label: "At Risk", value: ab.filter(b => b.signal !== "Strong").length, sub: "need a decision" },
  ];

  return (
    <div className="grid grid-cols-4 border border-gray-100 rounded-xl overflow-hidden border-l-2 border-l-[#AADC00]">
      {metrics.map((m, i) => (
        <div key={i} className={`bg-white px-5 py-5 ${i < 3 ? "border-r border-gray-100" : ""}`}>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-2">{m.label}</div>
          <Counter target={m.value} />
          <div className="text-xs text-gray-400 mt-1.5">{m.sub}</div>
        </div>
      ))}
    </div>
  );
}
