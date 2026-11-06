import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { LogoMark, Wordmark } from '../components/Logo';
import { PILLARS, GROUPS } from '../lib/pillars';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type Values = z.infer<typeof schema>;

/** Layered, slowly offset rings; the same motif as the logo, scaled up into a backdrop. */
function Rings() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={470 - i * 6} cy={640 - i * 9} r={60 + i * 34} stroke="var(--color-lime)" strokeOpacity={0.05 + (i % 4) * 0.03} strokeWidth="1" />
      ))}
      <circle cx="470" cy="640" r="4" fill="var(--color-lime)" />
    </svg>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(undefined);
    try {
      await login(email, password);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Login failed');
    }
  });

  const field = (invalid: boolean) =>
    `w-full rounded-xl border bg-card px-4 py-3 text-[15px] outline-none transition-shadow placeholder:text-neutral-400 focus:shadow-[0_0_0_3px_var(--color-forest-200)] ${invalid ? 'border-bad' : 'border-neutral-300 focus:border-forest-500'}`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ background: 'radial-gradient(110% 90% at 0% 0%, #1f4f3d 0%, var(--color-forest-950) 60%)' }}
      >
        <Rings />
        <div className="relative"><Wordmark /></div>
        <div className="relative max-w-lg">
          <h1 className="display text-[64px] leading-[0.98]">
            Sustainability,
            <br />
            measured <em className="text-lime">honestly.</em>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/60">
            One place to collect ESG data from every company, review it twice, calculate what it means, and show the board exactly where you stand.
          </p>
        </div>
        <div className="relative flex gap-2.5">
          {GROUPS.map((g) => (
            <span key={g} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-xs text-white/75">
              <span className="h-2 w-2 rounded-full" style={{ background: PILLARS[g].color }} />
              {PILLARS[g].label}
            </span>
          ))}
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="rise w-full max-w-[380px]">
          <div className="mb-10 flex items-center gap-2.5 text-forest-800 lg:hidden">
            <LogoMark size={30} />
            <span className="display text-[26px]">Verdant.</span>
          </div>
          <div className="eyebrow mb-3">Welcome back</div>
          <h2 className="display text-[44px] text-neutral-900">Sign in</h2>
          <p className="mt-2 text-sm text-neutral-500">Use the account your administrator created for you.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-neutral-700">Email</label>
              <input id="email" type="email" autoComplete="username" placeholder="you@company.com" aria-invalid={!!errors.email} className={field(!!errors.email)} {...register('email')} />
              {errors.email && <p className="mt-1.5 text-xs text-bad">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-neutral-700">Password</label>
              <input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} className={field(!!errors.password)} {...register('password')} />
              {errors.password && <p className="mt-1.5 text-xs text-bad">{errors.password.message}</p>}
            </div>
            {serverError && (
              <p role="alert" className="rounded-xl bg-[#f8e0da] px-4 py-3 text-sm text-[#8a2b17]">
                {serverError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-forest-900 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
