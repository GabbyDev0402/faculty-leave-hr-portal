import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";

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
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans m-0 p-0">
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
