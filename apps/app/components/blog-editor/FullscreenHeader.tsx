'use client';

import { motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FullscreenHeaderProps {
  onDone: () => void;
  title?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FullscreenHeader({ onDone, title }: Readonly<FullscreenHeaderProps>) {
  return (
    <div
      style={{
        background: 'var(--background, #fff)',
        flexShrink: 0,
        borderBottom: '1px solid var(--border, rgba(0,0,0,.08))',
        position: 'relative',
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

      {/* Centered small title with entrance animation */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 48, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ y: -6, opacity: 0, scale: 1.05 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          style={{ pointerEvents: 'none', textAlign: 'center', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground, #111)', lineHeight: '1' }}>{title ?? 'New Blog'}</div>
        </motion.div>
      </div>
    </div>
  );
}
