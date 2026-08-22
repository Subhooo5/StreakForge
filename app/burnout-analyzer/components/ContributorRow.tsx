import SparkLine from './SparkLine';
import Avatar from '@/components/Avatar';

interface ContributorRowProps {
  handle: string;
  initial: string;
  avatar: string;
  avatarUrl?: string;
  commitsStr: string;
  shareStr: string;
  sparkData: number[];
  sparkColor: string;
  intense: string;
  rest: string;
  riskPct: string;
  riskLabel: string;
  riskColor: string;
}

export default function ContributorRow({ handle, initial, avatar, avatarUrl, commitsStr, shareStr, sparkData, sparkColor, intense, rest, riskPct, riskLabel, riskColor }: ContributorRowProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.7fr .8fr 1.4fr .7fr .7fr .9fr', gap: '10px', alignItems: 'center', padding: '14px 6px', borderBottom: '1px solid var(--line2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
        <Avatar src={avatarUrl} initial={initial} tint={avatar} size={34} alt={`@${handle}`} />
        <div style={{ minWidth: 0 }}>
          <a className="mono" href={`https://github.com/${handle}`} target="_blank" rel="noopener" style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}>@{handle}</a>
          <div className="ui" style={{ fontSize: '11px', color: 'var(--faint)' }}>{commitsStr} commits</div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: '14px', fontWeight: 600 }}>{shareStr}</div>
      <div><SparkLine data={sparkData} color={sparkColor} /></div>
      <div className="mono" style={{ fontSize: '12.5px', color: 'var(--soft)' }}>{intense}</div>
      <div className="mono" style={{ fontSize: '12.5px', color: 'var(--soft)' }}>{rest}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span className="ui" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 11px', borderRadius: '100px', border: `1px solid color-mix(in srgb,${riskColor} 40%,var(--line))`, background: `color-mix(in srgb,${riskColor} 12%,transparent)`, fontSize: '10.5px', fontWeight: 700, letterSpacing: '.04em', color: riskColor, textTransform: 'uppercase', whiteSpace: 'nowrap' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: riskColor }}></span>{riskPct} {riskLabel}</span>
      </div>
    </div>
  );
}
