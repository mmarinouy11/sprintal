const pulse = {
  animation: "sprintal-table-skel-pulse 1.4s ease-in-out infinite",
} as const;

function Skel({ className, style }: { className?: string; style?: Record<string, string | number> }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--raised)",
        borderRadius: "var(--rs)",
        ...pulse,
        ...style,
      }}
    />
  );
}

export default function BetsTableLoading() {
  return (
    <>
      <style>{`
        @keyframes sprintal-table-skel-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div className="w-full px-10 py-8" style={{ background: "var(--sidebar)" }}>
        <div className="mb-6">
          <Skel className="h-8 w-48 mb-2 max-w-full" />
          <Skel className="h-4 w-96 max-w-full" />
        </div>
        <div className="space-y-2 mb-5">
          <div className="flex flex-wrap gap-2 items-center">
            <Skel className="h-6 w-14" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skel key={i} className="h-7 w-16 rounded-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Skel className="h-6 w-14" />
            {[0, 1, 2].map((i) => (
              <Skel key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <div
          className="rounded overflow-hidden"
          style={{
            background: "var(--raised)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--brand)",
          }}
        >
          <div className="grid gap-2 px-4 py-3" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <Skel key={i} className="h-3 w-full" />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="grid gap-2 px-4 py-3 items-center"
              style={{
                gridTemplateColumns: "repeat(7, 1fr)",
                borderTop: "1px solid var(--border)",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                <Skel key={c} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
