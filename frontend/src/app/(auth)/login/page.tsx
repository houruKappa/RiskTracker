'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<{ email: string; password: string }>();

  const emailValue = watch('email', '');
  const passwordValue = watch('password', '');

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success(t.auth.loginSuccess);
    } catch {
      toast.error(t.auth.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .login-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #fefefe 0%, #fdf4f8 25%, #faf0f5 50%, #fdf4f8 75%, #fefefe 100%);
          background-size: 400% 400%;
          animation: loginGradientShift 20s ease infinite;
        }

        @keyframes loginGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.35;
          will-change: transform;
        }

        .login-orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #f9a8d4 0%, transparent 70%);
          top: -20%;
          left: -15%;
          animation: loginFloat1 22s ease-in-out infinite;
        }

        .login-orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #d8b4fe 0%, transparent 70%);
          bottom: -15%;
          right: -10%;
          animation: loginFloat2 26s ease-in-out infinite;
        }

        .login-orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, #a5f3fc 0%, transparent 70%);
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: loginFloat3 19s ease-in-out infinite;
        }

        .login-orb-4 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #fecdd3 0%, transparent 70%);
          top: 15%;
          right: 15%;
          animation: loginFloat4 24s ease-in-out infinite;
        }

        .login-orb-5 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, #c4b5fd 0%, transparent 70%);
          bottom: 20%;
          left: 15%;
          animation: loginFloat5 20s ease-in-out infinite;
        }

        @keyframes loginFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(100px, 80px) scale(1.15); }
          50% { transform: translate(50px, 150px) scale(0.9); }
          75% { transform: translate(-50px, 80px) scale(1.08); }
        }

        @keyframes loginFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-120px, -100px) scale(1.2); }
          66% { transform: translate(-60px, 50px) scale(0.85); }
        }

        @keyframes loginFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.4); }
        }

        @keyframes loginFloat4 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          50% { transform: translate(-80px, 100px) rotate(180deg) scale(1.1); }
        }

        @keyframes loginFloat5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(90px, -60px) scale(1.15); }
          80% { transform: translate(30px, 40px) scale(0.95); }
        }

        .login-noise {
          position: fixed;
          inset: 0;
          z-index: 1;
          opacity: 0.025;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .login-glass {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(30px) saturate(1.6);
          -webkit-backdrop-filter: blur(30px) saturate(1.6);
          border: 1px solid rgba(236,72,153,0.12);
          border-radius: 28px;
          padding: 48px 40px;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 4px 6px -1px rgba(236,72,153,0.06),
            0 20px 50px -12px rgba(236,72,153,0.12),
            0 0 0 1px rgba(255,255,255,0.5) inset;
        }

        .login-glass::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
        }

        .login-glass::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 20%, rgba(236,72,153,0.06) 0%, transparent 50%);
          pointer-events: none;
        }

        .login-logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 24px rgba(236,72,153,0.3);
          animation: loginPulseGlow 3s ease-in-out infinite;
          position: relative;
          flex-shrink: 0;
        }

        .login-logo-icon::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4);
          z-index: -1;
          opacity: 0.4;
          filter: blur(8px);
          animation: loginPulseGlow 3s ease-in-out infinite;
        }

        @keyframes loginPulseGlow {
          0%, 100% { box-shadow: 0 6px 24px rgba(236,72,153,0.3); }
          50% { box-shadow: 0 6px 40px rgba(236,72,153,0.45), 0 0 60px rgba(139,92,246,0.15); }
        }

        .login-logo-text {
          font-size: 1.6rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-input {
          width: 100%;
          padding: 14px 16px 14px 46px;
          background: rgba(255,255,255,0.6);
          border: 1.5px solid rgba(236,72,153,0.12);
          border-radius: 14px;
          color: #1e1b2e;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: text;
        }

        .login-input::placeholder { color: #9ca3af; }

        .login-input:focus {
          border-color: #ec4899;
          background: rgba(255,255,255,0.85);
          box-shadow: 0 0 0 4px rgba(236,72,153,0.1), 0 4px 20px rgba(236,72,153,0.08);
        }

        .login-input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 4px rgba(239,68,68,0.08) !important;
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #ec4899, #a855f7, #6366f1);
          background-size: 200% 200%;
          border: none;
          border-radius: 14px;
          color: #fff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(236,72,153,0.3);
          animation: loginBtnGradient 4s ease infinite;
        }

        @keyframes loginBtnGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .login-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 40px rgba(236,72,153,0.4);
        }

        .login-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 4px 15px rgba(236,72,153,0.3);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-fade-up {
          animation: loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0;
        }

        .login-divider::before, .login-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(236,72,153,0.12), transparent);
        }

        @media (max-width: 480px) {
          .login-glass { padding: 36px 24px; border-radius: 22px; }
          .login-orb-1 { width: 350px; height: 350px; }
          .login-orb-2 { width: 300px; height: 300px; }
          .login-orb-3 { width: 200px; height: 200px; }
          .login-orb-4, .login-orb-5 { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
          .login-orb, .login-bg { animation: none !important; }
        }

        :focus-visible {
          outline: 2px solid #ec4899;
          outline-offset: 2px;
        }

        .login-input:focus-visible { outline: none; }
      `}</style>

      <div className="login-bg">
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
        <div className="login-orb login-orb-3"></div>
        <div className="login-orb login-orb-4"></div>
        <div className="login-orb login-orb-5"></div>
      </div>
      <div className="login-noise"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className={`w-full max-w-[440px] login-fade-up ${loaded ? '' : 'opacity-0'}`}>
          <div className="login-glass">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8" style={{ animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}>
              <div className="login-logo-icon">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="login-logo-text">RiskTracker</span>
            </div>

            {/* Heading */}
            <div className="text-center mb-2" style={{ animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' }}>
              <h1 className="text-[1.7rem] font-bold tracking-tight" style={{ color: '#1e1b2e' }}>{t.auth.signIn}</h1>
            </div>
            <p className="text-center text-sm mb-9" style={{ color: '#6b7280', animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
              {t.auth.demoAccounts}
            </p>

            {/* Language Toggle */}
            <div className="absolute top-4 right-4">
              <LanguageToggle />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Email */}
              <div className="mb-5" style={{ animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both' }}>
                <label className="block text-xs font-semibold mb-2 tracking-wide" style={{ color: '#6b7280' }}>
                  {t.auth.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors duration-300" style={{ color: errors.email ? '#ef4444' : '#9ca3af' }} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder={t.auth.emailPlaceholder}
                    disabled={isLoading}
                    className={`login-input ${errors.email ? 'login-input-error' : ''}`}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email',
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1.5 mt-2 text-xs font-medium" style={{ color: '#ef4444' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="mb-5" style={{ animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both' }}>
                <label className="block text-xs font-semibold mb-2 tracking-wide" style={{ color: '#6b7280' }}>
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors duration-300" style={{ color: errors.password ? '#ef4444' : '#9ca3af' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={`login-input pr-12 ${errors.password ? 'login-input-error' : ''}`}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200 hover:bg-pink-50"
                    style={{ color: '#9ca3af' }}
                    aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1.5 mt-2 text-xs font-medium" style={{ color: '#ef4444' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between mb-7" style={{ animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-250 bg-white/50 peer-checked:bg-gradient-to-br peer-checked:from-[#ec4899] peer-checked:to-[#f472b6] peer-checked:border-[#ec4899] peer-checked:shadow-[0_2px_8px_rgba(236,72,153,0.3)]" style={{ borderColor: 'rgba(236,72,153,0.25)' }}>
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-250" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                  <span className="text-[0.85rem] select-none" style={{ color: '#6b7280' }}>
                    {t.auth.showPassword === 'Show password' ? 'Remember me' : 'Запомнить меня'}
                  </span>
                </label>
                <a href="#" className="text-[0.85rem] font-semibold transition-colors duration-200 hover:text-[#db2777]" style={{ color: '#ec4899', textDecoration: 'none' }}>
                  {t.auth.forgotPassword}
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="login-btn"
                style={{ animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both, loginBtnGradient 4s ease infinite' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.auth.signingIn}
                  </span>
                ) : (
                  <span className="relative z-10">{t.auth.signIn}</span>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-7 p-3.5 rounded-xl" style={{ background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.08)', animation: 'loginFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.7s both' }}>
              <p className="text-xs font-medium mb-2" style={{ color: '#9ca3af' }}>{t.auth.demoAccounts}</p>
              <div className="space-y-1.5">
                <code className="block text-xs px-2.5 py-1.5 rounded-lg" style={{ color: '#ec4899', background: 'rgba(236,72,153,0.06)' }}>
                  admin@risktracker.com / admin123
                </code>
                <code className="block text-xs px-2.5 py-1.5 rounded-lg" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.06)' }}>
                  user@test.com / user123
                </code>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
