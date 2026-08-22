export interface SecretFinding {
  type: string;
  index: number;
  length: number;
}

interface SecretPattern {
  type: string;
  pattern: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    type: 'github-token',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b|\bgithub_pat_[A-Za-z0-9_]{22,255}\b/g,
  },
  {
    type: 'aws-access-key-id',
    pattern: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
  },
  {
    type: 'google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    type: 'slack-token',
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,250}\b/g,
  },
  {
    type: 'stripe-key',
    pattern: /\b[rs]k_live_[0-9a-zA-Z]{24,247}\b/g,
  },
  {
    type: 'openai-key',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}\b|\bsk-proj-[A-Za-z0-9_-]{40,}\b/g,
  },
  {
    type: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    type: 'private-key-block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  },
  {
    type: 'connection-string-credentials',
    pattern: /\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s:/@]+:[^\s@]+@[^\s]+/g,
  },
  {
    type: 'credential-assignment',
    pattern:
      /\b(?:password|passwd|pwd|api[_-]?key|apikey|secret|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*["']?(?!\s)(?!["'])(?!\$\{)(?!<[^>]+>)[^\s"']{8,}["']?/gi,
  },
];

const REDACTION_LABEL = (type: string) => `[REDACTED:${type}]`;

export function detectSecrets(text: string): SecretFinding[] {
  if (!text) return [];
  const findings: SecretFinding[] = [];
  const claimed: [number, number][] = [];

  for (const { type, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      claimed.push([start, end]);
      findings.push({ type, index: start, length: match[0].length });
    }
  }

  return findings.sort((a, b) => a.index - b.index);
}

export function containsSecrets(text: string): boolean {
  return detectSecrets(text).length > 0;
}

export function redactSecrets(text: string): string {
  const findings = detectSecrets(text);
  if (findings.length === 0) return text;

  let result = '';
  let cursor = 0;
  for (const finding of findings) {
    result += text.slice(cursor, finding.index) + REDACTION_LABEL(finding.type);
    cursor = finding.index + finding.length;
  }
  result += text.slice(cursor);
  return result;
}
