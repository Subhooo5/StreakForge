import 'server-only';
import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { decryptToken } from '@/lib/crypto';

export async function getUserGitHubToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const jwt = await getToken({
    req: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!jwt?.ghToken || typeof jwt.ghToken !== 'string') return undefined;

  try {
    return await decryptToken(jwt.ghToken);
  } catch {
    return undefined;
  }
}
