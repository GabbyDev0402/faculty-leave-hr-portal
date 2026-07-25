'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ClientLayoutWrapper({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <main className="w-full min-h-screen flex flex-col m-0 p-0">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Washington School Inc." className="w-5 h-5 object-contain" />
            <span className="font-semibold text-slate-700">Washington School Inc.</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="text-slate-400 font-medium text-[11px]">
            Faculty Leave & Substitute Management System
          </div>
        </div>
      </footer>
    </>
  );
}
