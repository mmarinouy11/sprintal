function Skel({ style, className }: { style?: Record<string, string | number>; className?: string }) {
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

export default function BetsBoardLoading() {
  return (
    <div className="w-full px-10 py-8" style={{ background: "var(--sidebar)" }}>
      <div className="mb-6">
        <Skel className="h-8 w-56 mb-2 max-w-full" />
        <Skel className="h-4 w-80 max-w-full" />
      </div>
      <div className="bets-board-grid grid grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="rounded p-3 min-h-48 flex flex-col gap-2"
            style={{
              background: "var(--raised)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex justify-between mb-2 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <Skel className="h-3 w-16" />
              <Skel className="h-4 w-6 rounded" />
            </div>
            <Skel className="h-16 w-full" />
            <Skel className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
