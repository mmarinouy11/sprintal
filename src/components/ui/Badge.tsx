"use client";

const STATUS_CLASS: Record<string,string> = {
  Active:        "badge badge-active",
  Scaled:        "badge badge-scaled",
  Pivoted:       "badge badge-pivoted",
  Done:          "badge badge-done",
  Killed:        "badge badge-killed",
  Planned:       "badge badge-planned",
  Closed:        "badge badge-closed",
  "Active Sprint":"badge badge-sprint",
};

const SIGNAL_COLOR: Record<string,string> = {
  Strong:  "var(--strong)",
  Unclear: "var(--unclear)",
  Weak:    "var(--weak)",
};

const AREA_STYLE: Record<string,{bg:string;color:string}> = {
  "MU-1":     {bg:"rgba(236,72,153,0.08)",  color:"#EC4899"},
  "MU-2":     {bg:"rgba(34,197,94,0.08)",   color:"#22C55E"},
  "MU-3":     {bg:"rgba(234,160,18,0.08)",   color:"#EAA012"},
  "MU-4":     {bg:"rgba(124,58,237,0.08)",  color:"#7C3AED"},
  "HR":       {bg:"rgba(124,58,237,0.08)",  color:"#7C3AED"},
  "TAG":      {bg:"rgba(37,99,235,0.08)",   color:"#2563EB"},
  "L&D":      {bg:"rgba(234,160,18,0.08)",   color:"#EAA012"},
  "Marketing":{bg:"rgba(249,115,22,0.08)",  color:"#F97316"},
  "Delivery": {bg:"rgba(8,145,178,0.08)",   color:"#0891B2"},
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={STATUS_CLASS[status] || "badge badge-closed"}>{status}</span>;
}

export function SignalBadge({ signal }: { signal: string }) {
  return (
    <span className="t-mono font-medium" style={{color:SIGNAL_COLOR[signal]||"var(--t2)"}}>
      ● {signal}
    </span>
  );
}

export function AreaTag({ area }: { area: string }) {
  const s = AREA_STYLE[area];
  return (
    <span className="badge" style={s
      ? {background:s.bg,color:s.color,borderColor:`${s.color}28`}
      : {background:"var(--raised)",color:"var(--t2)",borderColor:"var(--border-mid)"}
    }>
      {area}
    </span>
  );
}
