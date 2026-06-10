import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Familien-WM-Tippspiel 2026",
  description: "Privates Tippspiel fuer die Fußball-WM 2026",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WM-Tipp"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
