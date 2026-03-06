'use client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FullscreenHeaderProps {
  onDone: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FullscreenHeader({ onDone }: Readonly<FullscreenHeaderProps>) {
  return (
    <div
      style={{
        background: 'var(--background, #fff)',
        flexShrink: 0,
        borderBottom: '1px solid var(--border, rgba(0,0,0,.08))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 48,
          padding: '0 12px',
          backdropFilter: 'blur(8px)',
          background: 'var(--background, rgba(255,255,255,0.9))',
        }}
      >
        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={onDone}
          style={{
            padding: '5px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--foreground, #111)',
            color: 'var(--background, #fff)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
