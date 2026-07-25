import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Washington School Inc. - Faculty Leave & Substitute Management",
  description: "Official Faculty Leave & Substitute Management Portal for Washington School Inc.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
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
      </body>
    </html>
  );
}
