// Client-side GitHub handle format check.
//
// Deliberately a local copy of the pattern rather than an import from
// `lib/validations` — `lib/` is backend-only and pulling it into a client
// component would drag zod and the whole schema module into the page bundle.
// The regex is the same one the API route validates with, so the client can
// reject obviously-malformed handles before spending a request.
const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidGithubUsername(username: string): boolean {
  const u = (username || '').trim();
  return u.length > 0 && u.length <= 39 && GITHUB_USERNAME_REGEX.test(u);
}
