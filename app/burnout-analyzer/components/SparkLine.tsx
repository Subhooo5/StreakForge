interface SparkLineProps { data: number[]; color: string; }

export default function SparkLine({ data, color }: SparkLineProps) {
  const w = 120, h = 26, n = data.length;
  if (n === 0) return <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block', maxWidth: '150px' }} />;
  const max = Math.max(...data, 0.001);
  // A single sample has no span to distribute across, so pin it to the left.
  const pts = data.map((v, i) => [n === 1 ? 0 : (i / (n - 1)) * w, h - 3 - (v / max) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + Math.round(p[0] * 10) / 10 + ' ' + Math.round(p[1] * 10) / 10).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block', maxWidth: '150px' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
