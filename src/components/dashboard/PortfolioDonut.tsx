"use client";
import { useStore } from "@/lib/store";
import { useEffect, useRef } from "react";
import { Chart, ArcElement, DoughnutController, Tooltip } from "chart.js";
import { useRouter, useParams } from "next/navigation";
import { useT } from "@/lib/i18n";

Chart.register(ArcElement, DoughnutController, Tooltip);

const STATUSES = ["Active","Scaled","Pivoted","Done","Killed"] as const;
const COLORS = {
  Active:"#38BDF8", Scaled:"#22C55E", Pivoted:"#A78BFA", Done:"#34D399", Killed:"#F87171",
};

export default function PortfolioDonut() {
  const { bets } = useStore();
  const t = useT("dashboard");
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart|null>(null);
  const router = useRouter();
  const params = useParams();
  const counts = STATUSES.map(s => bets.filter(b => b.status === s).length);
  const total = bets.length;
  const allZero = counts.every(c => c === 0);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type:"doughnut",
      data:{
        labels: STATUSES as unknown as string[],
        datasets:[{
          data: allZero ? [1] : counts,
          backgroundColor: allZero ? ["#E0DDD6"] : STATUSES.map(s => COLORS[s]),
          borderWidth:0, hoverOffset:4,
        }],
      },
      options:{
        cutout:"68%", responsive:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}`}} },
        onClick:(_,els)=>{ if(els.length && !allZero) router.push(`/${params.orgSlug}/bets/table?status=${STATUSES[els[0].index]}`); },
      },
    });
    return () => chartRef.current?.destroy();
  }, [bets]);

  return (
    <div style={{
      background:"var(--surface)", border:"1px solid var(--border)", borderLeft:"3px solid var(--brand)",
      borderRadius:"var(--r)", padding:"20px", display:"flex", flexDirection:"column",
      height:"100%", boxSizing:"border-box",
    }}>
      <div style={{ fontFamily:"var(--font-body)", fontSize:"0.6875rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:16 }}>
        {t("portfolioBalance")}
      </div>

      {/* Chart */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"8px 0" }}>
        <div style={{ position:"relative", width:200, height:200 }}>
          <canvas ref={ref} width={200} height={200} style={{ cursor:"pointer" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:"3rem", color:"var(--text)", letterSpacing:"-0.03em", lineHeight:1 }}>
              {total}
            </div>
            <div style={{ fontFamily:"var(--font-body)", fontSize:"0.75rem", color:"var(--t3)", marginTop:3, fontWeight:500 }}>
              {total === 1 ? t("bet") : t("bets")}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" }}>
        {STATUSES.map((s,i) => (
          <button key={s}
            onClick={()=>router.push(`/${params.orgSlug}/bets/table?status=${s}`)}
            style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:"3px 0" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:COLORS[s], flexShrink:0 }}/>
            <span style={{ fontFamily:"var(--font-body)", fontSize:"0.875rem", color:"var(--t2)", flex:1, textAlign:"left" }}>{t(`status.${s.toLowerCase()}`)}</span>
            <span style={{ fontFamily:"var(--font-display)", fontSize:"0.9375rem", fontWeight:700, color:"var(--text)" }}>{counts[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
