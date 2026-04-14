"use client";
import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { Chart, ArcElement, DoughnutController, Tooltip } from "chart.js";
import { STATUS_COLORS } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";

Chart.register(ArcElement, DoughnutController, Tooltip);

const STATUSES = ["Active","Scaled","Pivoted","Done","Killed"] as const;

export default function PortfolioDonut() {
  const { bets } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const router = useRouter();
  const params = useParams();

  const counts = STATUSES.map(s => bets.filter(b => b.status === s).length);
  const total = bets.length;

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: STATUSES as unknown as string[],
        datasets: [{ data: counts, backgroundColor: STATUSES.map(s => STATUS_COLORS[s]), borderWidth: 0, hoverOffset: 4 }],
      },
      options: {
        cutout: "68%", responsive: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}` } } },
        onClick: (_, els) => {
          if (els.length) {
            const status = STATUSES[els[0].index];
            router.push(`/${params.orgSlug}/bets/table?status=${status}`);
          }
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [bets]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl border-l-2 border-l-[#AADC00] px-5" style={{paddingTop: 14}}>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-3">Portfolio Balance</div>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-[170px] h-[170px]">
          <canvas ref={canvasRef} width={170} height={170} style={{cursor:"pointer"}} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="font-mono text-4xl font-semibold text-ink">{total}</div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-gray-300">bets</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 w-full pb-3">
          {STATUSES.map((s, i) => (
            <button key={s} onClick={() => router.push(`/${params.orgSlug}/bets/table?status=${s}`)}
              className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-left">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{background: STATUS_COLORS[s]}} />
              <span className="font-mono text-xs text-gray-500 flex-1">{s}</span>
              <span className="font-mono text-sm font-semibold text-ink">{counts[i]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
