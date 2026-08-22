export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCriticalEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const errors: string[] = [];

  const authSecret = env.AUTH_SECRET;
  if (!authSecret) {
    errors.push(
      'AUTH_SECRET is not set. ' +
        'Generate one with: openssl rand -base64 32 ' +
        'and add it to your .env.local and deployment environment.'
    );
  } else if (authSecret.length < 32) {
    errors.push(
      `AUTH_SECRET is too short (${authSecret.length} chars). ` +
        'It must be at least 32 characters to provide sufficient entropy for JWT signing.'
    );
  }

  const encryptionKey = env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    errors.push(
      'ENCRYPTION_KEY is not set. ' +
        'Generate one with: openssl rand -hex 32 ' +
        'and add it to your .env.local and deployment environment.'
    );
  } else if (encryptionKey.length < 32) {
    errors.push(
      `ENCRYPTION_KEY is too short (${encryptionKey.length} chars). ` +
        'It must be at least 32 characters to satisfy AES-256 key derivation requirements.'
    );
  }

  return { valid: errors.length === 0, errors };
}

export function assertCriticalEnv(env: NodeJS.ProcessEnv = process.env): void {
  const result = validateCriticalEnv(env);
  if (!result.valid) {
    throw new Error(
      '[StreakForge] Server startup aborted — missing or invalid environment variables:\n' +
        result.errors.map((e) => `  • ${e}`).join('\n') +
        '\n\nSee .env.local.example for setup instructions.'
    );
  }
}
