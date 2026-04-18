export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
      style={{background:"var(--bg)"}}>
      <div className="font-extrabold text-3xl tracking-tight" style={{color:"var(--brand)",letterSpacing:"-0.03em"}}>
        Sprintal
      </div>
      <div className="flex items-center gap-1.5">
        {[0,1,2].map(i=>(
          <div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{background:"var(--brand)",animation:`dotPulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>
        ))}
      </div>
    </div>
  );
}
