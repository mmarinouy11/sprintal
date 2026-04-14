"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  LayoutDashboard, Zap, KanbanSquare, Table, FileText,
  Plus, Activity, CheckCircle, XCircle, Settings, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AppSidebar({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { org } = useStore();
  const base = `/${orgSlug}`;

  const nav = [
    { label: "Core", items: [
      { href: `${base}/dashboard`, icon: LayoutDashboard, label: "Executive Dashboard" },
      { href: `${base}/sprints`, icon: Zap, label: "Enterprise Sprints" },
      { href: `${base}/bets/board`, icon: KanbanSquare, label: "Bets — Board" },
      { href: `${base}/bets/table`, icon: Table, label: "Bets — Full Table" },
      { href: `${base}/evidence`, icon: FileText, label: "Evidence Log" },
    ]},
    { label: "Actions", items: [
      { href: `${base}/new/sprint`, icon: Plus, label: "New Sprint", action: true },
      { href: `${base}/new/bet`, icon: Plus, label: "New Strategic Bet", action: true },
      { href: `${base}/new/signal`, icon: Activity, label: "Signal Check", action: true },
      { href: `${base}/new/review`, icon: CheckCircle, label: "Monthly Review", action: true },
      { href: `${base}/new/closure`, icon: XCircle, label: "Close Sprint", action: true },
    ]},
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="w-60 min-w-60 bg-[#F5F3EE] border-r border-gray-100 flex flex-col overflow-y-auto">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="font-mono text-xl font-semibold tracking-wide text-ink">
          {org?.name || "Sprintal"}
        </div>
        <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#88B200] mt-0.5">
          Enterprise Sprinting
        </div>
        <div className="text-xs text-gray-400 mt-0.5">Strategic Control System</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2">
        {nav.map((group) => (
          <div key={group.label} className="px-3 py-2">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-300 px-2 mb-1">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-[#AADC00]/10 text-[#88B200] font-medium"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  )}>
                  {item.action
                    ? <span className="text-[#88B200] font-light text-base leading-none">+</span>
                    : <item.icon size={14} />
                  }
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 space-y-3">
        <Link href={`${base}/settings`}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <Settings size={13} /> Settings
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
}
