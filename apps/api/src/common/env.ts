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
