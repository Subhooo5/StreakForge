interface RiskGaugeProps {
  score: number;
  color: string;
}

export default function RiskGauge({ score, color }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));

  const R = 70;
  const CX = 90;
  const CY = 90;

  const point = (pct: number) => {
    const angle = Math.PI - (pct / 100) * Math.PI;
    return [CX + R * Math.cos(angle), CY - R * Math.sin(angle)];
  };

  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  const needleAngle = Math.PI - (clamped / 100) * Math.PI;
  const nx = CX + (R - 14) * Math.cos(needleAngle);
  const ny = CY - (R - 14) * Math.sin(needleAngle);

  return (
    <svg viewBox="0 0 180 116" width="100%" height="100%" style={{ display: 'block', maxWidth: '260px' }} role="img" aria-label={`Burnout risk score ${clamped} out of 100`}>
      {}
      <path d={arc(0, 30)} fill="none" stroke="var(--good)" strokeWidth={9} strokeLinecap="round" opacity={0.28} />
      <path d={arc(31, 70)} fill="none" stroke="var(--warn)" strokeWidth={9} strokeLinecap="round" opacity={0.28} />
      <path d={arc(71, 100)} fill="none" stroke="var(--bad)" strokeWidth={9} strokeLinecap="round" opacity={0.28} />

      {}
      <path d={arc(0, Math.max(0.5, clamped))} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />

      <line x1={CX} y1={CY} x2={nx.toFixed(2)} y2={ny.toFixed(2)} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={5.5} fill={color} />
      <circle cx={CX} cy={CY} r={2.2} fill="var(--bg)" />

      <text x={CX} y={CY - 22} textAnchor="middle" fontFamily="'JetBrains Mono',monospace" fontSize={30} fontWeight={700} fill="var(--text)">
        {clamped}
      </text>
      <text x={16} y={CY + 18} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={9} fill="var(--faint)">
        0
      </text>
      <text x={164} y={CY + 18} textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontSize={9} fill="var(--faint)">
        100
      </text>
    </svg>
  );
}
