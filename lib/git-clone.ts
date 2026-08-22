import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFilePromise = promisify(execFile);

export function buildGitCloneInvocation(
  owner: string,
  repo: string,
  destDir: string,
  token?: string
): { command: string; args: string[] } {
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  const baseArgs = ['clone', '--depth', '1', '--', cloneUrl, destDir];

  if (token) {
    return {
      command: 'git',
      args: ['-c', `http.extraHeader=Authorization: Bearer ${token}`, ...baseArgs],
    };
  }

  return { command: 'git', args: baseArgs };
}

export async function cloneGitHubRepository(
  owner: string,
  repo: string,
  destDir: string,
  token?: string
): Promise<void> {
  const { command, args } = buildGitCloneInvocation(owner, repo, destDir, token);
  const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  await execFilePromise(command, args, { env: gitEnv });
}
