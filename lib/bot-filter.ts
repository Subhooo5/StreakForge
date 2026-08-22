import fs from 'node:fs';
import path from 'node:path';

export function getIgnoredAuthors(): string[] {
  try {
    const configPath = path.join(process.cwd(), '.streakforge.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      if (config && Array.isArray(config.ignored_authors)) {
        return config.ignored_authors.map((author: string) => author.toLowerCase());
      }
    }
  } catch {
  }
  return [];
}

export function isBotAuthor(username: string): boolean {
  if (!username) return false;
  const lowerUsername = username.toLowerCase();

  const ignored = getIgnoredAuthors();
  if (ignored.includes(lowerUsername)) {
    return true;
  }

  if (/\[bot\]$/i.test(username)) {
    return true;
  }

  if (
    lowerUsername.endsWith('-bot') ||
    lowerUsername === 'dependabot' ||
    lowerUsername === 'renovate'
  ) {
    return true;
  }

  return false;
}
