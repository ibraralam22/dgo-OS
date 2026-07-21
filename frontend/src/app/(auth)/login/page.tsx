'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@store/auth-store';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@services/auth-api';
import { toast } from '@utils/toast';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedPassword = localStorage.getItem('remembered_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      
      // Save or clear credentials based on checkbox state
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
        localStorage.setItem('remembered_password', password);
      } else {
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_password');
      }

      login(response.user, response.accessToken, response.organizations);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch {
      // Error toast is handled by client interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info('Google SSO is not configured for this tenant. Please sign in using your credentials.');
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info('Please contact your workspace administrator to reset your password.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#08090a] p-4 sm:p-6 md:p-8 font-sans text-white">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Side: Brand Showcase Card */}
        <div className="bg-[#0c0d10] border border-white/5 rounded-2xl p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden min-h-[350px] md:min-h-[480px]">
          {/* Top Logo and Name */}
          <div className="flex items-center gap-3 z-10">
            <div className="h-8 w-24 flex items-center select-none pointer-events-none">
              <img 
                src="/white.png" 
                alt="DGO Logo" 
                className="max-h-full max-w-full object-contain filter brightness-110" 
              />
            </div>
            <span className="text-white/20 font-light text-sm">|</span>
            <span className="text-gray-400 font-medium text-sm tracking-wide">Decent Global Outsourcing</span>
          </div>

          {/* Middle Text Content */}
          <div className="my-auto py-8 z-10 max-w-md">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#00d8f6] mb-4 block">
              Outsourcing Excellence
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-5 leading-tight">
              Deliver smarter operations with a trusted global partner
            </h1>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Scalable outsourcing solutions for customer support, back-office operations,
              and business growth across global markets.
            </p>
          </div>

          {/* Bottom Metrics */}
          {/* <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5 z-10">
            <div>
              <div className="text-xl sm:text-2xl font-semibold text-white">500+</div>
              <div className="text-[10px] text-gray-500 font-light mt-0.5">Specialists</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-semibold text-white">24/7</div>
              <div className="text-[10px] text-gray-500 font-light mt-0.5">Coverage</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-semibold text-white">30+</div>
              <div className="text-[10px] text-gray-500 font-light mt-0.5">Markets</div>
            </div>
          </div> */}

          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#00d8f6]/5 rounded-full blur-[100px] pointer-events-none" />
        </div>

        {/* Right Side: Sign In Form */}
        <div className="flex flex-col justify-center px-4 sm:px-12 md:px-16 py-8">
          <div className="w-full max-w-sm mx-auto">
            
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-medium tracking-tight text-white mb-2">Sign in</h2>
              <p className="text-sm text-gray-500 font-light">
                Welcome back. Enter your credentials to continue.
              </p>
            </div>

            

            {/* Separator */}
            <div className="flex items-center my-6 select-none">
              <div className="flex-1 border-t border-white/5" />
              {/* <span className="px-3 text-xs text-gray-600 font-light"></span> */}
              <div className="flex-1 border-t border-white/5" />
            </div>

            {/* Main Email/Password Form */}
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              
              <div className="flex flex-col">
                <label className="text-[13px] font-normal text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#0c0d10] border border-white/10 hover:border-white/20 focus:border-[#00d8f6] rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#00d8f6]/30 text-white placeholder:text-gray-700 text-sm font-light transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[13px] font-normal text-gray-400">Password</label>
                  <a
                    href="#"
                    onClick={handleForgotPassword}
                    className="text-[12px] text-gray-500 hover:text-[#00d8f6] transition-colors"
                  >
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0c0d10] border border-white/10 hover:border-white/20 focus:border-[#00d8f6] rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-[#00d8f6]/30 text-white placeholder:text-gray-700 text-sm font-light transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2.5 pl-0.5 select-none mt-1">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 text-[#00d8f6] bg-[#0c0d10] focus:ring-0 cursor-pointer checked:bg-[#00d8f6] checked:border-[#00d8f6]"
                  disabled={loading}
                />
                <label htmlFor="remember-me" className="text-xs text-gray-400 cursor-pointer font-light hover:text-gray-300 transition-colors">
                  Remember me
                </label>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-[#00d8f6] hover:bg-[#00c3db] active:scale-[0.98] text-black font-semibold rounded-lg transition-all shadow-lg shadow-[#00d8f6]/10 flex items-center justify-center gap-2 mt-4 text-sm tracking-wide"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
