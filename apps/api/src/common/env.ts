const PLACEHOLDER_SECRET = 'change-me-in-real-environments';

/** Throws a readable error when the environment cannot be run safely. Called before the app starts. */
export function assertEnv(env: Record<string, string | undefined>) {
  const problems: string[] = [];
  if (!env.DATABASE_URL) problems.push('DATABASE_URL is not set');
  if (!env.JWT_SECRET) problems.push('JWT_SECRET is not set');

  if (env.NODE_ENV === 'production') {
    const secret = env.JWT_SECRET ?? '';
    if (secret === PLACEHOLDER_SECRET) problems.push('JWT_SECRET is still the example value');
    else if (secret && secret.length < 32) problems.push('JWT_SECRET must be at least 32 characters in production');
    if (!env.CORS_ORIGIN) problems.push('CORS_ORIGIN must be set in production (comma-separated allowed origins)');
  }

  if (problems.length) throw new Error(`Invalid configuration:\n - ${problems.join('\n - ')}`);
}

/**
 * The first-admin seed falls back to a well-known password for local development. In production that fallback
 * would be a publicly known login, so the seed must be given its own strong password or it refuses to run.
 */
export function assertSeedCredentials(env: Record<string, string | undefined>) {
  if (env.NODE_ENV !== 'production') return;
  const password = env.SEED_ADMIN_PASSWORD ?? '';
  if (!password) throw new Error('SEED_ADMIN_PASSWORD must be set in production (the development default is public knowledge)');
  if (password === 'admin12345' || password === 'CHANGE_ME') throw new Error('SEED_ADMIN_PASSWORD is still an example value');
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters in production');
}
