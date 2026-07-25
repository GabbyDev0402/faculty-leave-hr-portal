import Link from 'next/link';
import { 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-10 py-4">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white border border-white/20 text-xs font-semibold backdrop-blur-md">
            <img src="/logo.png" alt="Washington School Inc." className="w-4 h-4 object-contain" />
            <span>Washington School Inc. • Official HR Portal</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Faculty Leave & <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-amber-300">
              Substitute Management
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Streamline faculty absence requests, automate substitute class coverage schedules, manage administrative approval workflows, and access secure sub lesson plans for Washington School Inc.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/teacher"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30"
            >
              <span>Teacher Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all"
            >
              <span>Sign In / Register</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role Launcher Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Faculty & Staff Portals</h2>
            <p className="text-xs text-slate-500">Access authorized HR dashboards for Washington School Inc.</p>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-full">
            Role-Based Portals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Teacher Tile */}
          <Link 
            href="/teacher" 
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="inline-block text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mb-2">
                Internal Faculty
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                Teacher Dashboard
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                View accrued leave balances, submit absence requests, upload sub lesson plans, and claim peer coverage.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span>Enter Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin Tile */}
          <Link 
            href="/admin" 
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-purple-200 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="inline-block text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full mb-2">
                Administration & HR
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">
                Admin Approvals
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Review pending leave requests, record administrative denial remarks, and monitor substitute coverage logs.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
              <span>Enter Approvals</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Substitute Tile */}
          <Link 
            href="/substitute" 
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Clock className="w-6 h-6" />
              </div>
              <div className="inline-block text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-2">
                External Substitutes
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                Substitute Job Board
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Browse open class coverage slots, view 60-second secure lesson plans, and claim substitute assignments.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>Enter Job Board</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
