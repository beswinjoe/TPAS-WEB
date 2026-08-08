'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, LogIn, Lock, Hash, AlertCircle, Shield, User } from 'lucide-react';
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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(135deg, #0F2044 0%, #1a3a6c 50%, #0369a1 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full bg-blue-500/10 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <Image src="/images/logo.jpg" alt="TPAS Logo" width={52} height={52} className="rounded-xl" />
          <div>
            <p className="text-white font-bold text-xl leading-tight">TPAS</p>
            <p className="text-blue-200 text-sm">Kanniyakumari</p>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-white text-4xl font-bold leading-tight mb-4">
              Member Portal
            </h2>
            <p className="text-blue-200 text-lg leading-relaxed">
              Securely manage memberships, donations, events, and organizational activities.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Members', value: '500+' },
              { label: 'Divisions', value: '5' },
              { label: 'Active Since', value: '2020' },
              { label: 'Annual Events', value: '12+' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/8 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-blue-200 text-xs font-medium">{stat.label}</p>
                <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-blue-300/60 text-sm">
            © {new Date().getFullYear()} TPAS Kanniyakumari. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 bg-background">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <Image src="/images/logo.jpg" alt="TPAS Logo" width={44} height={44} className="rounded-xl" />
          <div>
            <p className="text-foreground font-bold text-lg">TPAS Kanniyakumari</p>
            <p className="text-muted-foreground text-sm">Member Portal</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          {!forgotMode ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome back</h1>
                <p className="text-muted-foreground mt-2">Sign in to your account</p>
              </div>

              {/* Login Type Tabs */}
              <div className="flex p-1 bg-muted/50 rounded-xl mb-8 border border-border">
                <button
                  type="button"
                  onClick={() => { setLoginType('Member'); setError(''); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
                    loginType === 'Member' 
                      ? "bg-white text-blue-900 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  <User className="w-4 h-4" />
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginType('Admin'); setError(''); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all",
                    loginType === 'Admin' 
                      ? "bg-blue-900 text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Employee ID */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="employeeId">
                    Employee ID
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="employeeId"
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                      placeholder="e.g. 1234455"
                      className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                        'w-4.5 h-4.5 rounded border-2 transition-all flex items-center justify-center',
                        rememberMe ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'
                      )}
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(''); }}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 px-6 text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg",
                    loginType === 'Admin' ? "bg-slate-900 shadow-slate-900/25" : "gradient-primary shadow-primary/25"
                  )}
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); }}
                className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
              >
                ← Back to login
              </button>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-foreground">Forgot Password</h1>
                <p className="text-muted-foreground mt-2">
                  Enter your Employee ID and a reset request will be sent to the admin.
                </p>
              </div>
              {!forgotSent ? (
                <form onSubmit={handleForgot} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="forgotId">
                      Employee ID
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        id="forgotId"
                        type="text"
                        value={forgotId}
                        onChange={(e) => setForgotId(e.target.value.toUpperCase())}
                        placeholder="e.g. 1234455"
                        className="w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25"
                  >
                    Send Reset Request
                  </button>
                </form>
              ) : (
                <div className="text-center p-8 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl animate-fade-in">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-800 dark:text-green-300 font-semibold">Request Sent!</p>
                  <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                    Your password reset request has been sent. Your admin will reset your password shortly.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
