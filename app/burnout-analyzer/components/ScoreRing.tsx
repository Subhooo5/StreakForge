interface ScoreRingProps { score: number; color: string; }

export default function ScoreRing({ score, color }: ScoreRingProps) {
  const R = 42, C = 2 * Math.PI * R, off = C * (1 - score / 100);
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <circle cx={50} cy={50} r={R} fill="none" stroke="var(--line)" strokeWidth={8} />
      <circle cx={50} cy={50} r={R} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 50 50)" />
      <text x={50} y={47} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize={24} fontWeight={700} fill="var(--text)">{score}</text>
      <text x={50} y={63} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={8} letterSpacing={1.5} fill="var(--soft)">SCORE</text>
    </svg>
  );
}
