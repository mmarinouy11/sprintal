export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="font-mono text-2xl font-semibold text-ink mb-2">Sprintal</div>
        <div className="font-mono text-xs uppercase tracking-widest text-gray-300 animate-pulse">Loading...</div>
      </div>
    </div>
  );
}
