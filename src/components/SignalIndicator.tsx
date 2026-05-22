/**
 * 5-bar signal indicator — the design's signature motif.
 *
 * Mirrors a cellular signal-bars glyph, mapped to the invoker approval state:
 *   pending   → 1 bar, amber       (waiting for operator)
 *   approving → 2 bars, sage, animated pulse (CAS transient)
 *   approved  → 5 bars lit, moss   (clear signal)
 *   rotating  → 4 bars, sage pulse (transient secret swap)
 *   rejected  → bars with a strike-through, rust
 *   suspended → bars dimmed grey, slate
 *
 * This is what makes the dashboard feel like a *telecom* tool without
 * resorting to mission-control aesthetics. Inline SVG so it's crisp at
 * any size and zero asset overhead.
 */

type Status = 'pending' | 'approving' | 'approved' | 'rotating' | 'rejected' | 'suspended';

interface Props {
  status: Status;
  size?:  number;  // pixel width of the whole glyph; default 28
}

const BAR_HEIGHTS = [4, 7, 10, 13, 16];   // px, ramped — telecom signal feel
const TOTAL_BARS  = 5;

const COLOR: Record<Status, { lit: string; dim: string; bars: number; pulse?: boolean; strike?: boolean }> = {
  pending:   { lit: 'var(--amber)',   dim: 'var(--hairline-2)', bars: 1, pulse: true },
  approving: { lit: 'var(--sage-500)', dim: 'var(--hairline-2)', bars: 2, pulse: true },
  approved:  { lit: 'var(--moss)',     dim: 'var(--hairline-2)', bars: 5 },
  rotating:  { lit: 'var(--sage-500)', dim: 'var(--hairline-2)', bars: 4, pulse: true },
  rejected:  { lit: 'var(--rust)',     dim: 'var(--rust)',         bars: 5, strike: true },
  suspended: { lit: 'var(--ink-3)',   dim: 'var(--ink-3)',       bars: 5 },
};

export default function SignalIndicator({ status, size = 28 }: Props) {
  const c = COLOR[status] ?? COLOR.pending;
  const gap = 2;
  const barW = (size - gap * (TOTAL_BARS - 1)) / TOTAL_BARS;

  return (
    <span
      aria-label={`status ${status}`}
      title={status}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        gap: `${gap}px`,
        height: `${BAR_HEIGHTS[TOTAL_BARS - 1] + 2}px`,
        opacity: status === 'suspended' ? 0.5 : 1,
        position: 'relative',
      }}
    >
      {BAR_HEIGHTS.map((h, i) => {
        const lit = i < c.bars;
        return (
          <span
            key={i}
            style={{
              width: `${barW}px`,
              height: `${h}px`,
              background: lit ? c.lit : c.dim,
              borderRadius: '1.5px',
              opacity: lit ? 1 : 0.35,
              animation: c.pulse && i === c.bars - 1 ? 'sig-pulse 1.8s ease-in-out infinite' : undefined,
            }}
          />
        );
      })}
      {c.strike && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%', left: '-2px', right: '-2px',
            height: '1.5px',
            background: 'var(--rust)',
            transform: 'rotate(-18deg)',
            transformOrigin: 'center',
            borderRadius: '1px',
            opacity: 0.7,
          }}
        />
      )}
      <style jsx>{`
        @keyframes sig-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
      `}</style>
    </span>
  );
}
