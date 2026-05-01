function SkelBox({ className, style }: { className?: string; style?: Record<string, string | number> }) {
  return (
    <div
      className={`sprintal-skel-pulse ${className ?? ""}`}
      style={{
        background: "var(--raised)",
        borderRadius: "var(--r)",
        ...style,
      }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="w-full px-10 py-8" style={{ background: "var(--sidebar)" }}>
      <div className="mb-6">
        <SkelBox className="h-8 w-48 mb-2 max-w-full" />
        <SkelBox className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {[0, 1, 2, 3].map((i) => (
          <SkelBox key={i} className="h-20" style={{ background: "var(--raised)" }} />
        ))}
      </div>

      <div
        className="grid gap-3 mb-8"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          alignItems: "stretch",
        }}
      >
        <div className="flex flex-col gap-3">
          <SkelBox className="flex-1 min-h-[200px]" style={{ background: "var(--raised)" }} />
        </div>
        <SkelBox className="min-h-[200px]" style={{ background: "var(--raised)" }} />
      </div>

      <SkelBox className="h-10 w-40 mb-4" />
      <div
        className="rounded overflow-hidden"
        style={{
          background: "var(--raised)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <SkelBox className="h-4 w-32" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 flex gap-3" style={{ borderBottom: i < 4 ? "1px solid var(--border)" : undefined }}>
            <SkelBox className="h-4 flex-1" />
            <SkelBox className="h-4 w-20" />
            <SkelBox className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
