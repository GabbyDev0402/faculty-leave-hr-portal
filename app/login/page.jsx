"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Shield, 
  AlertCircle,
  CheckCircle2, 
  User,
  Loader2,
  UserCheck,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Form input state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('teacher'); // 'teacher' | 'substitute'
  
  // UX State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Handle Sign In & 3-Way Role-Based Routing
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      if (!data?.user) {
        throw new Error("Invalid login credentials. User session could not be verified.");
      }

      // Query profiles table for user's assigned system role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.warn("Notice: Profile role lookup error, defaulting to teacher route:", profileError.message);
      }

      const role = profile?.role || 'teacher';

      // 3-Way Role-Based Navigation
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'substitute') {
        router.push('/substitute');
      } else {
        router.push('/teacher');
      }

    } catch (err) {
      console.error("Sign in error:", err);
      setErrorMsg(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Registration with Selected Account Type (Teacher / Substitute)
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Pass full_name and selected role in user metadata for trigger `handle_new_user()`
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: selectedRole,
          },
        },
      });

      if (authError) throw authError;

      if (data?.session) {
        setSuccessMsg(`Account registered successfully! Redirecting to ${selectedRole === 'substitute' ? 'Substitute' : 'Teacher'} portal...`);
        setTimeout(() => {
          if (selectedRole === 'substitute') router.push('/substitute');
          else router.push('/teacher');
        }, 1200);
      } else {
        setSuccessMsg("Registration successful! If email confirmation is enabled, please check your inbox to verify your account.");
      }

    } catch (err) {
      console.error("Registration error:", err);
      setErrorMsg(err.message || 'Registration failed. Please verify details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      {/* Auth Card Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Card Header */}
        <div className="bg-slate-900 text-white p-8 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white p-1.5 mx-auto flex items-center justify-center mb-4 shadow-lg">
            <img src="/logo.png" alt="Washington School Inc." className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Washington School Inc.</h1>
          <p className="text-xs text-slate-400 mt-1">Faculty & Staff HR Authorization Portal</p>

          {/* Smooth Tab Switcher */}
          <div className="mt-6 inline-flex p-1 rounded-xl bg-slate-800 border border-slate-700/80 w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-8 space-y-5">

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Success Alert Box */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5 text-emerald-800 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* Sign In / Registration Form */}
          <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            
            {/* Full Name Field (Registration Only) */}
            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Prof. Sarah Jenkins"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                School or Official Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@washingtonschool.edu"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                {activeTab === 'login' && (
                  <a href="#" className="text-[11px] font-semibold text-indigo-600 hover:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              {activeTab === 'register' && (
                <p className="text-[10px] text-slate-400 mt-1">Must be at least 6 characters</p>
              )}
            </div>

            {/* Account Type Select Field (Registration Only) */}
            {activeTab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                >
                  <option value="teacher">Internal Teacher</option>
                  <option value="substitute">External Substitute</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : null}
              <span>
                {isSubmitting 
                  ? (activeTab === 'login' ? 'Signing in...' : 'Registering Account...') 
                  : (activeTab === 'login' ? 'Sign In to Portal' : 'Register Account')}
              </span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

        </div>

        {/* Clean Security Badge Footer */}
        <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            Official HR System
          </span>
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active SSL Encryption
          </span>
        </div>

      </div>
    </div>
  );
}
