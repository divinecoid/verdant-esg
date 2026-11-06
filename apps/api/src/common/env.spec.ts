import { assertEnv } from './env';

const ok = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 'dev-secret' };

describe('assertEnv', () => {
  it('accepts a minimal development environment', () => {
    expect(() => assertEnv(ok)).not.toThrow();
  });

  it('requires the database and the signing secret', () => {
    expect(() => assertEnv({})).toThrow(/DATABASE_URL is not set[\s\S]*JWT_SECRET is not set/);
  });

  describe('in production', () => {
    const prod = { ...ok, NODE_ENV: 'production', CORS_ORIGIN: 'https://esg.example.com', JWT_SECRET: 'x'.repeat(40) };

    it('accepts a strong secret and explicit origins', () => {
      expect(() => assertEnv(prod)).not.toThrow();
    });

    it('rejects the example secret, short secrets, and a missing CORS origin', () => {
      expect(() => assertEnv({ ...prod, JWT_SECRET: 'change-me-in-real-environments' })).toThrow('still the example value');
      expect(() => assertEnv({ ...prod, JWT_SECRET: 'short' })).toThrow('at least 32 characters');
      expect(() => assertEnv({ ...prod, CORS_ORIGIN: undefined })).toThrow('CORS_ORIGIN must be set');
    });
  });
});
