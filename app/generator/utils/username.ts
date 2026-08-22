const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidGithubUsername(username: string): boolean {
  const u = (username || '').trim();
  return u.length > 0 && u.length <= 39 && GITHUB_USERNAME_REGEX.test(u);
}
