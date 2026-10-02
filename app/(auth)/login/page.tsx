'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, Shield, User, Loader2, Lock, Hash, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, member, loading } = useAuth();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [loginType, setLoginType] = useState<'Member' | 'Admin'>('Member');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!loading && member) router.replace('/dashboard');
  }, [member, loading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || !password.trim()) {
      setError('Please enter both Employee ID and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    const { error: err } = await login(employeeId.trim(), password, rememberMe, loginType);
    if (err) {
      setError(err);
      setSubmitting(false);
    } else {
      toast.success('Welcome back! Redirecting...');
      router.push('/dashboard');
    }
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotSent(true);
    toast.info('Password reset request sent. Please contact your admin.');
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background dot-grid px-4 py-8">
      <div className="w-full max-w-[400px] animate-fade-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-muted-foreground/60 mb-5">
            Secure Portal
          </p>
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border shadow-sm">
              <Image src="/logo.jpg" alt="TPAS Logo" width={32} height={32} className="rounded-lg" />
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground text-sm leading-tight group-hover:opacity-80 transition-opacity">TPAS</p>
              <p className="text-muted-foreground text-xs leading-tight">Kanniyakumari</p>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="border border-border rounded-xl bg-card shadow-sm p-6 md:p-8">
          {!forgotMode ? (
            <>
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {loginType === 'Member'
                    ? 'Sign in to your TPAS member account.'
                    : 'Sign in to TPAS administration.'}
                </p>
              </div>

              {/* Segmented Control */}
              <div className="flex p-1 bg-muted rounded-lg mb-6 border border-border/50">
                <button
                  type="button"
                  onClick={() => { setLoginType('Member'); setError(''); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    loginType === 'Member'
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginType('Admin'); setError(''); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    loginType === 'Admin'
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Employee ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="employeeId">
                    Employee ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      id="employeeId"
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="Enter your employee ID"
                      className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-11 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me + Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border transition-all flex items-center justify-center',
                        rememberMe ? 'bg-foreground border-foreground' : 'border-border group-hover:border-muted-foreground'
                      )}
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-background" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(''); }}
                    className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-muted border border-border rounded-lg text-foreground text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-2.5 mt-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </>
          ) : (
            <>
              {/* Forgot Password */}
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); }}
                className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to login
              </button>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground">Forgot your password?</h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Enter your Employee ID and we&apos;ll send the request to your administrator.
                </p>
              </div>
              {!forgotSent ? (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="forgotId">
                      Employee ID
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        id="forgotId"
                        type="text"
                        value={forgotId}
                        onChange={(e) => setForgotId(e.target.value.toUpperCase())}
                        placeholder="Enter your employee ID"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn-primary w-full py-2.5"
                  >
                    Send reset request
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center p-6 bg-muted border border-border rounded-lg animate-fade-in">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-foreground font-semibold text-sm">Request sent</p>
                  <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                    Your password reset request has been sent. Your admin will reset your password shortly.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/40 mt-6">
          copyright @hyperqube
        </p>
      </div>
    </div>
  );
}
