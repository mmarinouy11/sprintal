"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { NotificationItem } from "@/types";
import { supabase } from "@/lib/supabase";

function ageLabel(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function dotColor(priority: NotificationItem["priority"]) {
  if (priority === "urgent") return "var(--killed)";
  if (priority === "important") return "var(--unclear)";
  return "var(--t3)";
}

export default function NotificationPanel({
  open,
  onClose,
  orgSlug,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  orgId: string;
}) {
  const t = useT("notifications");
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { notifications, setNotifications, markRead, markAllRead } = useStore();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;
      const res = await fetch(`/api/notifications?orgId=${encodeURIComponent(orgId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({ notifications: [] }));
      if (!cancelled && res.ok) {
        setNotifications(data.notifications || []);
      }
    })();
    return () => { cancelled = true; };
  }, [open, orgId, setNotifications]);

  async function markAll() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ all: true, orgId }),
    });
    markAllRead();
  }

  async function openNotification(n: NotificationItem) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids: [n.id] }),
      });
    }
    markRead([n.id]);
    onClose();
    if (n.link) router.push(n.link.startsWith("/") ? n.link : `/${orgSlug}/dashboard`);
  }

  if (!open) return null;
  const hasMore = notifications.length >= 20;

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 380,
        maxHeight: "70vh",
        overflow: "auto",
        background: "var(--bg)",
        border: "1px solid var(--border-mid)",
        borderRadius: "var(--r)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
        zIndex: 70,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <strong style={{ fontSize: "0.875rem" }}>{t("title")}</strong>
        <button onClick={markAll} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: "0.75rem", cursor: "pointer" }}>
          {t("markAll")}
        </button>
      </div>
      {notifications.length === 0 && (
        <div style={{ padding: 14, color: "var(--t2)", fontSize: "0.8125rem" }}>{t("empty")}</div>
      )}
      {notifications.map((n) => (
        <button
          key={n.id}
          onClick={() => openNotification(n)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "none",
            borderBottom: "1px solid var(--border)",
            padding: "10px 12px",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor(n.priority), flexShrink: 0 }} />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)" }}>{n.title}</span>
          </div>
          {n.body && <div style={{ fontSize: "0.75rem", color: "var(--t2)", marginBottom: 4 }}>{n.body}</div>}
          <div style={{ fontSize: "0.6875rem", color: "var(--t3)" }}>{ageLabel(n.created_at)} &nbsp;→</div>
        </button>
      ))}
      {hasMore && (
        <div style={{ padding: 10 }}>
          <button
            onClick={() => {
              onClose();
              router.push(`/${orgSlug}/settings`);
            }}
            style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontSize: "0.75rem" }}
          >
            {t("seeAll")}
          </button>
        </div>
      )}
    </div>
  );
}
