export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Supabase-style: very subtle green glow, top-left only */}
      <div className="absolute -top-[200px] -left-[200px] w-[600px] h-[600px] rounded-full bg-[#3ecf8e] opacity-[0.04] blur-[120px]" />

      {/* Very faint dot grid — Supabase uses this subtly */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)`,
          backgroundSize: '28px 28px'
        }}
      />
    </div>
  );
}
