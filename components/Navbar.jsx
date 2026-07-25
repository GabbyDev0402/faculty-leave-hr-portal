'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  ChevronDown, 
  Bell, 
  LogOut,
  LogIn,
  Sparkles,
  User,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Auth state
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // 1. Monitor Supabase Auth Session & Profile
  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, department')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.warn("Notice fetching navbar profile:", err);
    }
  };

  // 2. Handle Sign Out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setSession(null);
      setUserProfile(null);
      router.push('/login');
    }
  };

  // Determine role styling for user badge
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'substitute':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'teacher':
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  EduFlex <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">SaaS</span>
                </span>
                <span className="text-xs text-slate-500 block font-medium">Faculty Leave & Substitute Portal</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            <Link
              href="/teacher"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname?.startsWith('/teacher')
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>Teacher Dashboard</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname?.startsWith('/admin')
                  ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-500" />
              <span>Admin Approvals</span>
            </Link>

            <Link
              href="/substitute"
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                pathname?.startsWith('/substitute')
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Substitute Board</span>
            </Link>
          </nav>

          {/* Right Action Items: Auth State & Sign Out */}
          <div className="flex items-center space-x-3">
            
            {/* Authenticated User Profile Chip */}
            {session && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                  {userProfile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-900 truncate max-w-[120px]">
                    {userProfile?.full_name || session.user.email?.split('@')[0]}
                  </span>
                  {userProfile?.role && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getRoleBadgeStyle(userProfile.role)}`}>
                      {userProfile.role}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Conditional Sign In / Sign Out Button */}
            {session ? (
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Sign Out of Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
