export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">

      {/* ── Grid Layer ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(var(--grid-line-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid-line-color) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black 20%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black 20%, transparent 100%)',
          opacity: 0.8
        }}
      />

      {/* ── Signature Supabase Glow (Top Center) ── */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1000px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(62,207,142,0.15) 0%, transparent 75%)',
          filter: 'blur(60px)',
        }}
      />

      {/* ── Subtle Secondary Glow (Bottom Right) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-100px',
          width: '600px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse at center, rgba(62,207,142,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Dark overlay to ensure grid isn't too distracting */}
      <div className="absolute inset-0 bg-background/10" />
    </div>
  );
}
