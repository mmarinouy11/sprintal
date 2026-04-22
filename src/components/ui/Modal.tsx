"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
  wide?: boolean;
  sidebar?: React.ReactNode;
}

export default function Modal({ title, subtitle, onClose, children, wide = false, sidebar }: ModalProps) {
  const router = useRouter();
  function handleClose() { if (onClose) onClose(); else router.back(); }
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const hasSidebar = !!sidebar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,23,20,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full flex flex-col overflow-hidden fade-up"
        style={{
          maxWidth: hasSidebar ? "860px" : wide ? "780px" : "560px",
          maxHeight: "90vh",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          border: "1px solid var(--border-mid)",
        }}>
        {/* Two-col layout when sidebar provided */}
        {hasSidebar ? (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", maxHeight: "90vh", overflow: "hidden" }}>
            {/* Sidebar */}
            <div className="overflow-y-auto" style={{ background: "var(--sidebar)", borderRight: "1px solid var(--border)", padding: "28px 24px" }}>
              {sidebar}
            </div>
            {/* Main */}
            <div className="flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
              <div className="flex items-start justify-between px-7 pt-6 pb-4 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div className="font-bold text-xl" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{title}</div>
                  {subtitle && <div className="t-mono mt-1" style={{ color: "var(--t2)" }}>{subtitle}</div>}
                </div>
                <button onClick={handleClose}
                  className="ml-4 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded"
                  style={{ color:"var(--t3)", background:"none", border:"1px solid var(--border-mid)", cursor:"pointer", fontSize:"1.1rem" }}>
                  ×
                </button>
              </div>
              <div className="overflow-y-auto px-7 py-6 flex-1">{children}</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
            <div className="flex items-start justify-between px-7 pt-6 pb-4 flex-shrink-0"
              style={{ background: "var(--sidebar)", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div className="font-bold text-xl" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{title}</div>
                {subtitle && <div className="t-mono mt-1" style={{ color: "var(--t2)" }}>{subtitle}</div>}
              </div>
              <button onClick={handleClose}
                className="ml-4 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded"
                style={{ color:"var(--t3)", background:"none", border:"1px solid var(--border-mid)", cursor:"pointer", fontSize:"1.1rem" }}>
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-7 py-6 flex-1">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="t-label">{label}</label>
        {hint && <span className="t-mono text-xs" style={{ color: "var(--t2)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 pt-4 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}
