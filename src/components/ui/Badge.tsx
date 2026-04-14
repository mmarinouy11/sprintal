import { cn } from "@/lib/utils";
import { BetStatus, SignalStrength, SprintStatus } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-sky-50 text-sky-600 border-sky-100",
  Scaled: "bg-green-50 text-green-600 border-green-100",
  Pivoted: "bg-purple-50 text-purple-600 border-purple-100",
  Done: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Killed: "bg-red-50 text-red-500 border-red-100",
  Planned: "bg-blue-50 text-blue-500 border-blue-100",
  "Active Sprint": "bg-[#AADC00]/10 text-[#88B200] border-[#AADC00]/20",
  Closed: "bg-gray-50 text-gray-400 border-gray-100",
};

const SIGNAL_STYLES: Record<string, string> = {
  Strong: "text-green-600",
  Unclear: "text-amber-500",
  Weak: "text-red-500",
};

export function StatusBadge({ status }: { status: BetStatus | SprintStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded border",
      STATUS_STYLES[status] || "bg-gray-50 text-gray-500 border-gray-100"
    )}>
      {status}
    </span>
  );
}

export function SignalBadge({ signal }: { signal: SignalStrength }) {
  return (
    <span className={cn("font-medium text-sm", SIGNAL_STYLES[signal])}>
      ● {signal}
    </span>
  );
}

export function AreaTag({ area }: { area: string }) {
  const colors: Record<string, string> = {
    "MU-1": "bg-pink-50 text-pink-500 border-pink-100",
    "MU-2": "bg-emerald-50 text-emerald-500 border-emerald-100",
    "MU-3": "bg-amber-50 text-amber-500 border-amber-100",
    "MU-4": "bg-violet-50 text-violet-500 border-violet-100",
    "HR": "bg-purple-50 text-purple-500 border-purple-100",
    "TAG": "bg-blue-50 text-blue-500 border-blue-100",
    "L&D": "bg-amber-50 text-amber-600 border-amber-100",
    "Marketing": "bg-orange-50 text-orange-500 border-orange-100",
    "Delivery": "bg-cyan-50 text-cyan-500 border-cyan-100",
  };
  return (
    <span className={cn(
      "inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded border",
      colors[area] || "bg-gray-50 text-gray-500 border-gray-100"
    )}>
      {area}
    </span>
  );
}
