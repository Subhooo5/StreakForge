import type { BurnoutReport } from '@/types/burnout';
import type { BurnoutView } from '../data/deriveView';

export function todayStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function reportFileBase(report: BurnoutReport): string {
  return `${report.owner}-${report.repo}-report-${todayStamp()}`;
}

export function buildJson(report: BurnoutReport, view: BurnoutView): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      repository: report.repoName,
      owner: report.owner,
      repo: report.repo,
      filters: { excludeBots: report.botsExcluded, botAccountsFiltered: report.botsFiltered },
      sustainability: {
        score: report.sustainabilityScore,
        status: view.health,
      },
      riskAssessment: {
        score: view.risk.score,
        level: view.risk.level,
        description: view.risk.description,
      },
      totals: {
        commits: report.totalCommits,
        contributors: report.totalContributors,
        contributorsTruncatedAt500: report.contributorsTruncated,
      },
      dependency: {
        busFactor: report.busFactor,
        dependencyRisk: report.dependencyRisk,
        topContributorShare: view.conc,
        topContributor: view.topContributor,
      },
      commitTiming: report.timing,
      weeklyActivity: report.weeklyActivity,
      riskIndicators: view.indicators.map((i) => ({ label: i.label, level: i.level, detail: i.text })),
      contributors: report.contributors,
      inactivityAlerts: report.inactivityAlerts,
      recommendations: report.recommendations,
      recommendedActions: view.recs.map((r) => ({ title: r.title, detail: r.text })),
    },
    null,
    2,
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function buildMarkdown(report: BurnoutReport, view: BurnoutView): string {
  const L: string[] = [];

  L.push(`# Burnout & Sustainability Report — ${report.repoName}`);
  L.push('');
  L.push(`Generated ${new Date().toISOString()} by StreakForge.`);
  L.push('');
  L.push(
    report.botsExcluded
      ? `> Bot and dependency accounts are **excluded** from every figure below (${report.botsFiltered} account${report.botsFiltered === 1 ? '' : 's'} filtered).`
      : '> Bot and dependency accounts are **included** in the figures below.',
  );
  L.push('');

  if (report.empty) {
    L.push('## No contribution data');
    L.push('');
    L.push(`GitHub has no contributor statistics for \`${report.repoName}\`. The repository has no commit history yet, or GitHub has not finished compiling it.`);
    L.push('');
    return L.join('\n');
  }

  L.push('## Summary');
  L.push('');
  L.push('| Metric | Value |');
  L.push('| --- | --- |');
  L.push(`| Sustainability score | ${report.sustainabilityScore}/100 (${view.health}) |`);
  L.push(`| Burnout risk score | ${view.risk.score}/100 (${view.risk.level}) |`);
  L.push(`| Total commits | ${report.totalCommits.toLocaleString()} |`);
  L.push(`| Contributors | ${report.totalContributors.toLocaleString()}${report.contributorsTruncated ? ' (capped at GitHub\'s top 500)' : ''} |`);
  L.push(`| Bus factor | ${report.busFactor} |`);
  L.push(`| Dependency risk | ${report.dependencyRisk} |`);
  L.push(`| Top contributor concentration | ${view.conc.toFixed(2)}% (@${view.topContributor}) |`);
  L.push('');

  L.push('## Repository Dependency Analysis');
  L.push('');
  L.push(`**Bus factor:** ${report.busFactor} developer${report.busFactor === 1 ? '' : 's'} to account for 70% of all commits.`);
  L.push('');
  L.push(`**Top concentration:** ${view.conc.toFixed(2)}% held by @${view.topContributor}.`);
  L.push('');
  L.push(`**${view.busLevel} dependency risk** — ${view.busNote}`);
  L.push('');

  L.push('## Contributor Workload & Burnout Risk');
  L.push('');
  L.push('| Contributor | Commits | Share | Intense weeks | Rest weeks | Burnout risk |');
  L.push('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const c of report.contributors) {
    const weeks = c.recentTrend.length || 12;
    L.push(
      `| @${c.username} | ${c.totalCommits.toLocaleString()} | ${c.commitShare.toFixed(2)}% | ${c.highIntensityWeeks}/${weeks} | ${c.restWeeks}/${weeks} | ${c.burnoutScore}% ${c.riskLevel} |`,
    );
  }
  L.push('');

  L.push('## Commit Timing Patterns');
  L.push('');
  L.push('| Weekday | Commits |');
  L.push('| --- | ---: |');
  WEEKDAYS.forEach((d, i) => L.push(`| ${d} | ${(report.timing.byWeekday[i] ?? 0).toLocaleString()} |`));
  L.push('');
  L.push(`- Off-hours commits (outside 09:00–18:00): **${report.timing.offHoursPct}%**`);
  L.push(`- Weekend activity: **${report.timing.weekendPct}%**`);
  L.push(`- Busiest weekday: **${view.peakDay}**`);
  L.push('');
  L.push('_Timing comes from GitHub\'s day/hour histogram, which carries no author and is therefore unaffected by the bot filter._');
  L.push('');

  L.push('## Activity Breakdown · Last 12 Weeks');
  L.push('');
  L.push('| Week | Commits |');
  L.push('| --- | ---: |');
  report.weeklyActivity.last12Weeks.forEach((n, i) => L.push(`| W${i + 1} | ${n.toLocaleString()} |`));
  L.push('');
  L.push(`Average: **${report.weeklyActivity.avgWeeklyCommits.toLocaleString()} commits/week**.`);
  L.push('');

  L.push('## Risk Indicators');
  L.push('');
  for (const i of view.indicators) L.push(`- **${i.label}** — ${i.level}. ${i.text}`);
  L.push('');

  if (report.inactivityAlerts.length > 0) {
    L.push('## Inactivity Alerts');
    L.push('');
    for (const a of report.inactivityAlerts) {
      L.push(`- **@${a.username}** (${a.severity}) — silent ${a.weeksSilent} week${a.weeksSilent === 1 ? '' : 's'}, previously averaging ${a.previousAvgWeeklyCommits} commits/week.`);
    }
    L.push('');
  }

  L.push('## Risk Assessment');
  L.push('');
  L.push(`**${view.risk.score}/100 — ${view.risk.level} risk.** ${view.risk.description}`);
  L.push('');

  L.push('## AI & Heuristic Recommendations');
  L.push('');
  for (const r of report.recommendations) L.push(`- ${r.ai ? '**[AI generated]** ' : ''}${r.text}`);
  L.push('');

  L.push('## Recommended Actions');
  L.push('');
  for (const r of view.recs) L.push(`### ${r.title}\n\n${r.text}\n`);

  return L.join('\n');
}

export function buildShareLink(report: BurnoutReport): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ owner: report.owner, repo: report.repo });
  if (report.botsExcluded) params.set('excludeBots', 'true');
  return `${origin}/burnout-analyzer?${params.toString()}`;
}

export function downloadBlob(contents: BlobPart, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('Clipboard is unavailable in this browser.');
}

export async function buildPdf(report: BurnoutReport, view: BurnoutView): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const M = 48;
  const W = PAGE_W - M * 2;
  let y = M;

  const room = (need: number) => {
    if (y + need > PAGE_H - M) {
      doc.addPage();
      y = M;
    }
  };

  const heading = (text: string, size = 13) => {
    room(size + 18);
    y += 10;
    doc.setFont('helvetica', 'bold').setFontSize(size).setTextColor(20, 20, 24);
    doc.text(text, M, y);
    y += 6;
    doc.setDrawColor(215, 215, 220).setLineWidth(0.7).line(M, y, M + W, y);
    y += 14;
  };

  const para = (text: string, size = 10, color: [number, number, number] = [70, 70, 78]) => {
    doc.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...color);
    for (const line of doc.splitTextToSize(text, W) as string[]) {
      room(size + 4);
      doc.text(line, M, y);
      y += size + 4;
    }
  };

  const table = (cols: string[], widths: number[], rows: string[][]) => {
    const xs: number[] = [];
    let acc = M;
    widths.forEach((w) => { xs.push(acc); acc += w * W; });

    room(30);
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(90, 90, 98);
    cols.forEach((c, i) => doc.text(c, xs[i], y));
    y += 6;
    doc.setDrawColor(215, 215, 220).line(M, y, M + W, y);
    y += 12;

    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(45, 45, 52);
    rows.forEach((r, ri) => {
      room(18);
      if (ri % 2 === 1) {
        doc.setFillColor(246, 246, 248).rect(M - 4, y - 9, W + 8, 15, 'F');
      }
      r.forEach((cell, i) => {
        const w = widths[i] * W - 8;
        const clipped = (doc.splitTextToSize(cell, w) as string[])[0] ?? '';
        doc.text(clipped, xs[i], y);
      });
      y += 15;
    });
    y += 4;
  };

  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(20, 20, 24);
  doc.text('Burnout & Sustainability Report', M, y);
  y += 24;
  doc.setFont('helvetica', 'normal').setFontSize(12).setTextColor(70, 70, 78);
  doc.text(report.repoName, M, y);
  y += 16;
  doc.setFontSize(9).setTextColor(120, 120, 128);
  doc.text(`Generated ${new Date().toLocaleString()} · StreakForge`, M, y);
  y += 12;
  doc.text(
    report.botsExcluded
      ? `Bot and dependency accounts EXCLUDED (${report.botsFiltered} filtered)`
      : 'Bot and dependency accounts included',
    M,
    y,
  );
  y += 8;

  if (report.empty) {
    heading('No contribution data');
    para(`GitHub has no contributor statistics for ${report.repoName}. The repository has no commit history yet, or GitHub has not finished compiling it.`);
    return doc.output('blob');
  }

  heading('Summary');
  table(
    ['Metric', 'Value'],
    [0.55, 0.45],
    [
      ['Sustainability score', `${report.sustainabilityScore}/100 (${view.health})`],
      ['Burnout risk score', `${view.risk.score}/100 (${view.risk.level})`],
      ['Total commits', report.totalCommits.toLocaleString()],
      ['Contributors', report.totalContributors.toLocaleString() + (report.contributorsTruncated ? ' (top 500)' : '')],
      ['Bus factor', String(report.busFactor)],
      ['Dependency risk', report.dependencyRisk],
      ['Top concentration', `${view.conc.toFixed(2)}% (@${view.topContributor})`],
    ],
  );

  heading('Repository Dependency Analysis');
  para(`${view.busLevel} dependency risk. ${view.busNote}`);

  heading('Contributor Workload & Burnout Risk');
  table(
    ['Contributor', 'Commits', 'Share', 'Intense', 'Rest', 'Risk'],
    [0.32, 0.14, 0.12, 0.12, 0.11, 0.19],
    report.contributors.slice(0, 60).map((c) => {
      const weeks = c.recentTrend.length || 12;
      return [
        '@' + c.username,
        c.totalCommits.toLocaleString(),
        c.commitShare.toFixed(2) + '%',
        `${c.highIntensityWeeks}/${weeks}`,
        `${c.restWeeks}/${weeks}`,
        `${c.burnoutScore}% ${c.riskLevel}`,
      ];
    }),
  );
  if (report.contributors.length > 60) {
    para(`Showing the top 60 of ${report.contributors.length} contributors. The JSON and Markdown exports carry the full list.`, 8, [130, 130, 138]);
  }

  heading('Commit Timing Patterns');
  table(
    ['Weekday', 'Commits'],
    [0.55, 0.45],
    WEEKDAYS.map((d, i) => [d, (report.timing.byWeekday[i] ?? 0).toLocaleString()]),
  );
  para(`Off-hours ${report.timing.offHoursPct}% · Weekend ${report.timing.weekendPct}% · Busiest weekday ${view.peakDay}`);

  heading('Activity Breakdown - Last 12 Weeks');
  table(
    ['Week', 'Commits'],
    [0.55, 0.45],
    report.weeklyActivity.last12Weeks.map((n, i) => [`W${i + 1}`, n.toLocaleString()]),
  );
  para(`Average ${report.weeklyActivity.avgWeeklyCommits.toLocaleString()} commits per week.`);

  heading('Risk Indicators');
  for (const i of view.indicators) para(`${i.label} - ${i.level}. ${i.text}`);

  if (report.inactivityAlerts.length > 0) {
    heading('Inactivity Alerts');
    for (const a of report.inactivityAlerts) {
      para(`@${a.username} (${a.severity}) - silent ${a.weeksSilent} week(s), previously ${a.previousAvgWeeklyCommits} commits/week.`);
    }
  }

  heading('Risk Assessment');
  para(`${view.risk.score}/100 - ${view.risk.level} risk. ${view.risk.description}`);

  heading('AI & Heuristic Recommendations');
  for (const r of report.recommendations) para(`${r.ai ? '[AI generated] ' : ''}${r.text}`);

  heading('Recommended Actions');
  for (const r of view.recs) {
    room(30);
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(30, 30, 36);
    doc.text(r.title, M, y);
    y += 13;
    para(r.text);
    y += 4;
  }

  return doc.output('blob');
}
